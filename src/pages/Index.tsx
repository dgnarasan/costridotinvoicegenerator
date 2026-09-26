import { useState, useRef, useCallback, useEffect, useDeferredValue, useMemo, useTransition, lazy, Suspense } from 'react';
import { Invoice } from '@/types/invoice';
import { createNewInvoice, saveInvoice, duplicateInvoice } from '@/utils/invoiceUtils';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import InvoiceHistory from '@/components/InvoiceHistory';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, Printer, Copy, FileText, History, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BUSINESSES, BusinessId, getBusiness } from '@/config/businesses';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lazy-load heavy PDF components — they're only needed when downloading
const LazyPDFDownload = lazy(() => import('@/components/LazyPDFDownload'));

const Index = () => {
  const [business, setBusiness] = useState<BusinessId>(
    () => (localStorage.getItem('activeBusiness') as BusinessId) || 'costridot'
  );
  const [invoice, setInvoice] = useState<Invoice>(() =>
    createNewInvoice('production', (localStorage.getItem('activeBusiness') as BusinessId) || 'costridot')
  );
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [activeTab, setActiveTab] = useState('form');
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const businessConfig = getBusiness(business);
  const [, startTransition] = useTransition();

  // Stable callback: wraps setInvoice in startTransition so React treats
  // invoice updates as low-priority and won't block typing / scrolling.
  const handleInvoiceChange = useCallback((next: Invoice) => {
    startTransition(() => {
      setInvoice(next);
    });
  }, [startTransition]);

  // Deferred invoice for the preview — lets typing stay snappy while
  // the heavy preview component catches up in the background
  const deferredInvoice = useDeferredValue(invoice);

  const handleBusinessChange = (next: BusinessId) => {
    setBusiness(next);
    localStorage.setItem('activeBusiness', next);
    setInvoice(createNewInvoice('production', next));
    toast({
      title: `Switched to ${getBusiness(next).name}`,
      description: 'Started a new invoice for this business.',
    });
  };

  // Auto-save invoice whenever it changes (debounced) once it has content
  useEffect(() => {
    const hasContent =
      invoice.billTo.trim() ||
      invoice.lineItems.some(item => item.description.trim() || item.rate > 0);
    if (!hasContent) return;

    const timer = setTimeout(() => {
      saveInvoice(invoice);
      setHistoryRefreshKey(prev => prev + 1);
    }, 3000); // 3s debounce — localStorage writes are expensive on phone CPUs

    return () => clearTimeout(timer);
  }, [invoice]);

  // Convert logo to base64 for PDF via canvas (normalizes JPEG encoding)
  useEffect(() => {
    let cancelled = false;
    const convertLogoToBase64 = async () => {
      try {
        setLogoBase64('');
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (cancelled) return;
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/png');
          if (!cancelled) setLogoBase64(dataUrl);
        };
        img.onerror = () => {
          console.error('Failed to load logo image');
        };
        img.src = businessConfig.logo;
      } catch (error) {
        console.error('Failed to convert logo:', error);
      }
    };
    convertLogoToBase64();
    return () => {
      cancelled = true;
    };
  }, [businessConfig.logo]);

  const handleSave = () => {
    if (!invoice.billTo.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a customer name (Bill To)',
        variant: 'destructive',
      });
      return;
    }

    if (!invoice.lineItems.some(item => item.description.trim())) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one line item with a description',
        variant: 'destructive',
      });
      return;
    }

    saveInvoice(invoice);
    setHistoryRefreshKey(prev => prev + 1);
    toast({
      title: 'Invoice saved',
      description: `Invoice #${invoice.invoiceNumber} has been saved.`,
    });
  };

  const handleDuplicate = (sourceInvoice?: Invoice) => {
    const toDuplicate = sourceInvoice || invoice;
    const newInvoice = duplicateInvoice(toDuplicate);
    setInvoice(newInvoice);
    toast({
      title: 'Invoice duplicated',
      description: `Created new invoice #${newInvoice.invoiceNumber}`,
    });
  };

  const handleNewInvoice = () => {
    setInvoice(createNewInvoice('production', business));
    toast({
      title: 'New invoice created',
      description: 'Ready to create a new invoice',
    });
  };

  const handleLoadInvoice = (loadedInvoice: Invoice) => {
    setInvoice(loadedInvoice);
    if (loadedInvoice.business && loadedInvoice.business !== business) {
      setBusiness(loadedInvoice.business);
      localStorage.setItem('activeBusiness', loadedInvoice.business);
    }
    setActiveTab('form');
    toast({
      title: 'Invoice loaded',
      description: `Loaded invoice #${loadedInvoice.invoiceNumber}`,
    });
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Memoize the PDF filename so it doesn't cause re-renders
  const pdfFileName = useMemo(
    () => `${businessConfig.filePrefix}_${invoice.invoiceNumber}.pdf`,
    [businessConfig.filePrefix, invoice.invoiceNumber]
  );

  // PDF download button — renders the lazy-loaded component
  const renderPdfButton = (variant: 'desktop' | 'mobile') => {
    if (!logoBase64) return null;
    return (
      <Suspense fallback={
        <Button variant={variant === 'desktop' ? 'outline' : 'default'} size="sm" disabled>
          <Download className="h-4 w-4" />
          {variant === 'desktop' && <span className="ml-2">PDF</span>}
        </Button>
      }>
        <LazyPDFDownload
          invoice={deferredInvoice}
          logoBase64={logoBase64}
          fileName={pdfFileName}
          variant={variant}
        />
      </Suspense>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-3 min-w-0">
              <div 
                className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                style={{ backgroundColor: businessConfig.logoBackground, border: businessConfig.logoBorder || 'none' }}
              >
                <img 
                  src={businessConfig.logo} 
                  alt={businessConfig.shortName}
                  className="w-full h-full"
                  style={{ objectFit: businessConfig.logoFit }}
                />
              </div>
              <div className="min-w-0">
                <Select value={business} onValueChange={(v: BusinessId) => handleBusinessChange(v)}>
                  <SelectTrigger className="h-8 border-none px-1 font-bold text-base lg:text-xl shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(BUSINESSES).map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.shortName} Invoice
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground hidden sm:block pl-1">{businessConfig.tagline}</p>
              </div>
            </div>
            
            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleNewInvoice}>
                <FileText className="h-4 w-4 mr-2" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDuplicate()}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </Button>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              {renderPdfButton('desktop')}
              <Button variant="default" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>

            {/* Mobile Actions Dropdown */}
            <div className="lg:hidden flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleNewInvoice}>
                    <FileText className="h-4 w-4 mr-2" />
                    New Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 lg:py-6 print:p-0">
        {/* Mobile: Tabbed Layout */}
        <div className="lg:hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="form">
                <FileText className="h-4 w-4 mr-1" />
                Form
              </TabsTrigger>
              <TabsTrigger value="preview">
                Preview
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                History
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Conditionally render ONLY the active tab — on mobile, keeping
              all 3 tabs mounted (Preview + History + Form) kills performance
              because the phone CPU can't handle re-rendering them all. */}
          {activeTab === 'form' && (
            <InvoiceForm invoice={invoice} onChange={handleInvoiceChange} />
          )}

          {activeTab === 'preview' && (
            <div className="bg-muted rounded-lg p-3 overflow-auto">
              <div className="text-sm font-medium text-muted-foreground mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Live Preview (A4)
                </span>
                {renderPdfButton('mobile')}
              </div>
              <div className="overflow-x-auto">
                <div style={{ transform: 'scale(0.42)', transformOrigin: 'top left', width: '210mm' }}>
                  <InvoicePreview ref={previewRef} invoice={deferredInvoice} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <InvoiceHistory 
              onLoad={handleLoadInvoice} 
              onDuplicate={handleDuplicate}
              refreshKey={historyRefreshKey}
              business={business}
            />
          )}
        </div>

        {/* Desktop: Two Column Layout */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-6">
          {/* Left Column: Form & History */}
          <div className="space-y-6">
            <Tabs defaultValue="form">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form">
                  <FileText className="h-4 w-4 mr-2" />
                  Invoice Form
                </TabsTrigger>
                <TabsTrigger value="history">
                  <History className="h-4 w-4 mr-2" />
                  History
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="form" className="mt-4">
                <InvoiceForm invoice={invoice} onChange={handleInvoiceChange} />
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <InvoiceHistory 
                  onLoad={handleLoadInvoice} 
                  onDuplicate={handleDuplicate}
                  refreshKey={historyRefreshKey}
                  business={business}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <div className="bg-muted rounded-lg p-4 overflow-auto max-h-[calc(100vh-8rem)]">
              <div className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Live Preview (A4)
              </div>
              <div className="origin-top-left" style={{ transform: 'scale(0.48)', transformOrigin: 'top left' }}>
                <InvoicePreview ref={previewRef} invoice={deferredInvoice} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body * {
            visibility: hidden;
          }
          #invoice-preview,
          #invoice-preview * {
            visibility: visible;
          }
          #invoice-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            transform: none !important;
            box-shadow: none !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default Index;
