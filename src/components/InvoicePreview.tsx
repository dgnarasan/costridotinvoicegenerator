import { forwardRef } from 'react';
import { Invoice } from '@/types/invoice';
import { formatCurrency, calculateInvoice, calculateLineAmount, formatDate } from '@/utils/invoiceUtils';
import costridotLogo from '@/assets/costridot-logo.jpeg';

interface InvoicePreviewProps {
  invoice: Invoice;
}

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice }, ref) => {
    const calculations = calculateInvoice(invoice);

    return (
      <div
        ref={ref}
        id="invoice-preview"
        className="invoice-preview bg-invoice-bg shadow-lg"
        style={{ 
          width: '210mm',
          minHeight: '297mm',
          padding: '50px 60px',
          fontFamily: "'Inter', system-ui, sans-serif",
          boxSizing: 'border-box',
        }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          {/* Left: Logo */}
          <div className="flex flex-col">
            <div 
              className="overflow-hidden"
              style={{ 
                width: '130px', 
                height: '130px', 
                backgroundColor: '#000',
                border: '1px solid #333'
              }}
            >
              <img 
                src={costridotLogo} 
                alt="Costridot International" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right: Invoice title and details */}
          <div className="text-right">
            <h1 
              className="font-semibold tracking-wide mb-1"
              style={{ color: '#333', fontSize: '36px', letterSpacing: '2px' }}
            >
              INVOICE
            </h1>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
              # {invoice.invoiceNumber}
            </p>
            
            <div style={{ fontSize: '13px' }} className="space-y-1 mb-4">
              <div className="flex justify-end gap-6">
                <span style={{ color: '#888' }}>Date:</span>
                <span style={{ color: '#333' }}>
                  {formatDate(invoice.date)}
                </span>
              </div>
              <div className="flex justify-end gap-6">
                <span style={{ color: '#888' }}>Payment Terms:</span>
                <span style={{ color: '#333' }}>
                  {invoice.paymentTerms}
                </span>
              </div>
            </div>

            {/* Balance Due Box */}
            <div 
              className="inline-flex items-center justify-between gap-6"
              style={{ 
                backgroundColor: '#eeeeee', 
                padding: '12px 24px',
                minWidth: '280px'
              }}
            >
              <span style={{ color: '#333', fontWeight: 600, fontSize: '14px' }}>
                Balance Due
              </span>
              <span style={{ color: '#333', fontWeight: 700, fontSize: '16px' }}>
                {formatCurrency(calculations.balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Sender and Bill To */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ color: '#333', fontWeight: 600, fontSize: '14px', marginBottom: '20px' }}>
            {invoice.senderName}
          </p>
          <p style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Bill To:</p>
          <p style={{ color: '#333', fontWeight: 600, fontSize: '14px' }}>
            {invoice.billTo || 'Church Name'}
          </p>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '40px' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#3f3f3f' }}>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '12px 16px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#fff' 
                }}>
                  Item
                </th>
                <th style={{ 
                  textAlign: 'center', 
                  padding: '12px 16px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#fff',
                  width: '100px'
                }}>
                  Quantity
                </th>
                <th style={{ 
                  textAlign: 'right', 
                  padding: '12px 16px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#fff',
                  width: '130px'
                }}>
                  Rate
                </th>
                <th style={{ 
                  textAlign: 'right', 
                  padding: '12px 16px', 
                  fontSize: '12px', 
                  fontWeight: 600, 
                  color: '#fff',
                  width: '150px'
                }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333' }}>
                    {item.description || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'right' }}>
                    {formatCurrency(item.rate)}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'right' }}>
                    {formatCurrency(calculateLineAmount(item.quantity, item.rate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
          <div style={{ width: '280px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: '#666' }}>Subtotal:</span>
              <span style={{ color: '#333' }}>{formatCurrency(calculations.subtotal)}</span>
            </div>
            {invoice.cautionFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                <span style={{ color: '#666' }}>Caution Fee:</span>
                <span style={{ color: '#333' }}>{formatCurrency(invoice.cautionFee)}</span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '13px', 
              paddingTop: '10px', 
              borderTop: '1px solid #ddd',
              marginBottom: '8px'
            }}>
              <span style={{ color: '#666' }}>Total (inclusive of VAT):</span>
              <span style={{ color: '#333', fontWeight: 500 }}>{formatCurrency(calculations.total)}</span>
            </div>
            {invoice.depositReceived > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Deposit received:</span>
                <span style={{ color: '#333' }}>{formatCurrency(invoice.depositReceived)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms Section */}
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.6' }}>
          {invoice.invoiceType === 'rental' && invoice.notesText && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px', color: '#666' }}>Notes:</p>
              {invoice.notesText.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: '#666' }}>Terms:</p>
            {invoice.termsText.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <p style={{ marginTop: '4px' }}>Account details:</p>
            <p>{invoice.accountName}</p>
            <p>{invoice.bankName}</p>
            <p>{invoice.accountNumber}</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

export default InvoicePreview;
