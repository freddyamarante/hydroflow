'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { tokenize } from './formula-tokenizer';
import { validateFormula } from './formula-validator';
import { FormulaPreview } from './formula-preview';
import { FormulaInput } from './formula-input';
import { VariablePalette } from './variable-palette';
import { OperatorPalette } from './operator-palette';
import type { AvailableVariable, FormulaEditorProps, ValidationResult } from './types';

export function FormulaEditor({
  value,
  onChange,
  availableVariables,
  currentVariableCodigo,
  disabled,
}: FormulaEditorProps) {
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const validationTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Build variable lookup map
  const variableMap = useMemo(() => {
    const map = new Map<string, AvailableVariable>();
    for (const v of availableVariables) {
      if (v.codigo !== currentVariableCodigo) {
        map.set(v.codigo, v);
      }
    }
    return map;
  }, [availableVariables, currentVariableCodigo]);

  // Available codigos for validation (include delta_t)
  const availableCodigos = useMemo(() => {
    const codigos = availableVariables
      .filter((v) => v.codigo !== currentVariableCodigo)
      .map((v) => v.codigo);
    codigos.push('delta_t');
    return codigos;
  }, [availableVariables, currentVariableCodigo]);

  // Tokenize on every value change
  const tokens = useMemo(
    () => tokenize(value, variableMap),
    [value, variableMap],
  );

  // Debounced validation
  useEffect(() => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    if (!value.trim()) {
      setValidation(null);
      return;
    }

    validationTimeoutRef.current = setTimeout(() => {
      setValidation(validateFormula(value, availableCodigos));
    }, 500);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [value, availableCodigos]);

  // Insert text at cursor position with smart spacing
  const insertAtCursor = useCallback(
    (text: string) => {
      const pos = cursorPosition;
      const before = value.slice(0, pos);
      const after = value.slice(pos);

      // Smart spacing: add space before if needed
      let prefix = '';
      if (before.length > 0 && !/[\s(]$/.test(before) && !/^\s/.test(text)) {
        prefix = ' ';
      }

      // Add space after if needed (unless the inserted text ends with open paren or space)
      let suffix = '';
      if (after.length > 0 && !/^[\s),]/.test(after) && !/[\s(]$/.test(text)) {
        suffix = ' ';
      }

      const inserted = prefix + text + suffix;
      const newValue = before + inserted + after;
      const newCursorPos = pos + inserted.length;

      onChange(newValue);
      setCursorPosition(newCursorPos);

      // Re-focus and set cursor position
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [value, cursorPosition, onChange],
  );

  return (
    <div className="space-y-3">
      {/* Preview */}
      <FormulaPreview tokens={tokens} />

      {/* Input */}
      <FormulaInput
        value={value}
        onChange={onChange}
        onCursorChange={setCursorPosition}
        tokens={tokens}
        disabled={disabled}
        textareaRef={textareaRef}
      />

      {/* Validation status */}
      {validation && (
        <div
          className={cn(
            'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
            validation.valid
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400',
          )}
        >
          {validation.valid ? (
            <>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div className="flex flex-wrap items-center gap-1">
                <span>Formula valida — usa:</span>
                {validation.references.map((ref) => (
                  <span
                    key={ref}
                    className="bg-emerald-500/15 rounded px-1.5 py-0.5 font-mono text-xs"
                  >
                    {ref}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{validation.error}</span>
            </>
          )}
        </div>
      )}

      {/* Variable Palette */}
      <VariablePalette
        variables={availableVariables}
        currentVariableCodigo={currentVariableCodigo}
        onInsert={insertAtCursor}
      />

      {/* Operator Palette */}
      <OperatorPalette onInsert={insertAtCursor} />
    </div>
  );
}
