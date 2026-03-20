import { Parser } from 'expr-eval';
import type { ValidationResult } from './types';

const parser = new Parser();

const BUILT_INS = new Set([
  'sqrt', 'abs', 'ceil', 'floor', 'round', 'trunc', 'log', 'log2', 'log10',
  'exp', 'pow', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'min', 'max', 'hypot', 'sign', 'cbrt', 'expm1', 'log1p',
  'PI', 'E', 'true', 'false',
  'random', 'fac', 'length', 'not', 'and', 'or', 'if',
]);

export function validateFormula(
  formula: string,
  availableCodigos: string[],
): ValidationResult {
  if (!formula.trim()) {
    return { valid: false, error: 'La formula no puede estar vacia', references: [] };
  }

  try {
    parser.parse(formula);
  } catch (err) {
    return {
      valid: false,
      error: `Sintaxis invalida: ${err instanceof Error ? err.message : String(err)}`,
      references: [],
    };
  }

  const knownCodigos = new Set(availableCodigos);
  const allTokens = formula.match(/[a-zA-Z_]\w*/g) ?? [];

  const references: string[] = [];
  const unknownRefs: string[] = [];

  for (const token of allTokens) {
    if (knownCodigos.has(token)) {
      if (!references.includes(token)) references.push(token);
    } else if (!BUILT_INS.has(token)) {
      if (!unknownRefs.includes(token)) unknownRefs.push(token);
    }
  }

  if (unknownRefs.length > 0) {
    return {
      valid: false,
      error: `Variable(s) desconocida(s): ${unknownRefs.join(', ')}`,
      references,
    };
  }

  return { valid: true, references };
}
