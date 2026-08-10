import { memo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import InvoicePDF from '@/components/InvoicePDF';
import { Invoice } from '@/types/invoice';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface LazyPDFDownloadProps {
  invoice: Invoice;
  logoBase64: string;
  fileName: string;
  variant: 'desktop' | 'mobile';
}

/**
 * This component is lazy-loaded so the heavy @react-pdf/renderer bundle
 * isn't parsed until the user actually needs it. It's also memoized so
 * the PDF document tree only rebuilds when the invoice data actually changes
 * (not on every parent re-render).
 */
const LazyPDFDownload = memo(({ invoice, logoBase64, fileName, variant }: LazyPDFDownloadProps) => {
  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} logoBase64={logoBase64} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <Button
          variant={variant === 'desktop' ? 'outline' : 'default'}
          size="sm"
          disabled={loading}
        >
          <Download className="h-4 w-4" />
          {variant === 'desktop' && (
            <span className="ml-2">{loading ? 'Generating...' : 'PDF'}</span>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
});

LazyPDFDownload.displayName = 'LazyPDFDownload';

export default LazyPDFDownload;
