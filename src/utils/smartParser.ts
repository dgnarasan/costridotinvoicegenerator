import { LineItem, InvoiceType, ExtraCharge } from '@/types/invoice';

export interface ParsedInvoiceInput {
  billTo?: string;
  lineItems: LineItem[];
  depositReceived?: number;
  cautionFee?: number;
  handlingFee?: number;
  logisticsFee?: number;
  serviceCharge?: number;
  taxRate?: number;
  discountPercent?: number;
  menuDescription?: string;
  extraCharges?: ExtraCharge[];
  invoiceType?: InvoiceType;
  date?: string;
  paymentTerms?: string;
  notesText?: string;
}

// Parse a money-like token into a number. Handles "30k", "1.5m", "30,000", "₦30000", "#30000", "30000.50"
export const parseMoney = (raw: string): number => {
  if (!raw) return 0;
  let s = raw.trim().toLowerCase().replace(/[₦$€£#,\s]/g, '');
  s = s.replace(/(?:naira|ngn|n)$/i, '');
  s = s.replace(/(?:each|per|\/\s*\w+).*$/i, '').trim();

  let mult = 1;
  if (/[km]$/.test(s)) {
    const suffix = s.slice(-1);
    if (suffix === 'k') mult = 1_000;
    else if (suffix === 'm') mult = 1_000_000;
    s = s.slice(0, -1);
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n * mult;
};

// A number token (with optional currency / k/m suffix / commas / decimals)
const NUM = String.raw`(?:[₦n#]|ngn)?\s*\d{1,3}(?:[,\d]*\d)?(?:\.\d+)?\s*[km]?`;

// Common catering & fashion item units
const UNIT_WORDS = String.raw`pcs?|pieces?|units?|sets?|items?|plates?|packs?|cartons?|crates?|bowls?|coolers?|trays?|servings?|portions?|yards?|pairs?|guests?|persons?|people|bottles?|cans?`;
const GENERIC_UNIT = new RegExp(String.raw`^(?:${UNIT_WORDS})$`, 'i');

// Words between the quantity and the price, e.g. "choir robes", "plates of jollof rice"
const MID = String.raw`([^\d\n]{0,60}?)`;
// A quantity: whole number that is NOT itself a price ("30k") or a percentage
const QTY = String.raw`\b(\d+)(?![\d.,]*\s*[km]\b)(?![\d.,]*\s*%)`;
const EACH = String.raw`(?:\s*(?:each|per\s*\w+|\/\s*\w+|a\s+piece|apiece))?`;

// "100 plates jollof rice for 300k total", "50 packs = 250,000 altogether"
const QTY_TOTAL_RATE = new RegExp(
  String.raw`${QTY}\s*${MID}\s*(?:for|at|=|costing|:)?\s*(${NUM})\s*(?:total|altogether|all\s*together|in\s+total)\b`,
  'i'
);
// "40pcs x 30k", "40 x 30,000", "100 plates @ 5000", "2 * 1.5m", "40 × 30k"
const QTY_OP_RATE = new RegExp(
  String.raw`${QTY}\s*${MID}\s*[x@*×]\s*(${NUM})${EACH}`,
  'i'
);
// "40 choir robes at 30k each", "200 plates of rice for 5,000 each", "40 at 30k"
const QTY_AT_RATE = new RegExp(
  String.raw`${QTY}\s*${MID}\s*\b(?:at|for|=)\s*(${NUM})${EACH}`,
  'i'
);
// "30k each for 40 robes", "5,000 per plate x 100"
const RATE_QTY = new RegExp(
  String.raw`(${NUM})\s*(?:each|per\s*\w*|/\s*\w+)\s*(?:for|x|\*|,)?\s*(\d+)\s*([^\d\n]{0,40})`,
  'i'
);
// Bare "40 robes 30k" or "100 jollof 5000" — qty words rate (fallback)
const QTY_WORDS_RATE = new RegExp(
  String.raw`${QTY}\s+([^\d\n]{0,60}?)\s+(${NUM})\b`,
  'i'
);
// Lump-sum service with no quantity: "DJ services 150k", "Hall setup - 200,000"
const LUMP_SUM = new RegExp(String.raw`^(.+?)\s*[:\-–=]?\s*(${NUM})${EACH}\s*\.?$`, 'i');

const isMoneyToken = (s: string): boolean => /[km]$/i.test(s.trim()) || /[,.]/.test(s) || parseFloat(s.replace(/[^\d.]/g, '')) >= 100;

interface QtyRateHit {
  qty: number;
  rate: number;
  mid: string;    // words between qty and price (usually the item name)
  before: string; // text before the match
  after: string;  // text after the match
}

const hitFrom = (line: string, m: RegExpMatchArray, qty: number, rate: number, mid: string): QtyRateHit => ({
  qty: qty || 1,
  rate,
  mid: mid || '',
  before: line.slice(0, m.index).trim(),
  after: line.slice((m.index || 0) + m[0].length).trim(),
});

const findQtyRate = (line: string): QtyRateHit | null => {
  // 1) Explicit total for many: "100 plates 300k total" -> unit rate 3,000
  let m = line.match(QTY_TOTAL_RATE);
  if (m) {
    const qty = parseInt(m[1], 10) || 1;
    const total = parseMoney(m[3]);
    return hitFrom(line, m, qty, qty > 0 ? Math.round(total / qty) : total, m[2]);
  }
  // 2) "40 robes x 30k"
  m = line.match(QTY_OP_RATE);
  if (m) return hitFrom(line, m, parseInt(m[1], 10), parseMoney(m[3]), m[2]);
  // 3) "40 choir robes at 30k each"
  m = line.match(QTY_AT_RATE);
  if (m) return hitFrom(line, m, parseInt(m[1], 10), parseMoney(m[3]), m[2]);
  // 4) "30k each for 40 robes"
  m = line.match(RATE_QTY);
  if (m && isMoneyToken(m[1])) return hitFrom(line, m, parseInt(m[2], 10), parseMoney(m[1]), m[3]);
  // 5) loose "40 robes 30k"
  m = line.match(QTY_WORDS_RATE);
  if (m && isMoneyToken(m[3])) return hitFrom(line, m, parseInt(m[1], 10), parseMoney(m[3]), m[2]);
  // 6) lump sum "DJ services 150k"
  m = line.match(LUMP_SUM);
  if (m && isMoneyToken(m[2])) {
    const desc = m[1].trim();
    if (!/^(total|subtotal|balance|deposit|caution|handling|logistics|delivery|tax|vat|discount)\b/i.test(desc)) {
      return { qty: 1, rate: parseMoney(m[2]), mid: '', before: desc, after: '' };
    }
  }
  return null;
};

const cleanDesc = (s: string): string =>
  s
    .replace(/^[-–•*:\s\d.)]+/, '') // Strip leading dashes, bullets, numbers e.g. "1.", "-", "•"
    .replace(/^(?:also|and|plus|then|another|additional(?:ly)?|with)\b[\s,]*/i, '') // leading filler words
    .replace(/[\s,]*\b(?:at|for|of|each|costing|is|are|=|@|x)\s*$/i, '') // dangling connectors
    .replace(/[-–•*:,.\s]+$/, '')
    .trim();

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// "First Baptist Church needs choir robes" -> customer + item
const PRONOUN = /^(?:i|we|they|he|she|you|my\s+\w+|our\s+\w+|the\s+client|client|customer)$/i;
const NEEDS_SPLIT = /^(.*?)\s+(?:needs?|wants?|would\s+like|ordered|orders?|requested|is\s+requesting|requires?)\s+(.*)$/i;


const WHATSAPP_SENDER = /^\[?\d{1,2}[:.]\d{2}[^\]]*\]\s*(?:-\s*)?([^:]{2,40}):/;

const cleanWhatsAppLine = (s: string): string =>
  s
    .replace(/^\[?\d{1,2}[:.]\d{2}(?:[:.]\d{2})?\s*(?:am|pm)?\]?\s*(?:-\s*)?[^:]*:\s*/i, '') // strip [14:22, 16/10] John:
    .replace(/^[-–•*:\s]+/, '')
    .trim();

const looksLikeCustomerLine = (s: string): boolean => {
  if (!/[a-z]/i.test(s)) return false;
  if (findQtyRate(s)) return false;
  if (/^(plus\s+)?vat\b/i.test(s)) return false;
  if (/^(total|subtotal|deposit|paid|balance|caution|handling|logistics|delivery|service|tax|vat|fee|date|invoice|inv\s*#|terms?|note|notes|menu)\b/i.test(s)) return false;
  return true;
};

const CUSTOMER_LABEL = /^\s*(?:bill\s*to|customer|client|for|to|church|event\s*name)\s*[:\-]\s*(.+)$/i;
const DATE_LABEL = /^\s*date\s*[:\-]\s*(.+)$/i;
const DEPOSIT_LABEL = /\b(?:deposit|paid|received|advance|down\s*payment|part\s*payment)\b[^0-9]*([₦n#]?\s*[\d.,]+\s*[km]?)/i;
const CAUTION_LABEL = /\bcaution(?:\s*fee)?\b[^0-9]*([₦n#]?\s*[\d.,]+\s*[km]?)/i;
const HANDLING_LABEL = /\bhandling(?:\s*fee)?\b[^0-9]*([₦n#]?\s*[\d.,]+\s*[km]?)/i;
const LOGISTICS_LABEL = /\b(?:logistics|delivery|transport|dispatch|waybill|shipping)(?:\s*fee)?\b[^0-9]*([₦n#]?\s*[\d.,]+\s*[km]?)/i;
const SERVICE_CHARGE_LABEL = /\b(?:service\s*charge|service\s*fee|service)\b[^0-9]*([\d.]+)\s*%/i;
const DISCOUNT_LABEL = /\b(?:discount|off)\b[^0-9]*([\d.]+)\s*%/i;
// Any other named fee: "Express fee 1m", "Rush charge: 50k", "Setup fee - 20,000"
const EXTRA_CHARGE = new RegExp(String.raw`^(.{2,40}?\b(?:fees?|charges?|surcharges?|levy|levies|costs?))\s*[:\-–=]?\s*(${NUM})\s*\.?$`, 'i');
const MENU_LABEL = /^\s*(?:menu|food|menu\s*list|food\s*list|dishes|package\s*items|included\s*items|package)\s*[:\-]\s*(.+)$/i;

const parseDateLoose = (s: string): string | undefined => {
  const t = s.trim();
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
};

export const parseSmartInput = (text: string): ParsedInvoiceInput => {
  // WhatsApp exports: "[14:22, 16/10/2026] Mrs Bello: message" — remember who sent it
  const senderCounts = new Map<string, number>();
  const rawLines = text
    .split('\n')
    .map(l => {
      const sm = l.trim().match(WHATSAPP_SENDER);
      if (sm) {
        const name = sm[1].trim();
        senderCounts.set(name, (senderCounts.get(name) || 0) + 1);
      }
      return cleanWhatsAppLine(l.trim());
    })
    .filter(Boolean);

  const result: ParsedInvoiceInput = { lineItems: [] };
  if (rawLines.length === 0) return result;

  // Invoice type detection
  if (/\b(rental|rent|hire|hiring)\b/i.test(text)) {
    result.invoiceType = 'rental';
  } else if (/\b(catering|production|bespoke|sewing|order)\b/i.test(text)) {
    result.invoiceType = 'production';
  }

  // VAT detection across whole text
  if (/\b(?:no\s*vat|0%\s*vat|without\s*vat|vat\s*exempt)\b/i.test(text)) {
    result.taxRate = 0;
  } else {
    const vatPercentMatch = text.match(/\b(?:vat|tax)\b[^0-9\n]*([\d.]+)\s*%/i);
    if (vatPercentMatch) {
      result.taxRate = parseFloat(vatPercentMatch[1]) || 0;
    } else if (/\b(?:plus\s+vat|with\s+vat|add\s+vat|include\s+vat)\b/i.test(text)) {
      result.taxRate = 7.5;
    }
  }

  // First pass: extract labeled fields and filter them out
  const lines: string[] = [];
  for (const line of rawLines) {
    let consumed = false;

    // Customer
    const cust = line.match(CUSTOMER_LABEL);
    if (cust && !result.billTo) {
      result.billTo = cust[1].trim();
      consumed = true;
    }

    // Date
    const dm = line.match(DATE_LABEL);
    if (dm) {
      const d = parseDateLoose(dm[1]);
      if (d) {
        result.date = d;
        consumed = true;
      }
    }

    // Deposit
    const dep = line.match(DEPOSIT_LABEL);
    if (dep) {
      result.depositReceived = parseMoney(dep[1]);
      consumed = true;
    }

    // Caution
    const cau = line.match(CAUTION_LABEL);
    if (cau) {
      result.cautionFee = parseMoney(cau[1]);
      consumed = true;
    }

    // Handling
    const han = line.match(HANDLING_LABEL);
    if (han) {
      result.handlingFee = parseMoney(han[1]);
      consumed = true;
    }

    // Logistics
    const log = line.match(LOGISTICS_LABEL);
    if (log) {
      result.logisticsFee = parseMoney(log[1]);
      consumed = true;
    }

    // Service charge %
    const sc = line.match(SERVICE_CHARGE_LABEL);
    if (sc) {
      result.serviceCharge = parseFloat(sc[1]) || 0;
      consumed = true;
    }

    // Discount %
    const disc = line.match(DISCOUNT_LABEL);
    if (disc) {
      result.discountPercent = parseFloat(disc[1]) || 0;
      consumed = true;
    }

    // Menu description
    const menu = line.match(MENU_LABEL);
    if (menu) {
      result.menuDescription = menu[1].trim();
      consumed = true;
    }

    // Other named fees that have no dedicated slot -> custom charge rows
    if (!consumed) {
      const ex = line.match(EXTRA_CHARGE);
      if (ex && !/service/i.test(ex[1])) {
        const amount = parseMoney(ex[2]);
        if (amount > 0) {
          const label = cleanDesc(ex[1]).replace(/\b\w/g, c => c.toUpperCase());
          (result.extraCharges ||= []).push({ id: crypto.randomUUID(), label, amount });
          consumed = true;
        }
      }
    }

    // Ignore generic totals & headers
    if (/^(plus\s+)?vat\b/i.test(line)) consumed = true;
    if (/^(grand\s+)?total\b/i.test(line)) consumed = true;
    if (/^subtotal\b/i.test(line)) consumed = true;
    if (/^balance\b/i.test(line)) consumed = true;
    if (/^terms?\b/i.test(line) || /^notes?\b/i.test(line)) consumed = true;

    if (!consumed) lines.push(line);
  }

  // Second pass: line items and customer fallback
  let pendingDesc = '';
  const pushItem = (description: string, quantity: number, rate: number) => {
    result.lineItems.push({
      id: crypto.randomUUID(),
      description: capitalize(cleanDesc(description)) || 'Item',
      quantity,
      rate,
    });
  };

  for (const line of lines) {
    const hit = findQtyRate(line);
    if (hit) {
      let before = cleanDesc(hit.before);
      // "First Baptist Church needs 40 robes…" -> customer = First Baptist Church
      const split = before.match(NEEDS_SPLIT) || `${before} `.match(/^(.*?)\s+(?:needs?|wants?|ordered|requires?)\s*$/i);
      if (split) {
        const who = cleanDesc(split[1]);
        if (!result.billTo && who && !PRONOUN.test(who)) result.billTo = who;
        before = cleanDesc(split[2] || '');
      }
      const mid = cleanDesc(hit.mid);
      const midIsName = mid && !GENERIC_UNIT.test(mid);
      const desc =
        (midIsName ? [before, mid].filter(Boolean).join(' ') : before) ||
        pendingDesc ||
        cleanDesc(hit.after) ||
        mid; // e.g. just "plates" — better than nothing
      pushItem(desc, hit.qty, hit.rate);
      pendingDesc = '';
      continue;
    }

    // Not a line item — could be customer or pending description
    if (!result.billTo && looksLikeCustomerLine(line)) {
      result.billTo = cleanDesc(line);
      continue;
    }

    // Save as a pending description for the next qty/rate line
    pendingDesc = pendingDesc ? `${pendingDesc} ${line}` : line;
  }

  // Fall back to the WhatsApp sender as the customer
  if (!result.billTo && senderCounts.size > 0) {
    result.billTo = [...senderCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }

  // Trailing pending description with no rate — only push if we have no items yet
  if (pendingDesc && result.lineItems.length === 0) {
    pushItem(pendingDesc, 1, 0);
  }

  return result;
};