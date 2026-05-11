import { LineItem } from '@/types/invoice';

export interface ParsedInvoiceInput {
  billTo?: string;
  lineItems: LineItem[];
}

const parseRate = (raw: string): number => {
  let s = raw.trim().toLowerCase().replace(/[₦,\s]/g, '');
  let mult = 1;
  if (s.endsWith('k')) { mult = 1_000; s = s.slice(0, -1); }
  else if (s.endsWith('m')) { mult = 1_000_000; s = s.slice(0, -1); }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n * mult;
};

// Matches things like: "40pc x30k", "40 x 30,000", "10 @ 5000", "2*15k"
const QTY_RATE_RE = /(\d+)\s*(?:pcs?|pc|units?|x)?\s*[x@*×]\s*(₦?\s*[\d.,]+\s*[km]?)/i;

export const parseSmartInput = (text: string): ParsedInvoiceInput => {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const result: ParsedInvoiceInput = { lineItems: [] };
  if (lines.length === 0) return result;

  result.billTo = lines[0];

  let pendingDesc = '';
  const pushItem = (description: string, quantity: number, rate: number) => {
    result.lineItems.push({
      id: crypto.randomUUID(),
      description,
      quantity,
      rate,
    });
  };

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^(plus\s+)?vat\b/i.test(line)) continue;
    if (/^total\b/i.test(line)) continue;

    const m = line.match(QTY_RATE_RE);
    if (m) {
      const qty = parseInt(m[1], 10) || 1;
      const rate = parseRate(m[2]);
      // Description: anything in the line before the match, fallback to pendingDesc
      const before = line.slice(0, m.index).trim().replace(/[-:]\s*$/, '').trim();
      const desc = before || pendingDesc || '';
      pushItem(desc, qty, rate);
      pendingDesc = '';
    } else {
      if (pendingDesc) {
        pushItem(pendingDesc, 1, 0);
      }
      pendingDesc = line;
    }
  }
  if (pendingDesc) pushItem(pendingDesc, 1, 0);

  return result;
};