import { ParsedInvoiceInput } from './smartParser';
import { BusinessId, getBusiness } from '@/config/businesses';

export const getStoredGeminiApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  const stored = localStorage.getItem('gemini_api_key');
  if (stored && stored.trim()) return stored.trim();
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
  return '';
};

export const setStoredGeminiApiKey = (key: string): void => {
  if (typeof window === 'undefined') return;
  if (key && key.trim()) {
    localStorage.setItem('gemini_api_key', key.trim());
  } else {
    localStorage.removeItem('gemini_api_key');
  }
};

export const parseWithGemini = async (
  text: string,
  businessId: BusinessId = 'costridot',
  apiKeyOverride?: string
): Promise<ParsedInvoiceInput> => {
  const apiKey = (apiKeyOverride || getStoredGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  const business = getBusiness(businessId);

  const prompt = `You are an expert invoice data extractor for a Nigerian business: "${business.name}" (${business.tagline}).
The user will provide rough notes, a customer message, an email, or a WhatsApp chat log.

Your job is to accurately extract all invoice details into a structured JSON object.

Output Schema:
{
  "billTo": "string (customer name, church name, event name, or client name)",
  "date": "string (YYYY-MM-DD if mentioned, otherwise omit)",
  "invoiceType": "production" | "rental" (detect if this is equipment rental/hire or custom production/catering/tailoring),
  "lineItems": [
    {
      "description": "string (clear name of item or service)",
      "quantity": 1,
      "rate": 0 (UNIT price in Nigerian Naira NGN. If a TOTAL price was given for a quantity > 1, divide total by quantity to get the single unit rate!)
    }
  ],
  "depositReceived": 0 (amount already paid or deposited in NGN),
  "logisticsFee": 0 (delivery fee, transport, dispatch, waybill in NGN),
  "serviceCharge": 0 (service charge percentage, e.g. 10 for 10%),
  "taxRate": 7.5 (VAT percentage: set to 0 if text mentions 'no vat' or 'exempt', 7.5 if VAT is requested),
  "discountPercent": 0 (discount percentage, e.g. 5 for 5%),
  "cautionFee": 0 (caution or refundable damage deposit in NGN),
  "handlingFee": 0 (handling fee in NGN),
  "menuDescription": "string (if food dishes or garment pieces are listed as a package breakdown separate from billed items, provide a comma-separated list e.g. 'Jollof Rice, Fried Rice, Grilled Chicken, Coleslaw, Chapman')",
  "paymentTerms": "string (optional specific payment terms if stated)",
  "notesText": "string (optional rental notes or special delivery instructions)"
}

Parsing Rules:
1. Understand Nigerian number conventions:
   - "30k" = 30000
   - "1.5m" = 1500000
   - "#50,000" or "N50,000" or "₦50k" = 50000
2. If given a TOTAL amount for multiple items (e.g. "100 plates jollof rice for 300k total" or "40 robes = 1,200,000"), divide total by quantity to find unit rate (300k / 100 = 3000).
3. If an item or service has no explicit quantity (e.g. "DJ & sound setup 150k" or "Hall draping 300,000"), set quantity = 1 and rate = 150000.
4. Clean messy WhatsApp messages: ignore timestamps (e.g. [14:22, 16/10/2026]), sender headers, and voice note markers.
5. If dishes or items are listed as a package (especially for Foodwebb Catering), extract them into menuDescription.
6. Only return valid JSON matching the schema without markdown codeblocks or explanation.`;

  const candidates = await getCandidateModels(apiKey);
  let bestError: Error | null = null; // most informative error (non-404)
  let notFoundError: Error | null = null;

  for (const model of candidates) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: `${prompt}\n\nUser input to parse:\n\"\"\"\n${text}\n\"\"\"` }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg: string = errorData?.error?.message || response.statusText;
        if (isKeyError(response.status, errMsg)) {
          throw new Error(`API_KEY_INVALID: ${errMsg}`);
        }
        if (response.status === 404) {
          notFoundError = new Error(`Gemini error (${model}): ${errMsg}`);
          continue; // model retired / unavailable — try next
        }
        if (response.status === 429) {
          throw new Error(`QUOTA: Gemini free-tier limit reached on ${model}. Wait a minute and try again, or use Quick Fill.`);
        }
        throw new Error(`Gemini error (${model}, ${response.status}): ${errMsg}`);
      }

      const data = await response.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response from AI model');
      }

      // Parse JSON (strip any accidental backticks if present)
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanJson) as ParsedInvoiceInput;

      // Ensure line items have valid IDs and numbers
      if (Array.isArray(parsed.lineItems)) {
        parsed.lineItems = parsed.lineItems
          .filter(item => item && (item.description || item.rate))
          .map(item => ({
            id: crypto.randomUUID(),
            description: item.description?.trim() || 'Item',
            quantity: Math.max(1, Number(item.quantity) || 1),
            rate: Math.max(0, Number(item.rate) || 0),
          }));
      } else {
        parsed.lineItems = [];
      }

      // Sanitize numeric fields
      if (parsed.depositReceived !== undefined) parsed.depositReceived = Number(parsed.depositReceived) || 0;
      if (parsed.logisticsFee !== undefined) parsed.logisticsFee = Number(parsed.logisticsFee) || 0;
      if (parsed.serviceCharge !== undefined) parsed.serviceCharge = Number(parsed.serviceCharge) || 0;
      if (parsed.taxRate !== undefined) parsed.taxRate = Number(parsed.taxRate) || 0;
      if (parsed.discountPercent !== undefined) parsed.discountPercent = Number(parsed.discountPercent) || 0;
      if (parsed.cautionFee !== undefined) parsed.cautionFee = Number(parsed.cautionFee) || 0;
      if (parsed.handlingFee !== undefined) parsed.handlingFee = Number(parsed.handlingFee) || 0;

      // Remember the model that worked so next time it's tried first
      try { localStorage.setItem(MODEL_CACHE_KEY, model); } catch { /* ignore */ }

      return parsed;
    } catch (err: any) {
      if (err.message?.startsWith('API_KEY_INVALID')) {
        throw err;
      }
      if (!bestError) bestError = err;
    }
  }

  throw bestError || notFoundError || new Error('No Gemini Flash model is available for this API key.');
};

