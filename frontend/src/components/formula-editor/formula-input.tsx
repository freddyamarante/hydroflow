'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { Token } from './types';

const highlightStyles: Record<string, string> = {
  'variable-SENSOR': 'text-blue-300',
  'variable-FIJA': 'text-amber-300',
  'variable-CALCULADA': 'text-purple-300',
  'variable-SISTEMA': 'text-teal-300',
  number: 'text-emerald-400',
  operator: 'text-foreground/80',
  comparison: 'text-orange-400',
  logic: 'text-rose-300',
  function: 'text-cyan-400',
  constant: 'text-violet-400',
  paren: 'text-foreground/60',
  ternary: 'text-foreground/60',
  unknown: 'text-red-400',
  whitespace: '',
};

function getHighlightStyle(token: Token): string {
  if (token.type === 'variable' && token.variableTipo) {
    return highlightStyles[`variable-${token.variableTipo}`] ?? '';
  }
  return highlightStyles[token.type] ?? '';
}

interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  onCursorChange: (position: number) => void;
  tokens: Token[];
  disabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export function FormulaInput({
  value,
  onChange,
  onCursorChange,
  tokens,
  disabled,
  textareaRef,
}: FormulaInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      onCursorChange(e.currentTarget.selectionStart);
    },
    [onCursorChange],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'border-input dark:bg-input/30 relative rounded-md border text-sm transition-colors',
        'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* Syntax highlight layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm"
      >
        {tokens.map((token) => (
          <span key={`${token.start}-hl`} className={getHighlightStyle(token)}>
            {token.value}
          </span>
        ))}
      </div>

      {/* Interactive textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onClick={handleSelect}
        disabled={disabled}
        placeholder="Ej: velocidad * nivel * ancho_canal"
        rows={2}
        spellCheck={false}
        autoComplete="off"
        className={cn(
          'relative w-full resize-none bg-transparent px-3 py-2 font-mono text-sm text-transparent caret-current',
          'placeholder:text-muted-foreground/50 focus:outline-none',
          disabled && 'cursor-not-allowed',
        )}
      />
    </div>
  );
}
