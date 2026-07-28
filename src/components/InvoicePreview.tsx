import { forwardRef } from 'react';
import { Invoice } from '@/types/invoice';
import { formatCurrency, calculateInvoice, calculateLineAmount, formatDate } from '@/utils/invoiceUtils';
import { getBusiness } from '@/config/businesses';

interface InvoicePreviewProps {
  invoice: Invoice;
}

const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ invoice }, ref) => {
    const calculations = calculateInvoice(invoice);
    const business = getBusiness(invoice.business);

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
          position: 'relative',
        }}
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          {/* Left: Logo */}
          <div className="flex flex-col">
            <div 
              className="overflow-hidden"
              style={{ 
                width: `${business.logoWidth}px`, 
                height: `${business.logoHeight}px`, 
                backgroundColor: business.logoBackground,
                border: business.logoBorder,
                borderRadius: `${business.logoBorderRadius}px`,
              }}
            >
              <img 
                src={business.logo} 
                alt={business.name} 
                className="w-full h-full"
                style={{ objectFit: business.logoFit }}
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
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
              # {invoice.invoiceNumber}
            </p>
            
            <div style={{ fontSize: '13px' }} className="space-y-1 mb-4">
              <div className="flex justify-end gap-6">
                <span style={{ color: '#888' }}>Date:</span>
                <span style={{ color: '#333', fontWeight: 500 }}>
                  {formatDate(invoice.date)}
                </span>
              </div>
              <div className="flex justify-end gap-6">
                <span style={{ color: '#888' }}>Payment Terms:</span>
                <span style={{ color: '#333', fontWeight: 500 }}>
                  {invoice.paymentTerms}
                </span>
              </div>
            </div>

            {/* Balance Due Box */}
            <div 
              className="inline-flex items-center justify-between gap-6"
              style={{ 
                background: 'linear-gradient(135deg, #b8964e 0%, #d4af5e 50%, #c9a34d 100%)',
                padding: '14px 28px',
                minWidth: '280px',
                borderRadius: '6px',
              }}
            >
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                Balance Due
              </span>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>
                {formatCurrency(calculations.balanceDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Sender and Bill To */}
        <div style={{ marginBottom: '32px' }}>
          <p style={{ color: '#333', fontWeight: 600, fontSize: '15px', marginBottom: '20px' }}>
            {invoice.senderName}
          </p>
          <p style={{ color: '#888', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bill To:</p>
          <p style={{ color: '#333', fontWeight: 600, fontSize: '15px' }}>
            {invoice.billTo || 'Customer Name'}
          </p>
        </div>

        {/* Items Table */}
        <div style={{ marginBottom: '40px' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#2d2d2d' }}>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '14px 16px', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderTopLeftRadius: '6px',
                }}>
                  Item
                </th>
                <th style={{ 
                  textAlign: 'center', 
                  padding: '14px 16px', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '100px'
                }}>
                  Quantity
                </th>
                <th style={{ 
                  textAlign: 'right', 
                  padding: '14px 16px', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '130px'
                }}>
                  Rate
                </th>
                <th style={{ 
                  textAlign: 'right', 
                  padding: '14px 16px', 
                  fontSize: '11px', 
                  fontWeight: 600, 
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  width: '150px',
                  borderTopRightRadius: '6px',
                }}>
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, index) => (
                <tr 
                  key={item.id} 
                  style={{ 
                    borderBottom: '1px solid #eee',
                    backgroundColor: index % 2 === 1 ? '#fafafa' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333' }}>
                    {item.description || '-'}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'right' }}>
                    {formatCurrency(item.rate)}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#333', textAlign: 'right', fontWeight: 500 }}>
                    {formatCurrency(calculateLineAmount(item.quantity, item.rate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '50px' }}>
          <div style={{ width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
              <span style={{ color: '#666' }}>Subtotal:</span>
              <span style={{ color: '#333', fontWeight: 500 }}>{formatCurrency(calculations.subtotal)}</span>
            </div>
            {invoice.cautionFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: '#666' }}>Caution Fee:</span>
                <span style={{ color: '#333', fontWeight: 500 }}>{formatCurrency(invoice.cautionFee)}</span>
              </div>
            )}
            {invoice.handlingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: '#666' }}>Handling Fee:</span>
                <span style={{ color: '#333', fontWeight: 500 }}>{formatCurrency(invoice.handlingFee)}</span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '13px', 
              paddingTop: '12px', 
              borderTop: '2px solid #ddd',
              marginBottom: '10px'
            }}>
              <span style={{ color: '#444', fontWeight: 600 }}>Total (inclusive of 7.5% VAT):</span>
              <span style={{ color: '#333', fontWeight: 700 }}>{formatCurrency(calculations.total)}</span>
            </div>
            {invoice.depositReceived > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Deposit received:</span>
                <span style={{ color: '#2a7d2e', fontWeight: 600 }}>{formatCurrency(invoice.depositReceived)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Terms Section */}
        <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.7' }}>
          {invoice.invoiceType === 'rental' && invoice.notesText && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>Notes:</p>
              {invoice.notesText.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}
          
          <div>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>Terms:</p>
            {invoice.termsText.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>

          {/* Account Details Box */}
          <div style={{ 
            marginTop: '16px', 
            padding: '14px 18px', 
            backgroundColor: '#f8f8f8', 
            borderRadius: '6px',
            borderLeft: '3px solid #b8964e',
          }}>
            <p style={{ fontWeight: 600, marginBottom: '6px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '10px' }}>Account Details:</p>
            <p style={{ color: '#333', fontWeight: 500 }}>{invoice.accountName}</p>
            <p>{invoice.bankName}</p>
            <p style={{ fontWeight: 500, color: '#333', letterSpacing: '0.5px' }}>{invoice.accountNumber}</p>
          </div>
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

export default InvoicePreview;
