import { memo } from 'react';
import { Undo2, Redo2, History as HistoryIcon, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HistoryEntry } from '@/hooks/useInvoiceHistory';

interface UndoRedoBarProps {
  past: HistoryEntry[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onRevertTo: (index: number) => void;
  compact?: boolean; // icon-only for mobile
}

const timeAgo = (at: number): string => {
  const s = Math.round((Date.now() - at) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const UndoRedoBar = ({ past, canUndo, canRedo, onUndo, onRedo, onRevertTo, compact }: UndoRedoBarProps) => {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl+';

  return (
    <div className="flex items-center gap-1">
      <Button
        id="undo-button"
        variant="outline"
        size="sm"
        onClick={onUndo}
        disabled={!canUndo}
        title={`Undo (${mod}Z)`}
        aria-label="Undo"
        className={compact ? 'px-2' : ''}
      >
        <Undo2 className="h-4 w-4" />
        {!compact && <span className="ml-1.5">Undo</span>}
      </Button>
      <Button
        id="redo-button"
        variant="outline"
        size="sm"
        onClick={onRedo}
        disabled={!canRedo}
        title={`Redo (${mod}${isMac ? '⇧Z' : 'Y'})`}
        aria-label="Redo"
        className="px-2"
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id="change-history-button"
            variant="outline"
            size="sm"
            disabled={past.length === 0}
            title="Change history"
            aria-label="Change history"
            className="px-2 relative"
          >
            <HistoryIcon className="h-4 w-4" />
            {past.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-4 font-semibold">
                {past.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 max-h-[60vh] overflow-y-auto">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Tap a step to go back to just before it. You can redo afterwards.
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="opacity-100">
            <div className="flex items-center gap-2 w-full">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium text-sm">Current version</span>
            </div>
          </DropdownMenuItem>
          {[...past].map((entry, i) => ({ entry, i })).reverse().map(({ entry, i }) => (
            <DropdownMenuItem key={`${entry.at}-${i}`} onClick={() => onRevertTo(i)} className="cursor-pointer">
              <div className="flex items-center gap-2 w-full min-w-0">
                <RotateCcw className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">Before: {entry.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {timeAgo(entry.at)}
                    {entry.invoice.billTo ? ` · ${entry.invoice.billTo}` : ''}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default memo(UndoRedoBar);
