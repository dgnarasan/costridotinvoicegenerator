import { useState, useRef, useCallback, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Invoice } from '@/types/invoice';
import { createNewInvoice, saveInvoice, duplicateInvoice } from '@/utils/invoiceUtils';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import InvoiceHistory from '@/components/InvoiceHistory';
import InvoicePDF from '@/components/InvoicePDF';
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
import costridotLogo from '@/assets/costridot-logo.jpeg';

const Index = () => {
  const [invoice, setInvoice] = useState<Invoice>(createNewInvoice());
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [logoBase64, setLogoBase64] = useState<string>('');
  const [activeTab, setActiveTab] = useState('form');
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Convert logo to base64 for PDF
  useEffect(() => {
    const convertLogoToBase64 = async () => {
      try {
        const response = await fetch(costridotLogo);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Failed to load logo:', error);
      }
    };
    convertLogoToBase64();
  }, []);

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
    setInvoice(createNewInvoice());
    toast({
      title: 'New invoice created',
      description: 'Ready to create a new invoice',
    });
  };

  const handleLoadInvoice = (loadedInvoice: Invoice) => {
    setInvoice(loadedInvoice);
    setActiveTab('form');
    toast({
      title: 'Invoice loaded',
      description: `Loaded invoice #${loadedInvoice.invoiceNumber}`,
    });
  };

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-3 lg:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:gap-3">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-foreground rounded flex items-center justify-center">
                <span className="text-background font-bold text-sm lg:text-lg">CD</span>
              </div>
              <div>
                <h1 className="text-base lg:text-xl font-bold text-foreground">Costridot Invoice</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Create professional invoices</p>
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
              {logoBase64 && (
                <PDFDownloadLink
                  document={<InvoicePDF invoice={invoice} logoBase64={logoBase64} />}
                  fileName={`Costridot_Invoice_${invoice.invoiceNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button variant="outline" size="sm" disabled={loading}>
                      <Download className="h-4 w-4 mr-2" />
                      {loading ? 'Generating...' : 'PDF'}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
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
              
              {logoBase64 && (
                <PDFDownloadLink
                  document={<InvoicePDF invoice={invoice} logoBase64={logoBase64} />}
                  fileName={`Costridot_Invoice_${invoice.invoiceNumber}.pdf`}
                >
                  {({ loading }) => (
                    <Button variant="default" size="sm" disabled={loading}>
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
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
            
            <TabsContent value="form">
              <InvoiceForm invoice={invoice} onChange={setInvoice} />
            </TabsContent>
            
            <TabsContent value="preview">
              <div className="bg-muted rounded-lg p-2 overflow-auto">
                <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Live Preview (A4)
                </div>
                <div className="overflow-x-auto">
                  <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: '210mm' }}>
                    <InvoicePreview ref={previewRef} invoice={invoice} />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history">
              <InvoiceHistory 
                onLoad={handleLoadInvoice} 
                onDuplicate={handleDuplicate}
                refreshKey={historyRefreshKey}
              />
            </TabsContent>
          </Tabs>
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
                <InvoiceForm invoice={invoice} onChange={setInvoice} />
              </TabsContent>
              
              <TabsContent value="history" className="mt-4">
                <InvoiceHistory 
                  onLoad={handleLoadInvoice} 
                  onDuplicate={handleDuplicate}
                  refreshKey={historyRefreshKey}
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
                <InvoicePreview ref={previewRef} invoice={invoice} />
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
