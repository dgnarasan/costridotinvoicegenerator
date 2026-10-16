import { Invoice, LineItem, InvoiceType } from '@/types/invoice';
import { getDefaultPaymentTerms, getDefaults, formatCurrency, calculateLineAmount } from '@/utils/invoiceUtils';
import { parseSmartInput, ParsedInvoiceInput } from '@/utils/smartParser';
import { parseWithGemini, getStoredGeminiApiKey, lastGeminiRun } from '@/utils/aiParser';
import { GeminiApiKeyModal } from '@/components/GeminiApiKeyModal';
import { useState, memo, useCallback, useMemo, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Wand2, Sparkles, Key, Loader2, CheckCircle2, Receipt } from 'lucide-react';
import { getBusiness } from '@/config/businesses';
import { DebouncedInput, DebouncedTextarea } from '@/components/DebouncedInput';

interface InvoiceFormProps {
  invoice: Invoice;
  onChange: (invoice: Invoice, actionLabel?: string) => void;
}

const InvoiceForm = ({ invoice, onChange }: InvoiceFormProps) => {
  const [smartText, setSmartText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const { toast } = useToast();
  const business = getBusiness(invoice.business);

  useEffect(() => {
    setHasApiKey(Boolean(getStoredGeminiApiKey()));
  }, [keyModalOpen]);

  // Live seconds counter on the AI button while waiting
  const [aiSeconds, setAiSeconds] = useState(0);
  useEffect(() => {
    if (!isAiLoading) return;
    setAiSeconds(0);
    const t = setInterval(() => setAiSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isAiLoading]);

  const applyParsedData = (parsed: ParsedInvoiceInput, source: 'ai' | 'offline') => {
    if (!parsed.billTo && parsed.lineItems.length === 0 && !parsed.menuDescription) {
      toast({
        title: 'Nothing found to parse',
        description: 'Please paste notes, WhatsApp messages, or order details first.',
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
      paymentTerms: parsed.paymentTerms || (typeChanged ? getDefaultPaymentTerms(nextType) : invoice.paymentTerms),
      ...typeDefaults,
      billTo: parsed.billTo || invoice.billTo,
      date: parsed.date || invoice.date,
      lineItems: parsed.lineItems.length > 0 ? parsed.lineItems : invoice.lineItems,
      depositReceived: parsed.depositReceived ?? invoice.depositReceived,
      cautionFee: parsed.cautionFee ?? invoice.cautionFee,
      handlingFee: parsed.handlingFee ?? invoice.handlingFee,
      logisticsFee: parsed.logisticsFee ?? invoice.logisticsFee,
      serviceCharge: parsed.serviceCharge ?? invoice.serviceCharge,
      taxRate: parsed.taxRate ?? invoice.taxRate,
      discountPercent: parsed.discountPercent ?? invoice.discountPercent,
      menuDescription: parsed.menuDescription ?? invoice.menuDescription,
      notesText: parsed.notesText ?? invoice.notesText,
      extraCharges: parsed.extraCharges ?? invoice.extraCharges ?? [],
    }, source === 'ai' ? 'AI Smart Fill' : 'Quick Fill');

    const summaryParts: string[] = [];
    if (parsed.lineItems.length > 0) summaryParts.push(`${parsed.lineItems.length} item(s)`);
    if (parsed.billTo) summaryParts.push(`for ${parsed.billTo}`);
    if (parsed.logisticsFee) summaryParts.push(`Logistics: ₦${parsed.logisticsFee.toLocaleString()}`);
    if (parsed.serviceCharge) summaryParts.push(`Service: ${parsed.serviceCharge}%`);
    if (parsed.menuDescription) summaryParts.push(`Menu added`);
    parsed.extraCharges?.forEach(c => summaryParts.push(`${c.label}: ₦${c.amount.toLocaleString()}`));

    toast({
      title: source === 'ai'
        ? `✨ AI filled in ${lastGeminiRun ? (lastGeminiRun.ms / 1000).toFixed(1) + 's' : ''}`
        : 'Invoice auto-filled',
      description: (summaryParts.length > 0 ? summaryParts.join(' • ') : 'Invoice successfully updated.') + ' — tap Undo to revert.',
    });
  };

  const handleSmartFill = () => {
    if (!smartText.trim()) {
      toast({
        title: 'Empty text',
        description: 'Add some text first.',
        variant: 'destructive',
      });
      return;
    }
    const parsed = parseSmartInput(smartText);
    applyParsedData(parsed, 'offline');
  };

  const handleAISmartFill = async () => {
    if (!smartText.trim()) {
      toast({
        title: 'Empty text',
        description: 'Paste some customer notes or a WhatsApp chat first.',
        variant: 'destructive',
      });
      return;
    }

    const apiKey = getStoredGeminiApiKey();
    if (!apiKey) {
      setKeyModalOpen(true);
      return;
    }

    setIsAiLoading(true);
    try {
      const parsed = await parseWithGemini(smartText, invoice.business);
      applyParsedData(parsed, 'ai');
    } catch (err: any) {
      console.error('Gemini parse error:', err);
      if (err.message?.includes('API_KEY_INVALID') || err.message?.includes('NO_API_KEY')) {
        toast({
          title: 'Invalid Gemini API Key',
          description: 'Please check your Gemini API key in settings.',
          variant: 'destructive',
        });
        setKeyModalOpen(true);
      } else {
        toast({
          title: 'AI Parsing Error',
          description: err.message || 'Could not connect to Gemini. You can use Quick Fill instead.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  // Live detection preview badges computed instantaneously from text
  const livePreview = useMemo(() => {
    if (!smartText || smartText.trim().length < 4) return null;
    try {
      const p = parseSmartInput(smartText);
      const hasAny = Boolean(
        p.billTo ||
        p.lineItems.length > 0 ||
        p.logisticsFee ||
        p.serviceCharge ||
        p.taxRate !== undefined ||
        p.discountPercent ||
        p.depositReceived ||
        p.cautionFee ||
        p.menuDescription ||
        (p.extraCharges && p.extraCharges.length > 0)
      );
      return hasAny ? p : null;
    } catch {
      return null;
    }
  }, [smartText]);

  const updateField = useCallback(<K extends keyof Invoice>(field: K, value: Invoice[K]) => {
    onChange({ ...invoice, [field]: value });
  }, [invoice, onChange]);

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

  const updateLineItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    const newItems = invoice.lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...invoice, lineItems: newItems });
  }, [invoice, onChange]);

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

  const addExtraCharge = () => {
    updateField('extraCharges', [...(invoice.extraCharges || []), { id: crypto.randomUUID(), label: '', amount: 0 }]);
  };

  const updateExtraCharge = useCallback((id: string, field: 'label' | 'amount', value: string | number) => {
    onChange({
      ...invoice,
      extraCharges: (invoice.extraCharges || []).map(c => (c.id === id ? { ...c, [field]: value } : c)),
    });
  }, [invoice, onChange]);

  const removeExtraCharge = (id: string) => {
    updateField('extraCharges', (invoice.extraCharges || []).filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Gemini API Key Dialog */}
      <GeminiApiKeyModal
        open={keyModalOpen}
        onOpenChange={setKeyModalOpen}
        onKeySaved={() => {
          setHasApiKey(true);
          // If user had text waiting, trigger AI fill automatically
          if (smartText.trim()) {
            setTimeout(handleAISmartFill, 200);
          }
        }}
      />

      {/* Smart Input Card */}
      <Card className="border-primary/40 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            Smart Input
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setKeyModalOpen(true)}
            className="h-7 text-xs px-2.5 gap-1.5 border-border hover:bg-muted"
          >
            {hasApiKey ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Gemini AI Active</span>
              </>
            ) : (
              <>
                <Key className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">Setup Gemini AI</span>
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste rough notes, messy WhatsApp messages, audio note text, or client orders. Auto-detects customer, items, quantities, rates, logistics, service charge, VAT, discounts, and menu breakdowns.
          </p>
          <Textarea
            value={smartText}
            onChange={(e) => setSmartText(e.target.value)}
            rows={6}
            placeholder={business.smartInputPlaceholder}
            className="font-mono text-xs leading-relaxed"
          />

          {/* Real-time live detection badges */}
          {livePreview && (
            <div className="p-2.5 bg-muted/50 rounded-md border border-border/60 text-xs space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Instant Detection Preview:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {livePreview.billTo && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    👤 {livePreview.billTo}
                  </span>
                )}
                {livePreview.lineItems.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    📦 {livePreview.lineItems.length} item{livePreview.lineItems.length > 1 ? 's' : ''}
                  </span>
                )}
                {livePreview.logisticsFee ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    🚚 Logistics: ₦{livePreview.logisticsFee.toLocaleString()}
                  </span>
                ) : null}
                {livePreview.serviceCharge ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    🏷️ Service: {livePreview.serviceCharge}%
                  </span>
                ) : null}
                {livePreview.taxRate !== undefined ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    📊 VAT: {livePreview.taxRate}%
                  </span>
                ) : null}
                {livePreview.discountPercent ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                    ✂️ Discount: {livePreview.discountPercent}%
                  </span>
                ) : null}
                {livePreview.extraCharges?.map(c => (
                  <span key={c.id} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    🧾 {c.label}: ₦{c.amount.toLocaleString()}
                  </span>
                ))}
                {livePreview.depositReceived ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                    💳 Deposit: ₦{livePreview.depositReceived.toLocaleString()}
                  </span>
                ) : null}
                {livePreview.menuDescription && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 max-w-[260px] truncate">
                    🍽️ Menu: {livePreview.menuDescription}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              type="button"
              onClick={handleAISmartFill}
              disabled={isAiLoading}
              className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-primary text-white font-medium hover:opacity-95 transition-opacity shadow-sm"
            >
              {isAiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gemini is reading… {aiSeconds}s
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Smart Fill (Gemini Flash)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSmartFill}
              disabled={isAiLoading}
              className="sm:w-auto"
            >
              <Wand2 className="h-4 w-4 mr-1.5" />
              Quick Fill (Offline)
            </Button>
          </div>
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
              <DebouncedInput
                id="invoiceNumber"
                value={invoice.invoiceNumber}
                onChange={(v) => updateField('invoiceNumber', v)}
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
              <DebouncedInput
                id="paymentTerms"
                value={invoice.paymentTerms}
                onChange={(v) => updateField('paymentTerms', v)}
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
            <DebouncedInput
              id="senderName"
              value={invoice.senderName}
              onChange={(v) => updateField('senderName', v)}
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
            <DebouncedInput
              id="billTo"
              value={invoice.billTo}
              onChange={(v) => updateField('billTo', v)}
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
                <DebouncedInput
                  value={item.description}
                  onChange={(v) => updateLineItem(item.id, 'description', v)}
                  placeholder={business.itemPlaceholder}
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

      {/* Menu / Service Breakdown */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Menu / Service Details</CardTitle>
          <p className="text-xs text-muted-foreground">Optional — list items included in this order (e.g. food menu, garment details)</p>
        </CardHeader>
        <CardContent>
          <DebouncedTextarea
            id="menuDescription"
            value={invoice.menuDescription}
            onChange={(v) => updateField('menuDescription', v)}
            rows={3}
            placeholder={
              invoice.business === 'foodwebb'
                ? 'e.g. Jollof Rice, Fried Rice, Grilled Chicken, Coleslaw, Small Chops, Chapman, Water'
                : 'e.g. Choir robe (maroon), Stole (gold satin), Cap'
            }
          />
          {invoice.menuDescription && invoice.menuDescription.trim() && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {invoice.menuDescription.split(',').map((item, i) => {
                const trimmed = item.trim();
                if (!trimmed) return null;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                  >
                    {trimmed}
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Totals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxRate">VAT (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={invoice.taxRate}
                onChange={(e) => updateField('taxRate', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="discountPercent">Discount (%)</Label>
              <Input
                id="discountPercent"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={invoice.discountPercent}
                onChange={(e) => updateField('discountPercent', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceCharge">Service Charge (%)</Label>
              <Input
                id="serviceCharge"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={invoice.serviceCharge}
                onChange={(e) => updateField('serviceCharge', parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="logisticsFee">Logistics (NGN)</Label>
              <Input
                id="logisticsFee"
                type="number"
                min="0"
                value={invoice.logisticsFee}
                onChange={(e) => updateField('logisticsFee', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Other / custom charges — for fees that don't have their own slot */}
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5" />
                Other Charges
              </Label>
              <span className="text-[11px] text-muted-foreground">e.g. Express fee, Setup fee</span>
            </div>
            {(invoice.extraCharges || []).map((charge) => (
              <div key={charge.id} className="flex items-center gap-2">
                <DebouncedInput
                  aria-label="Charge name"
                  value={charge.label}
                  onChange={(v) => updateExtraCharge(charge.id, 'label', v)}
                  placeholder="Charge name"
                  className="flex-1 min-w-0"
                />
                <Input
                  aria-label="Charge amount (NGN)"
                  type="number"
                  min="0"
                  value={charge.amount}
                  onChange={(e) => updateExtraCharge(charge.id, 'amount', parseFloat(e.target.value) || 0)}
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExtraCharge(charge.id)}
                  className="text-destructive hover:text-destructive px-2"
                  aria-label="Remove charge"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button id="add-extra-charge" type="button" variant="outline" size="sm" onClick={addExtraCharge} className="w-full">
              <Plus className="h-4 w-4 mr-1.5" />
              Add charge
            </Button>
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
              <DebouncedTextarea
                id="notesText"
                value={invoice.notesText}
                onChange={(v) => updateField('notesText', v)}
                rows={2}
              />
            </div>
          )}
          <div>
            <Label htmlFor="termsText">Terms</Label>
            <DebouncedTextarea
              id="termsText"
              value={invoice.termsText}
              onChange={(v) => updateField('termsText', v)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <DebouncedInput
                id="accountName"
                value={invoice.accountName}
                onChange={(v) => updateField('accountName', v)}
              />
            </div>
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <DebouncedInput
                id="bankName"
                value={invoice.bankName}
                onChange={(v) => updateField('bankName', v)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <DebouncedInput
              id="accountNumber"
              value={invoice.accountNumber}
              onChange={(v) => updateField('accountNumber', v)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default memo(InvoiceForm);
