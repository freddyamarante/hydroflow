export type TipoVariable = 'SENSOR' | 'FIJA' | 'CALCULADA';

export interface AvailableVariable {
  codigo: string;
  nombre: string;
  unidad: string | null;
  tipo: TipoVariable;
}

export type TokenType =
  | 'variable'
  | 'number'
  | 'operator'
  | 'comparison'
  | 'logic'
  | 'function'
  | 'constant'
  | 'paren'
  | 'ternary'
  | 'unknown'
  | 'whitespace';

export interface Token {
  type: TokenType;
  value: string;
  displayValue: string;
  start: number;
  end: number;
  variableTipo?: TipoVariable | 'SISTEMA';
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  references: string[];
}

export interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  availableVariables: AvailableVariable[];
  currentVariableCodigo?: string;
  disabled?: boolean;
}
