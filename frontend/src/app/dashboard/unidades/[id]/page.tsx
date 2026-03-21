'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useLecturasRealtime } from '@/hooks/use-lecturas-realtime';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { GaugeCard } from '@/components/dashboard/gauge-card';
import { LineChartCard } from '@/components/dashboard/line-chart-card';
import {
  TimeRangeFilter,
  createLiveRange,
  getPresetLimit,
  type TimeRange,
} from '@/components/dashboard/time-range-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gauge, Waves, Droplets, Box, Power, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---------------------------------------------------------------------------
// Icon / color lookup maps
// ---------------------------------------------------------------------------

const iconMap: Record<string, LucideIcon> = {
  Gauge,
  Waves,
  Droplets,
  Box,
  Power,
  Activity,
};

const colorMap: Record<string, string> = {
  blue: 'text-blue-500',
  cyan: 'text-cyan-500',
  teal: 'text-teal-500',
  indigo: 'text-indigo-500',
  green: 'text-green-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  purple: 'text-purple-500',
};

const hexColorMap: Record<string, string> = {
  blue: '#3b82f6',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  indigo: '#6366f1',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  purple: '#a855f7',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnidadBasic {
  id: string;
  nombre: string;
  sectorId: string;
  tipoUnidadProduccionId?: string | null;
}

interface HierarchyInfo {
  sectorName: string;
  sectorId: string;
  areaId: string;
  areaName: string;
  localId: string;
  localName: string;
}

interface VariableDefinition {
  codigo: string;
  nombre: string;
  unidad?: string | null;
  tipo: string;
  esVisibleEnDashboard: boolean;
  esVisibleEnMapa: boolean;
  iconoSugerido?: string | null;
  colorSugerido?: string | null;
  orden: number;
}

// ---------------------------------------------------------------------------
// Fallback: render raw valores keys as simple cards
// ---------------------------------------------------------------------------

function RawValoresCards({ valores }: { valores: Record<string, any> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Object.entries(valores)
        .filter(([_, v]) => v != null)
        .map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </CardTitle>
              <Gauge className="h-5 w-5 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {typeof value === 'boolean'
                  ? value
                    ? 'Si'
                    : 'No'
                  : typeof value === 'number'
                    ? value.toFixed(2)
                    : String(value)}
              </div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function UnidadRealtimePage() {
  const params = useParams();
  const unidadId = params.id as string;
  const [unidad, setUnidad] = useState<UnidadBasic | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyInfo | null>(null);
  const [variables, setVariables] = useState<VariableDefinition[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(createLiveRange);

  const timeRangeOptions = useMemo(
    () => ({
      mode: timeRange.mode,
      desde: timeRange.desde,
      hasta: timeRange.hasta,
      limit: timeRange.mode === 'historical' ? getPresetLimit(timeRange.preset) : undefined,
    }),
    [timeRange],
  );

  const { latest, history, connected, loading: loadingReadings } =
    useLecturasRealtime(unidadId, timeRangeOptions);

  useEffect(() => {
    const fetchUnidad = async () => {
      try {
        const response = await api.get(`/api/unidades/${unidadId}`);
        const data = response.data;
        setUnidad(data);

        // Fetch variable definitions from the unit type
        if (data.tipoUnidadProduccionId) {
          try {
            const tipoRes = await api.get(
              `/api/tipos-unidad/${data.tipoUnidadProduccionId}`,
            );
            const tipoData = tipoRes.data;
            if (tipoData.variables && Array.isArray(tipoData.variables)) {
              setVariables(
                [...tipoData.variables].sort(
                  (a: VariableDefinition, b: VariableDefinition) =>
                    a.orden - b.orden,
                ),
              );
            }
          } catch {
            // Variable definitions are optional — fall back to raw rendering
          }
        }

        if (data.sectorId) {
          try {
            const sectorRes = await api.get(`/api/sectores/${data.sectorId}/dashboard`);
            const sector = sectorRes.data.sector;
            setHierarchy({
              sectorName: sector.nombre,
              sectorId: sector.id,
              areaId: sector.area.id,
              areaName: sector.area.nombre,
              localId: sector.area.localProductivo.id,
              localName: sector.area.localProductivo.nombre,
            });
          } catch {
            // Hierarchy info is optional for display
          }
        }
      } catch (error) {
        console.error('Error fetching unidad:', error);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchUnidad();
  }, [unidadId]);

  const valores = latest?.valores;
  const historyValores = history.map((item) => ({
    ...item.valores,
    timestamp: item.timestamp,
  }));

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    ...(hierarchy?.localId
      ? [{ label: hierarchy.localName, href: `/dashboard/locales/${hierarchy.localId}` }]
      : []),
    ...(hierarchy?.areaId
      ? [{ label: hierarchy.areaName, href: `/dashboard/locales/${hierarchy.localId}/areas/${hierarchy.areaId}` }]
      : []),
    ...(hierarchy?.sectorId
      ? [{ label: hierarchy.sectorName, href: `/dashboard/locales/${hierarchy.localId}/areas/${hierarchy.areaId}/sectores/${hierarchy.sectorId}` }]
      : []),
    { label: unidad?.nombre ?? 'Unidad' },
  ];

  // Dashboard-visible variables for gauge cards
  const dashboardVars = variables.filter((v) => v.esVisibleEnDashboard);

  // Numeric dashboard-visible variables for line charts (exclude booleans / fixed)
  const chartVars = variables.filter(
    (v) =>
      v.esVisibleEnDashboard &&
      v.tipo !== 'FIJA' &&
      v.codigo !== 'bomba_encendida',
  );

  if (loadingInfo) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">{unidad?.nombre ?? 'Unidad'}</h2>
          <p className="text-muted-foreground mt-1">
            {timeRange.mode === 'live'
              ? 'Monitoreo en tiempo real'
              : 'Datos historicos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className="text-sm text-muted-foreground">
            {connected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </div>

      <TimeRangeFilter value={timeRange} onChange={setTimeRange} />

      {loadingReadings && (
        <div className="flex items-center justify-center h-16">
          <p className="text-muted-foreground text-sm animate-pulse">Cargando lecturas...</p>
        </div>
      )}

      {!valores && !loadingReadings ? (
        <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
          <p className="text-muted-foreground">Esperando datos...</p>
        </div>
      ) : dashboardVars.length > 0 ? (
        <>
          {/* Dynamic gauge cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboardVars.map((v) => (
              <GaugeCard
                key={v.codigo}
                title={v.nombre}
                value={valores?.[v.codigo] ?? 0}
                unit={v.unidad || ''}
                icon={iconMap[v.iconoSugerido || ''] || Gauge}
                color={colorMap[v.colorSugerido || ''] || 'text-gray-500'}
              />
            ))}
          </div>

          {/* Dynamic line charts */}
          {chartVars.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {chartVars.map((v) => (
                <LineChartCard
                  key={v.codigo}
                  title={`${v.nombre} en el tiempo`}
                  data={historyValores}
                  dataKey={v.codigo}
                  color={hexColorMap[v.colorSugerido || ''] || '#6b7280'}
                  unit={v.unidad || ''}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Fallback: no variable definitions — show raw valores */
        <RawValoresCards valores={valores} />
      )}
    </div>
  );
}
