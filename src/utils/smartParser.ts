import { LineItem, InvoiceType } from '@/types/invoice';

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
const UNITS = String.raw`(?:pcs?|pieces?|units?|sets?|robes?|items?|plates?|packs?|cartons?|crates?|bowls?|coolers?|trays?|servings?|portions?|dresses?|gowns?|cassocks?|stoles?|yards?|pairs?|guests?|persons?|people)`;

// Quantity-then-rate patterns. E.g.:
// "40pcs x 30k", "40 x 30,000", "100 plates @ 5000", "2 * 1.5m", "40 × 30k"
const QTY_OP_RATE = new RegExp(
  String.raw`(\d+)\s*${UNITS}?\s*[x@*×]\s*(${NUM})`,
  'i'
);

// "40 robes at 30k", "200 plates for 5,000 each", "40 at 30k", "40 @ 30k each"
const QTY_AT_RATE = new RegExp(
  String.raw`(\d+)\s*(?:${UNITS}|of\s+\w+)?\s*(?:at|for|@|=)\s*(${NUM})\s*(?:each|per|\/\s*\w+)?`,
  'i'
);

// "30k each for 40 robes", "5,000 per plate x 100"
const RATE_QTY = new RegExp(
  String.raw`(${NUM})\s*(?:each|per\s*\w*|/\s*\w+)\s*(?:for|x|\*|,)?\s*(\d+)`,
  'i'
);

// Total price given for multiple items: "100 plates for 300k total", "50 packs = 250,000 altogether"
const QTY_TOTAL_RATE = new RegExp(
  String.raw`(\d+)\s*${UNITS}?\s*(?:for|at|=|costing)?\s*(${NUM})\s*(?:total|altogether|in total)`,
  'i'
);

// Bare "40 robes 30k" or "100 jollof 5000" — qty word rate (fallback)
const QTY_WORDS_RATE = new RegExp(
  String.raw`\b(\d+)\b\s+([^\d\n]{0,40}?)\s+(${NUM})\b`,
  'i'
);

const isMoneyToken = (s: string): boolean => /[km]$/i.test(s) || /[,.]/.test(s) || parseFloat(s) >= 100;

const findQtyRate = (
  line: string
): { qty: number; rate: number; before: string; after: string; matchedText: string } | null => {
  // 1) Qty with explicit total indicator: e.g. "100 plates 300k total" -> unit rate = 3,000
  let m = line.match(QTY_TOTAL_RATE);
  if (m) {
    const qty = parseInt(m[1], 10) || 1;
    const totalAmount = parseMoney(m[2]);
    const rate = qty > 0 ? Math.round(totalAmount / qty) : totalAmount;
    return {
      qty,
      rate,
      before: line.slice(0, m.index).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }

  // 2) qty OP rate (40 x 30k)
  m = line.match(QTY_OP_RATE);
  if (m) {
    return {
      qty: parseInt(m[1], 10) || 1,
      rate: parseMoney(m[2]),
      before: line.slice(0, m.index).trim(),
      after: line.slice((m.index || 0) + m[0].length).trim(),
      matchedText: m[0],
    };
  }

  // 3) qty AT rate (40 robes at 30k each)
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

  // 4) rate each for qty (30k each for 40 robes)
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

  // 5) loose: qty <words> rate
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

  // 6) Single service / lump sum (e.g. "DJ services 50,000" or "Hall setup 200k")
  const singleMatch = line.match(new RegExp(String.raw`^(.+?)\s*[:\-–]?\s*(${NUM})$`, 'i'));
  if (singleMatch && isMoneyToken(singleMatch[2])) {
    const desc = singleMatch[1].trim();
    if (!/^(total|subtotal|balance|deposit|caution|handling|logistics|delivery|tax|vat|discount)\b/i.test(desc)) {
      return {
        qty: 1,
        rate: parseMoney(singleMatch[2]),
        before: desc,
        after: '',
        matchedText: singleMatch[0],
      };
    }
  }

  return null;
};

const cleanDesc = (s: string): string =>
  s
    .replace(/^[-–•*:\s\d.)]+/, '') // Strip leading dashes, bullets, numbers e.g. "1.", "-", "•"
    .replace(/[-–•*:\s]+$/, '')
    .trim();

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
const MENU_LABEL = /^\s*(?:menu|food|menu\s*list|food\s*list|dishes|package\s*items|included\s*items|package)\s*[:\-]\s*(.+)$/i;

const parseDateLoose = (s: string): string | undefined => {
  const t = s.trim();
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return undefined;
};

export const parseSmartInput = (text: string): ParsedInvoiceInput => {
  const rawLines = text
    .split('\n')
    .map(l => cleanWhatsAppLine(l.trim()))
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
    const desc = cleanDesc(description);
    if (!desc) return;
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
      result.billTo = cleanDesc(line);
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