const MODEL_CACHE_KEY = 'gemini_model';
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];

const isKeyError = (status: number, msg: string): boolean =>
  status === 401 ||
  status === 403 ||
  (status === 400 && /api[\s_-]?key/i.test(msg));

// Rank flash models: "-latest" alias first, then newest version, stable before preview, full before lite
const rankModel = (name: string): number => {
  let score = 0;
  if (/flash-latest$/.test(name)) score += 10_000;
  const v = name.match(/gemini-(\d+(?:\.\d+)?)/);
  if (v) score += parseFloat(v[1]) * 1_000;
  if (/preview|exp/.test(name)) score -= 300;
  if (/lite/.test(name)) score -= 200;
  return score;
};

// Ask Google which models this key can actually use, so retired model names never break the app
const getCandidateModels = async (apiKey: string): Promise<string[]> => {
  let cached: string | null = null;
  try { cached = localStorage.getItem(MODEL_CACHE_KEY); } catch { /* ignore */ }

  let discovered: string[] = [];
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`
    );
    if (res.ok) {
      const data = await res.json();
      discovered = (data?.models || [])
        .filter((m: any) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
        )
        .map((m: any) => String(m.name).replace(/^models\//, ''))
        .filter((n: string) => /flash/i.test(n) && !/image|tts|audio|live|embedding|thinking/i.test(n))
        .sort((a: string, b: string) => rankModel(b) - rankModel(a));
    } else {
      const errData = await res.json().catch(() => null);
      const msg = errData?.error?.message || res.statusText;
      if (isKeyError(res.status, msg)) throw new Error(`API_KEY_INVALID: ${msg}`);
    }
  } catch (err: any) {
    if (err.message?.startsWith('API_KEY_INVALID')) throw err;
    // network issue listing models — fall through to static list
  }

  const ordered = [
    ...(cached ? [cached] : []),
    ...(discovered.length ? discovered : FALLBACK_MODELS),
  ];
  return Array.from(new Set(ordered)).slice(0, 6);
};
