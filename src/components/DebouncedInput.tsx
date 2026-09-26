import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DebouncedInputProps extends Omit<React.ComponentProps<typeof Input>, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * An input that keeps its own local state for instant keystroke response,
 * then debounces the onChange callback to the parent. This prevents the
 * entire form tree from re-rendering on every keystroke.
 */
export const DebouncedInput = memo(({ value, onChange, debounceMs = 150, ...props }: DebouncedInputProps) => {
  const [localValue, setLocalValue] = useState(String(value));
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync from parent when value changes externally (e.g. smart-fill, load invoice)
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeRef.current(next), debounceMs);
  }, [debounceMs]);

  // Flush on blur so we never lose typed data
  const handleBlur = useCallback(() => {
    clearTimeout(timerRef.current);
    onChangeRef.current(localValue);
  }, [localValue]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return <Input {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
});
DebouncedInput.displayName = 'DebouncedInput';


interface DebouncedTextareaProps extends Omit<React.ComponentProps<typeof Textarea>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const DebouncedTextarea = memo(({ value, onChange, debounceMs = 150, ...props }: DebouncedTextareaProps) => {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setLocalValue(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChangeRef.current(next), debounceMs);
  }, [debounceMs]);

  const handleBlur = useCallback(() => {
    clearTimeout(timerRef.current);
    onChangeRef.current(localValue);
  }, [localValue]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return <Textarea {...props} value={localValue} onChange={handleChange} onBlur={handleBlur} />;
});
DebouncedTextarea.displayName = 'DebouncedTextarea';
