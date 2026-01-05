import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Invoice } from '@/types/invoice';
import { createNewInvoice, saveInvoice, duplicateInvoice } from '@/utils/invoiceUtils';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePreview from '@/components/InvoicePreview';
import InvoiceHistory from '@/components/InvoiceHistory';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Save, Download, Printer, Copy, FileText, History } from 'lucide-react';

const Index = () => {
  const [invoice, setInvoice] = useState<Invoice>(createNewInvoice());
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    toast({
      title: 'Invoice loaded',
      description: `Loaded invoice #${loadedInvoice.invoiceNumber}`,
    });
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!previewRef.current) return;

    setIsGeneratingPDF(true);

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Costridot_Invoice_${invoice.invoiceNumber}.pdf`);

      toast({
        title: 'PDF downloaded',
        description: `Invoice #${invoice.invoiceNumber} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [invoice.invoiceNumber, toast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground rounded flex items-center justify-center">
                <span className="text-background font-bold text-lg">CD</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Costridot Invoice Generator</h1>
                <p className="text-xs text-muted-foreground">Create professional invoices</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'PDF'}
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
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
              <div className="origin-top" style={{ transform: 'scale(0.48)', transformOrigin: 'top left' }}>
                <InvoicePreview ref={previewRef} invoice={invoice} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
