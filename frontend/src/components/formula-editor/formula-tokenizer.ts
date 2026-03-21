import type { AvailableVariable, Token, TokenType } from './types';

const LOGIC_KEYWORDS = new Set(['and', 'or', 'not']);

const FUNCTION_KEYWORDS = new Set([
  'sqrt', 'abs', 'min', 'max', 'round', 'floor', 'ceil', 'pow', 'log',
  'log2', 'log10', 'exp', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'atan2', 'hypot', 'sign', 'cbrt', 'trunc', 'expm1', 'log1p', 'fac',
  'if', 'random', 'length',
]);

const CONSTANT_KEYWORDS = new Set(['PI', 'E', 'true', 'false']);

const OPERATOR_DISPLAY: Record<string, string> = {
  '*': '\u00D7',
  '/': '\u00F7',
  '>=': '\u2265',
  '<=': '\u2264',
  '!=': '\u2260',
  '==': '=',
};

const TOKEN_PATTERNS: [RegExp, TokenType][] = [
  [/^\s+/, 'whitespace'],
  [/^\d+(\.\d+)?/, 'number'],
  [/^(>=|<=|==|!=)/, 'comparison'],
  [/^[><]/, 'comparison'],
  [/^[?:]/, 'ternary'],
  [/^[+\-*\/\^%,]/, 'operator'],
  [/^[()]/, 'paren'],
  [/^[a-zA-Z_]\w*/, 'unknown'], // classified later
];

export function tokenize(
  formula: string,
  variableCodigos: Map<string, AvailableVariable>,
): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  while (pos < formula.length) {
    let matched = false;

    for (const [pattern, baseType] of TOKEN_PATTERNS) {
      const match = formula.slice(pos).match(pattern);
      if (!match) continue;

      const value = match[0];
      let type: TokenType = baseType;
      let displayValue = OPERATOR_DISPLAY[value] ?? value;
      let variableTipo: Token['variableTipo'];

      // Classify identifiers
      if (baseType === 'unknown') {
        const lower = value.toLowerCase();
        if (variableCodigos.has(value)) {
          type = 'variable';
          const v = variableCodigos.get(value)!;
          displayValue = v.nombre;
          variableTipo = v.tipo;
        } else if (value === 'delta_t') {
          type = 'variable';
          displayValue = 'delta_t';
          variableTipo = 'SISTEMA';
        } else if (LOGIC_KEYWORDS.has(lower)) {
          type = 'logic';
          displayValue = value.toUpperCase();
        } else if (FUNCTION_KEYWORDS.has(value)) {
          type = 'function';
        } else if (CONSTANT_KEYWORDS.has(value)) {
          type = 'constant';
        }
        // else stays 'unknown'
      }

      tokens.push({
        type,
        value,
        displayValue,
        start: pos,
        end: pos + value.length,
        variableTipo,
      });

      pos += value.length;
      matched = true;
      break;
    }

    if (!matched) {
      // Skip unrecognized character
      tokens.push({
        type: 'unknown',
        value: formula[pos],
        displayValue: formula[pos],
        start: pos,
        end: pos + 1,
      });
      pos++;
    }
  }

  return tokens;
}
