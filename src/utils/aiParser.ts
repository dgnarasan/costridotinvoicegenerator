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
  localStorage.removeItem(MODEL_CACHE_KEY); // new key may have access to different models
};

const API = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_CACHE_KEY = 'gemini_model';
const REQUEST_TIMEOUT_MS = 25_000;
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-flash-lite-latest'];

// Structured-output schema: the model is forced to return exactly this shape,
// which is faster and more reliable than describing JSON in the prompt.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    billTo: { type: 'STRING' },
    date: { type: 'STRING', description: 'YYYY-MM-DD, only if mentioned' },
    invoiceType: { type: 'STRING', enum: ['production', 'rental'] },
    lineItems: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          description: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          rate: { type: 'NUMBER', description: 'UNIT price in NGN' },
        },
        required: ['description', 'quantity', 'rate'],
      },
    },
    depositReceived: { type: 'NUMBER' },
    logisticsFee: { type: 'NUMBER' },
    serviceCharge: { type: 'NUMBER', description: 'percent' },
    taxRate: { type: 'NUMBER', description: 'VAT percent' },
    discountPercent: { type: 'NUMBER' },
    cautionFee: { type: 'NUMBER' },
    handlingFee: { type: 'NUMBER' },
    extraCharges: {
      type: 'ARRAY',
      description: 'Any other flat fee that does not fit the fields above, e.g. Express fee, Rush fee, Setup fee, Branding fee',
      items: {
        type: 'OBJECT',
        properties: {
          label: { type: 'STRING' },
          amount: { type: 'NUMBER' },
        },
        required: ['label', 'amount'],
      },
    },
    menuDescription: { type: 'STRING' },
    paymentTerms: { type: 'STRING' },
    notesText: { type: 'STRING' },
  },
  required: ['lineItems'],
};

const buildPrompt = (businessName: string, tagline: string) =>
  `Extract invoice data for "${businessName}" (${tagline}), a Nigerian business, from the user's notes or WhatsApp chat.
Rules:
- Money: 30k=30000, 1.5m=1500000, #/N/₦ = Naira.
- rate is the UNIT price. If a total is given for a quantity ("100 plates for 300k total"), rate = total/quantity.
- No quantity given => quantity 1.
- Delivery/transport/dispatch => logisticsFee. Service charge % => serviceCharge. "No VAT" => taxRate 0; "plus VAT" => 7.5.
- Any other flat fee/charge (express, rush, setup, branding, packaging, overtime, etc.) => extraCharges with a short Title Case label. Never put fees into lineItems.
- Dishes/garments listed as what's included in a package => menuDescription as a comma-separated list.
- Ignore WhatsApp timestamps and sender headers. Omit fields that aren't mentioned.`;

// Newer Gemini models "think" before answering by default — great for hard reasoning,
// but it adds many seconds for a simple extraction like this. Turn it off / to minimum.
// Options are tried in order; if a model rejects one, the next is used.
const thinkingOptionsFor = (model: string): (Record<string, unknown> | undefined)[] => {
  if (/gemini-2\.5/.test(model)) return [{ thinkingBudget: 0 }, undefined];
  if (/gemini-2\.0|gemini-1/.test(model)) return [undefined]; // these don't think
  return [{ thinkingLevel: 'minimal' }, { thinkingLevel: 'low' }, { thinkingBudget: 0 }, undefined];
};

const isKeyError = (status: number, msg: string): boolean =>
  status === 401 || status === 403 || (status === 400 && /api[\s_-]?key/i.test(msg));

