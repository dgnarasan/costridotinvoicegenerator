import { useState, useEffect } from 'react';
import { Invoice } from '@/types/invoice';
import { formatCurrency, calculateInvoice, formatDate, getStoredInvoices, deleteInvoice } from '@/utils/invoiceUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Trash2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BusinessId, getBusiness } from '@/config/businesses';

interface InvoiceHistoryProps {
  onLoad: (invoice: Invoice) => void;
  onDuplicate: (invoice: Invoice) => void;
  refreshKey: number;
  business?: BusinessId;
}

const InvoiceHistory = ({ onLoad, onDuplicate, refreshKey, business }: InvoiceHistoryProps) => {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    setInvoices(
      getStoredInvoices()
        .filter(inv => !business || (inv.business ?? 'costridot') === business)
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
    );
  }, [refreshKey, business]);

  const handleDelete = (id: string, invoiceNumber: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteInvoice(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    toast({
      title: 'Invoice deleted',
      description: `Invoice #${invoiceNumber} has been deleted.`,
    });
  };

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No saved invoices yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create and save your first invoice to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {invoices.map((invoice) => {
        const calculations = calculateInvoice(invoice);
        
        return (
          <Card 
            key={invoice.id} 
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => onLoad(invoice)}
          >
            <CardContent className="py-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">#{invoice.invoiceNumber}</span>
                    <Badge variant={invoice.invoiceType === 'production' ? 'default' : 'secondary'}>
                      {getBusiness(invoice.business).typeLabels[invoice.invoiceType]}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{invoice.billTo || 'No customer'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
                </div>
                
                <div className="text-right space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Due</p>
                    <p className="font-semibold">{formatCurrency(calculations.balanceDue)}</p>
                  </div>
                  
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(invoice);
                      }}
                      title="Duplicate invoice"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={(e) => handleDelete(invoice.id, invoice.invoiceNumber, e)}
                      title="Delete invoice"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default InvoiceHistory;
