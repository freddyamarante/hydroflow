'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PresetKey = '10m' | '1h' | '6h' | '24h' | '7d';

export interface TimeRange {
  mode: 'live' | 'historical';
  preset: PresetKey;
  desde: Date;
  hasta: Date;
}

const PRESET_DURATIONS: Record<PresetKey, number> = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
};

const PRESET_LABELS: Record<PresetKey, string> = {
  '10m': '10 min',
  '1h': '1 hora',
  '6h': '6 horas',
  '24h': '24 horas',
  '7d': '7 dias',
};

const PRESET_LIMITS: Record<PresetKey, number> = {
  '10m': 100,
  '1h': 300,
  '6h': 500,
  '24h': 800,
  '7d': 1000,
};

export function getPresetLimit(preset: PresetKey): number {
  return PRESET_LIMITS[preset];
}

export function createLiveRange(): TimeRange {
  const now = new Date();
  return {
    mode: 'live',
    preset: '1h',
    desde: new Date(now.getTime() - PRESET_DURATIONS['1h']),
    hasta: now,
  };
}

export function createPresetRange(preset: PresetKey): TimeRange {
  const now = new Date();
  return {
    mode: 'historical',
    preset,
    desde: new Date(now.getTime() - PRESET_DURATIONS[preset]),
    hasta: now,
  };
}

function formatRangeLabel(desde: Date, hasta: Date, preset: PresetKey): string {
  const now = new Date();
  const isNearNow = Math.abs(hasta.getTime() - now.getTime()) < 60_000;

  if (isNearNow) {
    return `Ultimos ${PRESET_LABELS[preset]}`;
  }

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  if (preset === '7d' || preset === '24h') {
    return `${fmtDate(desde)} ${fmtTime(desde)} — ${fmtDate(hasta)} ${fmtTime(hasta)}`;
  }
  return `${fmtTime(desde)} — ${fmtTime(hasta)}`;
}

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const presets = useMemo(() => Object.keys(PRESET_LABELS) as PresetKey[], []);

  const handleLive = useCallback(() => {
    onChange(createLiveRange());
  }, [onChange]);

  const handlePreset = useCallback(
    (preset: PresetKey) => {
      onChange(createPresetRange(preset));
    },
    [onChange],
  );

  const navigate = useCallback(
    (direction: -1 | 1) => {
      const duration = PRESET_DURATIONS[value.preset];
      const shift = duration * 0.5 * direction;
      const newDesde = new Date(value.desde.getTime() + shift);
      const newHasta = new Date(value.hasta.getTime() + shift);

      // Don't allow navigating into the future
      const now = new Date();
      if (newHasta > now) {
        onChange(createPresetRange(value.preset));
        return;
      }

      onChange({
        mode: 'historical',
        preset: value.preset,
        desde: newDesde,
        hasta: newHasta,
      });
    },
    [value, onChange],
  );

  const canGoForward = useMemo(() => {
    if (value.mode === 'live') return false;
    const now = new Date();
    return value.hasta.getTime() < now.getTime() - 30_000;
  }, [value]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant={value.mode === 'live' ? 'default' : 'outline'}
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleLive}
        >
          <Radio className={cn('size-3', value.mode === 'live' && 'animate-pulse')} />
          En vivo
        </Button>

        <div className="bg-border mx-1 h-5 w-px" />

        {presets.map((preset) => (
          <Button
            key={preset}
            variant={
              value.mode === 'historical' && value.preset === preset
                ? 'default'
                : 'outline'
            }
            size="sm"
            className="h-8 text-xs"
            onClick={() => handlePreset(preset)}
          >
            {PRESET_LABELS[preset]}
          </Button>
        ))}
      </div>

      {value.mode === 'historical' && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="size-4" />
          </Button>

          <span className="text-muted-foreground min-w-[10rem] text-center text-xs">
            {formatRangeLabel(value.desde, value.hasta, value.preset)}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => navigate(1)}
            disabled={!canGoForward}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