const fetchWithTimeout = async (url: string, init: RequestInit = {}) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('TIMEOUT: Gemini took too long to respond. Try again or use Quick Fill.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

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

/** Ask Google which Flash models this key can use (only done when we don't have a cached working model). */
const discoverModels = async (apiKey: string): Promise<string[]> => {
  try {
    const res = await fetchWithTimeout(`${API}/models?pageSize=1000&key=${encodeURIComponent(apiKey)}`);
    if (res.ok) {
      const data = await res.json();
      const found: string[] = (data?.models || [])
        .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m: any) => String(m.name).replace(/^models\//, ''))
        .filter((n: string) => /flash/i.test(n) && !/image|tts|audio|live|embedding|thinking/i.test(n))
        .sort((a: string, b: string) => rankModel(b) - rankModel(a));
      if (found.length) return found.slice(0, 5);
    } else {
      const errData = await res.json().catch(() => null);
      const msg = errData?.error?.message || res.statusText;
      if (isKeyError(res.status, msg)) throw new Error(`API_KEY_INVALID: ${msg}`);
    }
  } catch (err: any) {
    if (err.message?.startsWith('API_KEY_INVALID')) throw err;
  }
  return FALLBACK_MODELS;
};

type Attempt = { ok: true; parsed: ParsedInvoiceInput } | { ok: false; status: number; error: Error };

const callModel = async (model: string, apiKey: string, prompt: string, text: string, optionIndex = 0): Promise<Attempt> => {
  const options = thinkingOptionsFor(model);
  const thinkingConfig = options[optionIndex];
  const res = await fetchWithTimeout(`${API}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
        maxOutputTokens: 2048,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    const msg: string = errData?.error?.message || res.statusText;
    if (isKeyError(res.status, msg)) throw new Error(`API_KEY_INVALID: ${msg}`);
    // This model doesn't accept that "think less" setting — try the next option
    if (res.status === 400 && thinkingConfig && /think/i.test(msg) && optionIndex + 1 < options.length) {
      return callModel(model, apiKey, prompt, text, optionIndex + 1);
    }
    if (res.status === 429) {
      return { ok: false, status: 429, error: new Error(`QUOTA: Gemini free-tier limit reached on ${model}. Wait a minute and try again, or use Quick Fill.`) };
    }
    return { ok: false, status: res.status, error: new Error(`Gemini error (${model}, ${res.status}): ${msg}`) };
  }

  const data = await res.json();
  const rawText: string | undefined = data?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p.text === 'string')?.text;
  if (!rawText) return { ok: false, status: 500, error: new Error('Empty response from AI model') };
  const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return { ok: true, parsed: sanitize(JSON.parse(cleanJson)) };
};

const num = (v: unknown): number | undefined => (v === undefined || v === null ? undefined : Number(v) || 0);

const sanitize = (raw: any): ParsedInvoiceInput => {
  const parsed: ParsedInvoiceInput = { ...raw };
  parsed.lineItems = Array.isArray(raw.lineItems)
    ? raw.lineItems
        .filter((item: any) => item && (item.description || item.rate))
        .map((item: any) => ({
          id: crypto.randomUUID(),
          description: String(item.description || 'Item').trim(),
          quantity: Math.max(1, Number(item.quantity) || 1),
          rate: Math.max(0, Number(item.rate) || 0),
        }))
    : [];
  parsed.extraCharges = Array.isArray(raw.extraCharges)
    ? raw.extraCharges
        .filter((c: any) => c && c.label && Number(c.amount) > 0)
        .map((c: any) => ({ id: crypto.randomUUID(), label: String(c.label).trim(), amount: Number(c.amount) }))
    : undefined;
  if (parsed.extraCharges && parsed.extraCharges.length === 0) delete parsed.extraCharges;
  parsed.depositReceived = num(raw.depositReceived);
  parsed.logisticsFee = num(raw.logisticsFee);
  parsed.serviceCharge = num(raw.serviceCharge);
  parsed.taxRate = num(raw.taxRate);
  parsed.discountPercent = num(raw.discountPercent);
  parsed.cautionFee = num(raw.cautionFee);
  parsed.handlingFee = num(raw.handlingFee);
  return parsed;
};

export const parseWithGemini = async (
  text: string,
  businessId: BusinessId = 'costridot',
  apiKeyOverride?: string
): Promise<ParsedInvoiceInput> => {
  const apiKey = (apiKeyOverride || getStoredGeminiApiKey()).trim();
  if (!apiKey) throw new Error('NO_API_KEY');

  const business = getBusiness(businessId);
  const prompt = buildPrompt(business.name, business.tagline);

  // Fast path: reuse the model that worked last time (one network request total)
  let cached: string | null = null;
  try { cached = localStorage.getItem(MODEL_CACHE_KEY); } catch { /* ignore */ }

  let bestError: Error | null = null;
  const tried = new Set<string>();

  const tryList = async (models: string[]): Promise<ParsedInvoiceInput | null> => {
    for (const model of models) {
      if (tried.has(model)) continue;
      tried.add(model);
      try {
        const result = await callModel(model, apiKey, prompt, text);
        if (result.ok) {
          try { localStorage.setItem(MODEL_CACHE_KEY, model); } catch { /* ignore */ }
          return result.parsed;
        }
        const fail = result as Extract<Attempt, { ok: false }>;
        if (fail.status !== 404 && !bestError) bestError = fail.error;
        if (fail.status === 429) return null; // quota is per-key; other models will likely fail too
      } catch (err: any) {
        if (err.message?.startsWith('API_KEY_INVALID')) throw err;
        if (!bestError) bestError = err;
        if (err.message?.startsWith('TIMEOUT')) return null;
      }
    }
    return null;
  };

  if (cached) {
    const hit = await tryList([cached]);
    if (hit) return hit;
    if (bestError && /QUOTA|TIMEOUT/.test((bestError as Error).message)) throw bestError;
    try { localStorage.removeItem(MODEL_CACHE_KEY); } catch { /* ignore */ }
  }

  const hit = await tryList(await discoverModels(apiKey));
  if (hit) return hit;

  throw bestError || new Error('No Gemini Flash model is available for this API key.');
};
