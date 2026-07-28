import { Invoice, InvoiceCalculations, LineItem, InvoiceType } from '@/types/invoice';
import { BusinessId, getBusiness, getBusinessAccount } from '@/config/businesses';

export const formatCurrency = (amount: number): string => {
  return `NGN ${amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const calculateLineAmount = (quantity: number, rate: number): number => {
  return quantity * rate;
};

export const calculateInvoice = (invoice: Invoice): InvoiceCalculations => {
  const subtotal = invoice.lineItems.reduce(
    (sum, item) => sum + calculateLineAmount(item.quantity, item.rate),
    0
  );
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const cautionFee = invoice.cautionFee || 0;
  const handlingFee = invoice.handlingFee || 0;
  const total = subtotal + taxAmount + cautionFee + handlingFee;
  const balanceDue = total - (invoice.depositReceived || 0);

  return { subtotal, taxAmount, total, balanceDue };
};

export const generateInvoiceNumber = (): string => {
  const stored = localStorage.getItem('lastInvoiceNumber');
  const lastNumber = stored ? parseInt(stored, 10) : 100;
  const newNumber = lastNumber + 1;
  localStorage.setItem('lastInvoiceNumber', newNumber.toString());
  return newNumber.toString();
};

export const getDefaultPaymentTerms = (type: InvoiceType): string => {
  return type === 'production' ? 'Minimum of 80%' : '100%';
};

export const getDefaults = (type: InvoiceType, business: BusinessId = 'costridot') => {
  const config = getBusiness(business);
  return {
    termsText: config.terms[type],
    notesText: config.notes[type],
    ...getBusinessAccount(business),
  };
};

export const createNewInvoice = (
  type: InvoiceType = 'production',
  business: BusinessId = 'costridot'
): Invoice => {
  const defaults = getDefaults(type, business);
  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    invoiceType: type,
    business,
    date: new Date().toISOString().split('T')[0],
    paymentTerms: getDefaultPaymentTerms(type),
    senderName: getBusiness(business).senderName,
    billTo: '',
    lineItems: [
      { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 },
    ],
    taxRate: 7.5,
    cautionFee: 0,
    handlingFee: 0,
    depositReceived: 0,
    ...defaults,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const duplicateInvoice = (invoice: Invoice): Invoice => {
  return {
    ...invoice,
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineItems: invoice.lineItems.map(item => ({
      ...item,
      id: crypto.randomUUID(),
    })),
  };
};

export const saveInvoice = (invoice: Invoice): void => {
  const invoices = getStoredInvoices();
  const existingIndex = invoices.findIndex(inv => inv.id === invoice.id);
  
  const updatedInvoice = {
    ...invoice,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    invoices[existingIndex] = updatedInvoice;
  } else {
    invoices.push(updatedInvoice);
  }

  localStorage.setItem('invoices', JSON.stringify(invoices));
};

export const getStoredInvoices = (): Invoice[] => {
  const stored = localStorage.getItem('invoices');
  return stored ? JSON.parse(stored) : [];
};

export const deleteInvoice = (id: string): void => {
  const invoices = getStoredInvoices().filter(inv => inv.id !== id);
  localStorage.setItem('invoices', JSON.stringify(invoices));
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
