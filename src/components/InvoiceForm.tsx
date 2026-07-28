import { Invoice, LineItem, InvoiceType } from '@/types/invoice';
import { getDefaultPaymentTerms, getDefaults, formatCurrency, calculateLineAmount } from '@/utils/invoiceUtils';
import { parseSmartInput } from '@/utils/smartParser';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import { getBusiness } from '@/config/businesses';

interface InvoiceFormProps {
  invoice: Invoice;
  onChange: (invoice: Invoice) => void;
}

const InvoiceForm = ({ invoice, onChange }: InvoiceFormProps) => {
  const [smartText, setSmartText] = useState('');
  const { toast } = useToast();
  const business = getBusiness(invoice.business);

  const handleSmartFill = () => {
    const parsed = parseSmartInput(smartText);
    if (!parsed.billTo && parsed.lineItems.length === 0) {
      toast({
        title: 'Nothing to parse',
        description: 'Add some text first.',
        variant: 'destructive',
      });
      return;
    }
    const nextType = parsed.invoiceType || invoice.invoiceType;
    const typeChanged = nextType !== invoice.invoiceType;
    const typeDefaults = typeChanged ? getDefaults(nextType, invoice.business) : {};
    onChange({
      ...invoice,
      invoiceType: nextType,
      paymentTerms: typeChanged ? getDefaultPaymentTerms(nextType) : invoice.paymentTerms,
      ...typeDefaults,
      billTo: parsed.billTo || invoice.billTo,
      date: parsed.date || invoice.date,
      lineItems: parsed.lineItems.length > 0 ? parsed.lineItems : invoice.lineItems,
      depositReceived: parsed.depositReceived ?? invoice.depositReceived,
      cautionFee: parsed.cautionFee ?? invoice.cautionFee,
      handlingFee: parsed.handlingFee ?? invoice.handlingFee,
    });
    toast({
      title: 'Invoice auto-filled',
      description: `Parsed ${parsed.lineItems.length} line item(s)${parsed.billTo ? ` for ${parsed.billTo}` : ''}.`,
    });
  };

  const updateField = <K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    onChange({ ...invoice, [field]: value });
  };

  const updateInvoiceType = (type: InvoiceType) => {
    const defaults = getDefaults(type, invoice.business);
    onChange({
      ...invoice,
      invoiceType: type,
      paymentTerms: getDefaultPaymentTerms(type),
      depositReceived: invoice.depositReceived,
      ...defaults,
    });
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    const newItems = invoice.lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    updateField('lineItems', newItems);
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      rate: 0,
    };
    updateField('lineItems', [...invoice.lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (invoice.lineItems.length > 1) {
      updateField('lineItems', invoice.lineItems.filter(item => item.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Smart Input */}
      <Card className="border-primary/40">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Smart Input
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste any rough notes — the parser auto-detects the customer, items, quantities, rates, deposit, and fees. Understands formats like "40pc x30k", "200 plates at 5,000 each", "10 @ 5k", "deposit 500k", "rental".
          </p>
          <Textarea
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            rows={7}
            placeholder={business.smartInputPlaceholder}
          />
          <Button onClick={handleSmartFill} className="w-full">
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-fill from text
          </Button>
        </CardContent>
      </Card>

      {/* Invoice Meta */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="invoiceType">Invoice Type</Label>
              <Select
                value={invoice.invoiceType}
                onValueChange={(value: InvoiceType) => updateInvoiceType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">{business.typeLabels.production}</SelectItem>
                  <SelectItem value="rental">{business.typeLabels.rental}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={invoice.invoiceNumber}
                onChange={(e) => updateField('invoiceNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={invoice.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={invoice.paymentTerms}
                onChange={(e) => updateField('paymentTerms', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sender Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sender</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="senderName">Sender Name</Label>
            <Input
              id="senderName"
              value={invoice.senderName}
              onChange={(e) => updateField('senderName', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="billTo">{business.billToLabel}</Label>
            <Input
              id="billTo"
              value={invoice.billTo}
              onChange={(e) => updateField('billTo', e.target.value)}
                  placeholder="Enter customer name"
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.lineItems.map((item, index) => (
            <div key={item.id} className="p-4 border border-border rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Item {index + 1}
                </span>
                {invoice.lineItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLineItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div>
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                  placeholder="e.g., Choir robes"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Rate (NGN)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.rate}
                    onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="h-10 px-3 py-2 bg-muted rounded-md text-sm flex items-center">
                    {formatCurrency(calculateLineAmount(item.quantity, item.rate))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addLineItem}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div>
            <Label htmlFor="cautionFee">Caution Fee (NGN)</Label>
            <Input
              id="cautionFee"
              type="number"
              min="0"
              value={invoice.cautionFee}
              onChange={(e) => updateField('cautionFee', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="handlingFee">Handling Fee (NGN)</Label>
            <Input
              id="handlingFee"
              type="number"
              min="0"
              value={invoice.handlingFee}
              onChange={(e) => updateField('handlingFee', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="depositReceived">Deposit Received (NGN)</Label>
            <Input
              id="depositReceived"
              type="number"
              min="0"
              value={invoice.depositReceived}
              onChange={(e) => updateField('depositReceived', parseFloat(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Terms & Account Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Terms & Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {invoice.invoiceType === 'rental' && (
            <div>
              <Label htmlFor="notesText">Notes</Label>
              <Textarea
                id="notesText"
                value={invoice.notesText}
                onChange={(e) => updateField('notesText', e.target.value)}
                rows={2}
              />
            </div>
          )}
          <div>
            <Label htmlFor="termsText">Terms</Label>
            <Textarea
              id="termsText"
              value={invoice.termsText}
              onChange={(e) => updateField('termsText', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={invoice.accountName}
                onChange={(e) => updateField('accountName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={invoice.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={invoice.accountNumber}
              onChange={(e) => updateField('accountNumber', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceForm;
