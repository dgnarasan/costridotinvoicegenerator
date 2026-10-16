import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getStoredGeminiApiKey, setStoredGeminiApiKey } from '@/utils/aiParser';
import { Key, Sparkles, ExternalLink, Eye, EyeOff, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeminiApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onKeySaved?: () => void;
}

export const GeminiApiKeyModal = ({ open, onOpenChange, onKeySaved }: GeminiApiKeyModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setApiKey(getStoredGeminiApiKey());
    }
  }, [open]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast({
        title: 'Empty API Key',
        description: 'Please enter a valid Gemini API key.',
        variant: 'destructive',
      });
      return;
    }

    setStoredGeminiApiKey(trimmed);
    toast({
      title: 'Gemini API Key Saved',
      description: 'Your Gemini AI key is saved securely on this device.',
    });
    onOpenChange(false);
    if (onKeySaved) onKeySaved();
  };

  const handleClear = () => {
    setStoredGeminiApiKey('');
    setApiKey('');
    toast({
      title: 'API Key Removed',
      description: 'The stored Gemini API key has been cleared from this device.',
    });
  };

  const hasExistingKey = Boolean(getStoredGeminiApiKey());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Gemini Flash AI Setup
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Connect Google Gemini Flash to parse unstructured WhatsApp chats, customer messages, audio transcripts, and complex orders with human-level accuracy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-2 border border-border">
            <div className="flex items-center justify-between font-medium text-foreground">
              <span>Need a free API key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-muted-foreground">
              Google provides free access to Gemini Flash with generous daily request quotas. No credit card required.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="geminiApiKey" className="text-sm font-medium flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" />
              Gemini API Key
            </Label>
            <div className="relative">
              <Input
                id="geminiApiKey"
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Your key never leaves your browser. It is stored directly in your browser's private local storage.
            </p>
          </div>
        </div>

        <DialogFooter className="flex sm:justify-between items-center gap-2">
          {hasExistingKey ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Clear Key
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave}>
              <Check className="h-4 w-4 mr-1.5" />
              Save Key
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
