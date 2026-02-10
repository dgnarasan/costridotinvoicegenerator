export type InvoiceType = 'production' | 'rental';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  date: string;
  paymentTerms: string;
  senderName: string;
  billTo: string;
  lineItems: LineItem[];
  taxRate: number;
  depositReceived: number;
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
  taxAmount: number;
  total: number;
  balanceDue: number;
}
