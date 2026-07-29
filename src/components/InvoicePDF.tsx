import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';
import { formatCurrency, calculateInvoice, calculateLineAmount, formatDate } from '@/utils/invoiceUtils';
import { getBusiness } from '@/config/businesses';

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: '#333',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logoContainer: {
    overflow: 'hidden',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: '#333',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: '#888',
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
    gap: 20,
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
  },
  detailValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: 600,
    width: 110,
    textAlign: 'right',
  },
  balanceBox: {
    backgroundColor: '#b8964e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 260,
    borderRadius: 5,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  balanceValue: {
    fontSize: 15,
    fontWeight: 700,
    color: '#ffffff',
  },
  senderBillTo: {
    marginBottom: 28,
  },
  senderName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
  },
  billToLabel: {
    fontSize: 9,
    color: '#888',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  billToValue: {
    fontSize: 13,
    fontWeight: 600,
    color: '#333',
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#2d2d2d',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: '#fafafa',
  },
  itemCol: {
    flex: 3,
  },
  qtyCol: {
    width: 70,
    textAlign: 'center',
  },
  rateCol: {
    width: 100,
    textAlign: 'right',
  },
  amountCol: {
    width: 110,
    textAlign: 'right',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  totalsBox: {
    width: 260,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 11,
    color: '#666',
  },
  totalValue: {
    fontSize: 11,
    color: '#333',
    fontWeight: 600,
  },
  totalRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#ddd',
    marginBottom: 8,
  },
  totalLabelBold: {
    fontSize: 11,
    color: '#444',
    fontWeight: 600,
  },
  totalValueBold: {
    fontSize: 12,
    color: '#333',
    fontWeight: 700,
  },
  depositValue: {
    fontSize: 11,
    color: '#2a7d2e',
    fontWeight: 600,
  },
  termsContainer: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 600,
    color: '#555',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.6,
    marginBottom: 2,
  },
  notesSection: {
    marginBottom: 14,
  },
  accountBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderLeftWidth: 3,
    borderLeftColor: '#b8964e',
    borderRadius: 4,
  },
  accountName: {
    fontSize: 10,
    color: '#333',
    fontWeight: 600,
    marginBottom: 2,
  },
  accountDetail: {
    fontSize: 9,
    color: '#666',
    marginBottom: 1,
  },
  accountNumber: {
    fontSize: 10,
    color: '#333',
    fontWeight: 600,
    letterSpacing: 0.5,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  logoBase64?: string;
}

const InvoicePDF = ({ invoice, logoBase64 }: InvoicePDFProps) => {
  const calculations = calculateInvoice(invoice);
  const business = getBusiness(invoice.business);
  const logoScale = 110 / business.logoHeight;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Logo */}
          <View>
            {logoBase64 && (
              <Image
                src={logoBase64}
                style={{
                  width: business.logoWidth * logoScale,
                  height: 110,
                }}
              />
            )}
          </View>

          {/* Right: Invoice title and details */}
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoice.invoiceNumber}</Text>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.date)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Terms:</Text>
              <Text style={styles.detailValue}>{invoice.paymentTerms}</Text>
            </View>

            {/* Balance Due Box */}
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Balance Due</Text>
              <Text style={styles.balanceValue}>{formatCurrency(calculations.balanceDue)}</Text>
            </View>
          </View>
        </View>

        {/* Sender and Bill To */}
        <View style={styles.senderBillTo}>
          <Text style={styles.senderName}>{invoice.senderName}</Text>
          <Text style={styles.billToLabel}>BILL TO:</Text>
          <Text style={styles.billToValue}>{invoice.billTo || 'Customer Name'}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.itemCol]}>ITEM</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>QTY</Text>
            <Text style={[styles.tableHeaderCell, styles.rateCol]}>RATE</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>AMOUNT</Text>
          </View>
          {invoice.lineItems.map((item, index) => (
            <View key={item.id} style={index % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
              <Text style={styles.itemCol}>{item.description || '-'}</Text>
              <Text style={styles.qtyCol}>{item.quantity}</Text>
              <Text style={styles.rateCol}>{formatCurrency(item.rate)}</Text>
              <Text style={[styles.amountCol, { fontWeight: 600 }]}>{formatCurrency(calculateLineAmount(item.quantity, item.rate))}</Text>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal:</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculations.subtotal)}</Text>
            </View>
            {invoice.discountPercent > 0 && (
              <View style={styles.totalRow}>
                <Text style={{ fontSize: 11, color: '#c0392b' }}>Discount ({invoice.discountPercent}%):</Text>
                <Text style={{ fontSize: 11, color: '#c0392b', fontWeight: 600 }}>- {formatCurrency(calculations.discountAmount)}</Text>
              </View>
            )}
            {invoice.cautionFee > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Caution Fee:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.cautionFee)}</Text>
              </View>
            )}
            {invoice.handlingFee > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Handling Fee:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.handlingFee)}</Text>
              </View>
            )}
            <View style={styles.totalRowBorder}>
              <Text style={styles.totalLabelBold}>Total (inclusive of 7.5% VAT):</Text>
              <Text style={styles.totalValueBold}>{formatCurrency(calculations.total)}</Text>
            </View>
            {invoice.depositReceived > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Deposit received:</Text>
                <Text style={styles.depositValue}>{formatCurrency(invoice.depositReceived)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Terms Section */}
        <View style={styles.termsContainer}>
          {invoice.invoiceType === 'rental' && invoice.notesText ? (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>NOTES:</Text>
              {invoice.notesText.split('\n').map((line, i) => (
                <Text key={i} style={styles.termsText}>{line}</Text>
              ))}
            </View>
          ) : null}
          
          <View>
            <Text style={styles.sectionLabel}>TERMS:</Text>
            {invoice.termsText.split('\n').map((line, i) => (
              <Text key={i} style={styles.termsText}>{line}</Text>
            ))}
          </View>

          {/* Account Details Box */}
          <View style={styles.accountBox}>
            <Text style={styles.sectionLabel}>ACCOUNT DETAILS:</Text>
            <Text style={styles.accountName}>{invoice.accountName}</Text>
            <Text style={styles.accountDetail}>{invoice.bankName}</Text>
            <Text style={styles.accountNumber}>{invoice.accountNumber}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
