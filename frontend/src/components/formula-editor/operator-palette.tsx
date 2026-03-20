'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OperatorDef {
  label: string;
  insert: string;
  tooltip: string;
}

const sections: { title: string; ops: OperatorDef[] }[] = [
  {
    title: 'Aritmeticos',
    ops: [
      { label: '+', insert: ' + ', tooltip: 'Suma' },
      { label: '\u2212', insert: ' - ', tooltip: 'Resta' },
      { label: '\u00D7', insert: ' * ', tooltip: 'Multiplicacion' },
      { label: '\u00F7', insert: ' / ', tooltip: 'Division' },
      { label: '^', insert: ' ^ ', tooltip: 'Potencia' },
      { label: '(', insert: '(', tooltip: 'Abrir parentesis' },
      { label: ')', insert: ')', tooltip: 'Cerrar parentesis' },
    ],
  },
  {
    title: 'Comparacion',
    ops: [
      { label: '>', insert: ' > ', tooltip: 'Mayor que' },
      { label: '<', insert: ' < ', tooltip: 'Menor que' },
      { label: '\u2265', insert: ' >= ', tooltip: 'Mayor o igual' },
      { label: '\u2264', insert: ' <= ', tooltip: 'Menor o igual' },
      { label: '=', insert: ' == ', tooltip: 'Igual a' },
      { label: '\u2260', insert: ' != ', tooltip: 'Diferente de' },
    ],
  },
  {
    title: 'Logica',
    ops: [
      { label: 'AND', insert: ' and ', tooltip: 'Y logico' },
      { label: 'OR', insert: ' or ', tooltip: 'O logico' },
      { label: 'NOT', insert: 'not ', tooltip: 'Negacion' },
    ],
  },
  {
    title: 'Funciones',
    ops: [
      { label: '\u221A', insert: 'sqrt(', tooltip: 'Raiz cuadrada' },
      { label: '|x|', insert: 'abs(', tooltip: 'Valor absoluto' },
      { label: 'min', insert: 'min(', tooltip: 'Minimo de dos valores: min(a, b)' },
      { label: 'max', insert: 'max(', tooltip: 'Maximo de dos valores: max(a, b)' },
      { label: 'round', insert: 'round(', tooltip: 'Redondear al entero mas cercano' },
      { label: 'floor', insert: 'floor(', tooltip: 'Redondear hacia abajo' },
      { label: 'ceil', insert: 'ceil(', tooltip: 'Redondear hacia arriba' },
      { label: 'pow', insert: 'pow(', tooltip: 'Potencia: pow(base, exp)' },
      { label: 'if', insert: 'if(', tooltip: 'Condicional: if(cond, si_verdadero, si_falso)' },
      { label: '\u03C0', insert: 'PI', tooltip: 'Constante Pi (3.14159...)' },
    ],
  },
];

interface OperatorPaletteProps {
  onInsert: (text: string) => void;
}

export function OperatorPalette({ onInsert }: OperatorPaletteProps) {
  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs font-medium">Operadores</span>
      <div className="bg-muted/20 border-border space-y-2.5 rounded-lg border p-3">
        <TooltipProvider delayDuration={300}>
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <span className="text-muted-foreground/70 text-[11px] font-medium uppercase tracking-wider">
                {section.title}
              </span>
              <div className="flex flex-wrap gap-1">
                {section.ops.map((op) => (
                  <Tooltip key={op.label}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 min-w-[2rem] px-2 font-mono text-xs"
                        onClick={() => onInsert(op.insert)}
                      >
                        {op.label}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {op.tooltip}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
