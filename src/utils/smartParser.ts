import { LineItem, InvoiceType } from '@/types/invoice';

export interface ParsedInvoiceInput {
  billTo?: string;
  lineItems: LineItem[];
  depositReceived?: number;
  cautionFee?: number;
  handlingFee?: number;
  invoiceType?: InvoiceType;
  date?: string;
}

// Parse a money-like token into a number. Handles "30k", "1.5m", "30,000", "₦30000", "30000.50"
const parseMoney = (raw: string): number => {
  let s = raw.trim().toLowerCase().replace(/[₦$€£,\s]/g, '');
  s = s.replace(/(?:naira|ngn|n)$/i, '');
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
const NUM = String.raw`(?:₦|n)?\s*\d{1,3}(?:[,\d]*\d)?(?:\.\d+)?\s*[km]?`;

// Quantity-then-rate patterns. Tries (in order):
//   "40pcs x 30k", "40 x 30,000", "10 @ 5000", "2 * 1.5m", "40 × 30k"
const QTY_OP_RATE = new RegExp(
  String.raw`(\d+)\s*(?:pcs?|pieces?|units?|sets?|robes?|items?)?\s*[x@*×]\s*(${NUM})`,
  'i'
);
// "40 robes at 30k", "40 pieces for 30,000 each", "40 at 30k", "40 @ 30k each"
const QTY_AT_RATE = new RegExp(
  String.raw`(\d+)\s*(?:pcs?|pieces?|units?|sets?|robes?|items?|of\s+\w+)?\s*(?:at|for|@|=)\s*(${NUM})\s*(?:each|per|\/\s*\w+)?`,
  'i'
);
// "30k each for 40 robes", "30,000 per piece x 40"
const RATE_QTY = new RegExp(
  String.raw`(${NUM})\s*(?:each|per\s*\w*|/\s*\w+)\s*(?:for|x|\*|,)?\s*(\d+)`,
  'i'
);
// Bare "40 robes 30k" or "40 30000" — qty word rate (looser fallback)
const QTY_WORDS_RATE = new RegExp(
  String.raw`\b(\d+)\b\s+([^\d\n]{0,40}?)\s+(${NUM})\b`,
  'i'
);

const isMoneyToken = (s: string): boolean => /[km]$/i.test(s) || /[,.]/.test(s) || parseFloat(s) >= 100;

const findQtyRate = (
  line: string
): { qty: number; rate: number; before: string; after: string; matchedText: string } | null => {
  // 1) qty OP rate
  let m = line.match(QTY_OP_RATE);
  if (m) {
    return {
      qty: parseInt(m[1], 10) || 1,
      rate: parseMoney(m[2]),
      before: line.slice(0, m.index).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }
  // 2) qty AT rate
  m = line.match(QTY_AT_RATE);
  if (m) {
    return {
      qty: parseInt(m[1], 10) || 1,
      rate: parseMoney(m[2]),
      before: line.slice(0, m.index).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }
  // 3) rate each for qty
  m = line.match(RATE_QTY);
  if (m && isMoneyToken(m[1])) {
    return {
      qty: parseInt(m[2], 10) || 1,
      rate: parseMoney(m[1]),
      before: line.slice(0, m.index).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }
  // 4) loose: qty <words> rate (only if the rate part looks like money)
  m = line.match(QTY_WORDS_RATE);
  if (m && isMoneyToken(m[3])) {
    return {
      qty: parseInt(m[1], 10) || 1,
      rate: parseMoney(m[3]),
      before: (line.slice(0, m.index).trim() + ' ' + (m[2] || '').trim()).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }
  return null;
};

const cleanDesc = (s: string): string =>
  s.replace(/^[-–•:*\s]+/, '').replace(/[-–•:*\s]+$/, '').trim();

const looksLikeCustomerLine = (s: string): boolean => {
  // No quantity/rate token, not a keyword line, has some letters
  if (!/[a-z]/i.test(s)) return false;
  if (findQtyRate(s)) return false;
  if (/^(plus\s+)?vat\b/i.test(s)) return false;
  if (/^(total|subtotal|deposit|paid|balance|caution|handling|fee|date|invoice|inv\s*#|terms?|note|notes)\b/i.test(s)) return false;
  return true;
};

const CUSTOMER_LABEL = /^\s*(?:bill\s*to|customer|client|for|to|church)\s*[:\-]\s*(.+)$/i;
const DATE_LABEL = /^\s*date\s*[:\-]\s*(.+)$/i;
const DEPOSIT_LABEL = /\b(?:deposit|paid|received|advance|down\s*payment|part\s*payment)\b[^0-9]*([₦n]?\s*[\d.,]+\s*[km]?)/i;
const CAUTION_LABEL = /\bcaution(?:\s*fee)?\b[^0-9]*([₦n]?\s*[\d.,]+\s*[km]?)/i;
const HANDLING_LABEL = /\bhandling(?:\s*fee)?\b[^0-9]*([₦n]?\s*[\d.,]+\s*[km]?)/i;

const parseDateLoose = (s: string): string | undefined => {
  const t = s.trim();
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
};

export const parseSmartInput = (text: string): ParsedInvoiceInput => {
  const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: ParsedInvoiceInput = { lineItems: [] };
  if (rawLines.length === 0) return result;

  // Invoice type detection from anywhere in text
  if (/\b(rental|rent|hire|hiring)\b/i.test(text)) result.invoiceType = 'rental';

  // First pass: extract labeled fields and filter them out
  const lines: string[] = [];
  for (const line of rawLines) {
    let consumed = false;

    const cust = line.match(CUSTOMER_LABEL);
    if (cust && !result.billTo) {
      result.billTo = cust[1].trim();
      consumed = true;
    }

    const dm = line.match(DATE_LABEL);
    if (dm) {
      const d = parseDateLoose(dm[1]);
      if (d) {
        result.date = d;
        consumed = true;
      }
    }

    const dep = line.match(DEPOSIT_LABEL);
    if (dep) {
      result.depositReceived = parseMoney(dep[1]);
      consumed = true;
    }
    const cau = line.match(CAUTION_LABEL);
    if (cau) {
      result.cautionFee = parseMoney(cau[1]);
      consumed = true;
    }
    const han = line.match(HANDLING_LABEL);
    if (han) {
      result.handlingFee = parseMoney(han[1]);
      consumed = true;
    }

    if (/^(plus\s+)?vat\b/i.test(line)) consumed = true;
    if (/^(grand\s+)?total\b/i.test(line)) consumed = true;
    if (/^subtotal\b/i.test(line)) consumed = true;
    if (/^balance\b/i.test(line)) consumed = true;
    if (/^terms?\b/i.test(line) || /^notes?\b/i.test(line)) consumed = true;

    if (!consumed) lines.push(line);
  }

  // Walk remaining lines and pick out line items + customer
  let pendingDesc = '';
  const pushItem = (description: string, quantity: number, rate: number) => {
    const desc = cleanDesc(description);
    result.lineItems.push({
      id: crypto.randomUUID(),
      description: desc,
      quantity,
      rate,
    });
  };

  for (const line of lines) {
    const hit = findQtyRate(line);
    if (hit) {
      const desc = cleanDesc(hit.before) || pendingDesc || cleanDesc(hit.after) || '';
      pushItem(desc, hit.qty, hit.rate);
      pendingDesc = '';
      continue;
    }

    // Not a line item — could be customer or pending description
    if (!result.billTo && looksLikeCustomerLine(line)) {
      result.billTo = line;
      continue;
    }

    // Save as a pending description for the next qty/rate line
    pendingDesc = pendingDesc ? `${pendingDesc} ${line}` : line;
  }

  // Trailing pending description with no rate — only push if we have no items yet
  if (pendingDesc && result.lineItems.length === 0) {
    pushItem(pendingDesc, 1, 0);
  }

  return result;
};