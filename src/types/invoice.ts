export type InvoiceType = 'production' | 'rental';

export type { BusinessId } from '@/config/businesses';
import type { BusinessId } from '@/config/businesses';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

/** A custom flat fee with its own label, e.g. "Express Fee" — for charges that have no dedicated slot. */
export interface ExtraCharge {
  id: string;
  label: string;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  business: BusinessId;
  date: string;
  paymentTerms: string;
  senderName: string;
  billTo: string;
  lineItems: LineItem[];
  taxRate: number;
  discountPercent: number;
  serviceCharge: number;
  logisticsFee: number;
  cautionFee: number;
  handlingFee: number;
  depositReceived: number;
  extraCharges?: ExtraCharge[]; // optional so older saved invoices still load
  menuDescription: string; // compact food/service menu breakdown
  // Editable terms & account details
  termsText: string;
  notesText: string; // rental only
  accountName: string;
  bankName: string;
  accountNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceCalculations {
  subtotal: number;
  discountAmount: number;
  serviceChargeAmount: number;
  taxAmount: number;
  extraChargesTotal: number;
  total: number;
  balanceDue: number;
}
