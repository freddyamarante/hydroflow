'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Token } from './types';

const tokenStyles: Record<string, string> = {
  'variable-SENSOR': 'bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full px-2 py-0.5 font-mono text-sm',
  'variable-FIJA': 'bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full px-2 py-0.5 font-mono text-sm',
  'variable-CALCULADA': 'bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2 py-0.5 font-mono text-sm',
  'variable-SISTEMA': 'bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full px-2 py-0.5 font-mono text-sm',
  number: 'text-emerald-400 font-mono',
  operator: 'text-foreground/80 font-bold mx-0.5',
  comparison: 'text-orange-400 font-mono font-bold',
  logic: 'bg-rose-500/15 text-rose-300 rounded px-1.5 py-0.5 text-xs uppercase tracking-wide',
  function: 'text-cyan-400 font-mono italic',
  constant: 'text-violet-400 font-mono font-semibold',
  paren: 'text-foreground/60 font-mono',
  ternary: 'text-foreground/60 font-mono',
  unknown: 'text-red-400 underline decoration-wavy decoration-red-500/50',
};

function getTokenStyle(token: Token): string {
  if (token.type === 'variable' && token.variableTipo) {
    return tokenStyles[`variable-${token.variableTipo}`] ?? '';
  }
  return tokenStyles[token.type] ?? '';
}

interface FormulaPreviewProps {
  tokens: Token[];
}

export function FormulaPreview({ tokens }: FormulaPreviewProps) {
  const visibleTokens = tokens.filter((t) => t.type !== 'whitespace');

  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground text-xs font-medium">Vista previa</span>
      <div className="bg-muted/30 border-border flex min-h-[3rem] flex-wrap items-center gap-1 rounded-lg border p-3">
        {visibleTokens.length === 0 ? (
          <span className="text-muted-foreground/50 text-sm italic">
            Escribe una formula para ver la vista previa...
          </span>
        ) : (
          <AnimatePresence mode="popLayout">
            {visibleTokens.map((token) => (
              <motion.span
                key={`${token.start}-${token.value}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className={cn('inline-flex items-center', getTokenStyle(token))}
              >
                {token.displayValue}
              </motion.span>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
