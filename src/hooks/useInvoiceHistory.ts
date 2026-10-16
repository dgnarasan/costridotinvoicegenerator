import { useCallback, useRef, useState } from 'react';
import { Invoice } from '@/types/invoice';

export interface HistoryEntry {
  invoice: Invoice;
  label: string; // the change that happened AFTER this snapshot, e.g. "AI Smart Fill"
  at: number;
}

const MAX_ENTRIES = 50;
const TYPING_GROUP_MS = 1500; // edits closer together than this become one undo step

const FIELD_LABELS: Partial<Record<keyof Invoice, string>> = {
  billTo: 'Customer',
  invoiceNumber: 'Invoice number',
  invoiceType: 'Invoice type',
  date: 'Date',
  paymentTerms: 'Payment terms',
  senderName: 'Sender',
  taxRate: 'VAT',
  discountPercent: 'Discount',
  serviceCharge: 'Service charge',
  logisticsFee: 'Logistics',
  cautionFee: 'Caution fee',
  handlingFee: 'Handling fee',
  depositReceived: 'Deposit',
  menuDescription: 'Menu',
  termsText: 'Terms',
  notesText: 'Notes',
  accountName: 'Account name',
  bankName: 'Bank',
  accountNumber: 'Account number',
  extraCharges: 'Other charges',
};

/** Human-readable summary of what changed, or null if nothing did. */
const describeChange = (prev: Invoice, next: Invoice): string | null => {
  if (prev.id !== next.id) return 'Switched invoice';

  const changed: string[] = [];
  if (prev.lineItems !== next.lineItems && JSON.stringify(prev.lineItems) !== JSON.stringify(next.lineItems)) {
    const diff = next.lineItems.length - prev.lineItems.length;
    changed.push(diff > 0 ? 'Added item' : diff < 0 ? 'Removed item' : 'Line items');
  }
  (Object.keys(FIELD_LABELS) as (keyof Invoice)[]).forEach((k) => {
    const a = prev[k];
    const b = next[k];
    const differs = Array.isArray(a) || Array.isArray(b)
      ? JSON.stringify(a ?? []) !== JSON.stringify(b ?? [])
      : a !== b;
    if (differs) changed.push(FIELD_LABELS[k]!);
  });

  if (changed.length === 0) return null;
  if (changed.length > 2) return `Changed ${changed.length} fields`;
  return `Edited ${changed.join(' & ')}`;
};

/**
 * Undo / redo history for the invoice.
 * - Typing bursts are grouped into one step so undo isn't one-letter-at-a-time.
 * - Big actions (AI fill, new invoice, load…) pass a label and always get their own step.
 * - Stacks live in refs; a re-render is only triggered at step boundaries, so typing stays lag-free.
 */
export const useInvoiceHistory = (
  invoice: Invoice,
  setInvoice: (inv: Invoice) => void
) => {
  const pastRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const lastEditAt = useRef(0);
  const currentRef = useRef(invoice);
  currentRef.current = invoice;
  const [, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);

  const apply = (inv: Invoice) => {
    currentRef.current = inv;
    lastEditAt.current = 0;
    setInvoice(inv);
    bump();
  };

  /** Call this instead of setInvoice for any user-driven change. */
  const commit = useCallback((next: Invoice, actionLabel?: string) => {
    const prev = currentRef.current;
    const autoLabel = describeChange(prev, next);
    if (!autoLabel && !actionLabel) return; // no-op (e.g. blur without edits)

    const now = Date.now();
    const isNewStep = Boolean(actionLabel) || now - lastEditAt.current > TYPING_GROUP_MS;
    lastEditAt.current = actionLabel ? 0 : now; // a labelled action never merges with the next edit

    if (isNewStep) {
      pastRef.current = [...pastRef.current, { invoice: prev, label: actionLabel || autoLabel!, at: now }].slice(-MAX_ENTRIES);
      futureRef.current = [];
      bump();
    }
    currentRef.current = next;
    setInvoice(next);
  }, [setInvoice]);

  const undo = useCallback(() => {
    const p = pastRef.current;
    if (p.length === 0) return;
    const entry = p[p.length - 1];
    futureRef.current = [{ invoice: currentRef.current, label: entry.label, at: Date.now() }, ...futureRef.current];
    pastRef.current = p.slice(0, -1);
    apply(entry.invoice);
    return entry.label;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInvoice]);

  const redo = useCallback(() => {
    const f = futureRef.current;
    if (f.length === 0) return;
    const entry = f[0];
    pastRef.current = [...pastRef.current, { invoice: currentRef.current, label: entry.label, at: Date.now() }];
    futureRef.current = f.slice(1);
    apply(entry.invoice);
    return entry.label;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInvoice]);

  /** Go back to the state just before past[index]'s change. Everything after can still be redone. */
  const revertTo = useCallback((index: number) => {
    const p = pastRef.current;
    if (index < 0 || index >= p.length) return;
    const undone: HistoryEntry[] = [];
    for (let i = index; i < p.length; i++) {
      const stateAfter = i + 1 < p.length ? p[i + 1].invoice : currentRef.current;
      undone.push({ invoice: stateAfter, label: p[i].label, at: Date.now() });
    }
    futureRef.current = [...undone, ...futureRef.current];
    pastRef.current = p.slice(0, index);
    apply(p[index].invoice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setInvoice]);

  return {
    commit,
    undo,
    redo,
    revertTo,
    past: pastRef.current,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
  };
};
