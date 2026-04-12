import { Invoice, InvoiceCalculations, LineItem, InvoiceType } from '@/types/invoice';

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
  const total = subtotal + taxAmount + cautionFee;
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

const getDefaultTerms = (type: InvoiceType): string => {
  return type === 'production'
    ? 'A minimum of 80% upfront payment is required to book production timeline.\nBalance is to be paid upon notification of completion ( not later than forty eight (48) hours. Pick-up or delivery is to be handled by client.'
    : '100% payment into:';
};

const getDefaultNotes = (type: InvoiceType): string => {
  return type === 'rental' ? 'Pick-up or delivery is to be handled by client' : '';
};

export const getDefaults = (type: InvoiceType) => ({
  termsText: getDefaultTerms(type),
  notesText: getDefaultNotes(type),
  accountName: 'Costridot International',
  bankName: 'Kuda Bank',
  accountNumber: '3003475464',
});

export const createNewInvoice = (type: InvoiceType = 'production'): Invoice => {
  const defaults = getDefaults(type);
  return {
    id: crypto.randomUUID(),
    invoiceNumber: generateInvoiceNumber(),
    invoiceType: type,
    date: new Date().toISOString().split('T')[0],
    paymentTerms: getDefaultPaymentTerms(type),
    senderName: 'Olayinka O Fagbuaro',
    billTo: '',
    lineItems: [
      { id: crypto.randomUUID(), description: '', quantity: 1, rate: 0 },
    ],
    taxRate: 7.5,
    cautionFee: 0,
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
