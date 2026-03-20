'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AvailableVariable, TipoVariable } from './types';

const chipStyles: Record<TipoVariable | 'SISTEMA', string> = {
  SENSOR: 'bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25 hover:border-blue-500/50',
  FIJA: 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50',
  CALCULADA: 'bg-purple-500/15 text-purple-300 border-purple-500/30 hover:bg-purple-500/25 hover:border-purple-500/50',
  SISTEMA: 'bg-teal-500/15 text-teal-300 border-teal-500/30 hover:bg-teal-500/25 hover:border-teal-500/50',
};

const sectionLabels: Record<string, string> = {
  SENSOR: 'Sensores',
  FIJA: 'Fijas',
  CALCULADA: 'Calculadas',
  SISTEMA: 'Sistema',
};

interface VariablePaletteProps {
  variables: AvailableVariable[];
  currentVariableCodigo?: string;
  onInsert: (text: string) => void;
}

export function VariablePalette({
  variables,
  currentVariableCodigo,
  onInsert,
}: VariablePaletteProps) {
  // Filter out current variable to prevent self-reference
  const filtered = variables.filter((v) => v.codigo !== currentVariableCodigo);

  // Group by type
  const groups: Record<string, AvailableVariable[]> = {};
  for (const v of filtered) {
    (groups[v.tipo] ??= []).push(v);
  }

  // Always add delta_t in SISTEMA group
  const systemVars: AvailableVariable[] = [
    { codigo: 'delta_t', nombre: 'delta_t', unidad: 's', tipo: 'SENSOR' },
  ];

  const orderedSections: [string, AvailableVariable[]][] = [];
  if (groups.SENSOR?.length) orderedSections.push(['SENSOR', groups.SENSOR]);
  if (groups.FIJA?.length) orderedSections.push(['FIJA', groups.FIJA]);
  if (groups.CALCULADA?.length) orderedSections.push(['CALCULADA', groups.CALCULADA]);
  orderedSections.push(['SISTEMA', systemVars]);

  return (
    <div className="space-y-2">
      <span className="text-muted-foreground text-xs font-medium">
        Variables disponibles
      </span>
      <div className="bg-muted/20 border-border space-y-2.5 rounded-lg border p-3">
        <TooltipProvider delayDuration={300}>
          {orderedSections.map(([tipo, vars]) => (
            <div key={tipo} className="space-y-1">
              <span className="text-muted-foreground/70 text-[11px] font-medium uppercase tracking-wider">
                {sectionLabels[tipo]}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {vars.map((v) => {
                  const style = tipo === 'SISTEMA' ? chipStyles.SISTEMA : chipStyles[v.tipo];
                  return (
                    <Tooltip key={v.codigo}>
                      <TooltipTrigger asChild>
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => onInsert(v.codigo)}
                          className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs transition-colors cursor-pointer',
                            style,
                          )}
                        >
                          {v.nombre}
                          {v.unidad && (
                            <span className="text-[10px] opacity-60">{v.unidad}</span>
                          )}
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <span className="font-mono">{v.codigo}</span>
                        {tipo === 'SISTEMA' && (
                          <span className="text-muted-foreground ml-1">
                            — Segundos desde la ultima lectura
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}
