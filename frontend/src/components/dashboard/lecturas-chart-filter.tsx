'use client';

import { Button } from '@/components/ui/button';

export type PeriodoKey = '24h' | '7d' | '30d';

const PERIODO_LABELS: Record<PeriodoKey, string> = {
  '24h': '24 horas',
  '7d': '7 dias',
  '30d': '30 dias',
};

interface LecturasChartFilterProps {
  value: PeriodoKey;
  onChange: (periodo: PeriodoKey) => void;
  loading?: boolean;
}

export function LecturasChartFilter({
  value,
  onChange,
  loading,
}: LecturasChartFilterProps) {
  const periodos = Object.keys(PERIODO_LABELS) as PeriodoKey[];

  return (
    <div className="flex items-center gap-1">
      {periodos.map((periodo) => (
        <Button
          key={periodo}
          variant={value === periodo ? 'default' : 'outline'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => onChange(periodo)}
          disabled={loading}
        >
          {PERIODO_LABELS[periodo]}
        </Button>
      ))}
    </div>
  );
}
