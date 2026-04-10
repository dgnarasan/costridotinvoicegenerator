import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';
import { formatCurrency, calculateInvoice, calculateLineAmount, formatDate } from '@/utils/invoiceUtils';

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
  logo: {
    width: 100,
    height: 100,
    objectFit: 'cover',
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
    color: '#666',
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
    width: 100,
    textAlign: 'right',
  },
  balanceBox: {
    backgroundColor: '#eeeeee',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minWidth: 240,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: 700,
    color: '#333',
  },
  senderBillTo: {
    marginBottom: 24,
  },
  senderName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
    marginBottom: 16,
  },
  billToLabel: {
    fontSize: 10,
    color: '#888',
    marginBottom: 4,
  },
  billToValue: {
    fontSize: 12,
    fontWeight: 600,
    color: '#333',
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3f3f3f',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 600,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    width: 240,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontSize: 11,
    color: '#666',
  },
  totalValue: {
    fontSize: 11,
    color: '#333',
  },
  totalRowBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    marginBottom: 6,
  },
  totalValueBold: {
    fontSize: 11,
    color: '#333',
    fontWeight: 600,
  },
  termsContainer: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#666',
    marginBottom: 4,
  },
  termsText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
    marginBottom: 2,
  },
  notesSection: {
    marginBottom: 14,
  },
});

interface InvoicePDFProps {
  invoice: Invoice;
  logoBase64?: string;
}

const InvoicePDF = ({ invoice, logoBase64 }: InvoicePDFProps) => {
  const calculations = calculateInvoice(invoice);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          {/* Logo */}
          <View>
            {logoBase64 && (
              <Image src={logoBase64} style={styles.logo} />
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
          <Text style={styles.billToLabel}>Bill To:</Text>
          <Text style={styles.billToValue}>{invoice.billTo || 'Church Name'}</Text>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.itemCol]}>Item</Text>
            <Text style={[styles.tableHeaderCell, styles.qtyCol]}>Quantity</Text>
            <Text style={[styles.tableHeaderCell, styles.rateCol]}>Rate</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.itemCol}>{item.description || '-'}</Text>
              <Text style={styles.qtyCol}>{item.quantity}</Text>
              <Text style={styles.rateCol}>{formatCurrency(item.rate)}</Text>
              <Text style={styles.amountCol}>{formatCurrency(calculateLineAmount(item.quantity, item.rate))}</Text>
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
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.taxRate}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(calculations.taxAmount)}</Text>
            </View>
            {invoice.cautionFee > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Caution Fee:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.cautionFee)}</Text>
              </View>
            )}
            <View style={styles.totalRowBorder}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValueBold}>{formatCurrency(calculations.total)}</Text>
            </View>
            {invoice.depositReceived > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Deposit received:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice.depositReceived)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Terms Section */}
        <View style={styles.termsContainer}>
          {invoice.invoiceType === 'rental' && invoice.notesText ? (
            <View style={styles.notesSection}>
              <Text style={styles.sectionLabel}>Notes:</Text>
              {invoice.notesText.split('\n').map((line, i) => (
                <Text key={i} style={styles.termsText}>{line}</Text>
              ))}
            </View>
          ) : null}
          
          <View>
            <Text style={styles.sectionLabel}>Terms:</Text>
            {invoice.termsText.split('\n').map((line, i) => (
              <Text key={i} style={styles.termsText}>{line}</Text>
            ))}
            <Text style={[styles.termsText, { marginTop: 4 }]}>Account details:</Text>
            <Text style={styles.termsText}>{invoice.accountName}</Text>
            <Text style={styles.termsText}>{invoice.bankName}</Text>
            <Text style={styles.termsText}>{invoice.accountNumber}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
