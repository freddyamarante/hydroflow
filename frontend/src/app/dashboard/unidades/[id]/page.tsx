'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useLecturasRealtime } from '@/hooks/use-lecturas-realtime';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { GaugeCard } from '@/components/dashboard/gauge-card';
import { LineChartCard } from '@/components/dashboard/line-chart-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Gauge, Waves, Droplets, Box } from 'lucide-react';

interface UnidadBasic {
  id: string;
  nombre: string;
  sectorId: string;
}

interface HierarchyInfo {
  sectorName: string;
  sectorId: string;
  localId: string;
  localName: string;
}

export default function UnidadRealtimePage() {
  const params = useParams();
  const unidadId = params.id as string;
  const [unidad, setUnidad] = useState<UnidadBasic | null>(null);
  const [hierarchy, setHierarchy] = useState<HierarchyInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const { latest, history, connected } = useLecturasRealtime(unidadId);

  useEffect(() => {
    const fetchUnidad = async () => {
      try {
        const response = await api.get(`/api/unidades/${unidadId}`);
        const data = response.data;
        setUnidad(data);

        if (data.sectorId) {
          try {
            const sectorRes = await api.get(`/api/sectores/${data.sectorId}/dashboard`);
            const sector = sectorRes.data.sector;
            setHierarchy({
              sectorName: sector.nombre,
              sectorId: sector.id,
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

  const localId = hierarchy?.localId;
  const localName = hierarchy?.localName;
  const sectorId = hierarchy?.sectorId;
  const sectorName = hierarchy?.sectorName;

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    ...(localId && localName
      ? [{ label: localName, href: `/dashboard/locales/${localId}` }]
      : []),
    ...(localId && sectorId && sectorName
      ? [{ label: sectorName, href: `/dashboard/locales/${localId}/sectores/${sectorId}` }]
      : []),
    { label: unidad?.nombre ?? 'Unidad', href: `/dashboard/unidades/${unidadId}` },
  ];

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
            Monitoreo en tiempo real
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

      {!valores ? (
        <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
          <p className="text-muted-foreground">Esperando datos...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <GaugeCard
              title="Velocidad"
              value={valores.velocidad ?? 0}
              unit="m/s"
              icon={Gauge}
              color="text-blue-500"
            />
            <GaugeCard
              title="Nivel"
              value={valores.nivel ?? 0}
              unit="m"
              icon={Waves}
              color="text-cyan-500"
            />
            <GaugeCard
              title="Flujo Instantaneo"
              value={valores.flujo_instantaneo ?? 0}
              unit="m3/h"
              icon={Droplets}
              color="text-teal-500"
            />
            <GaugeCard
              title="Volumen"
              value={valores.volumen ?? 0}
              unit="m3"
              icon={Box}
              color="text-indigo-500"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <LineChartCard
              title="Velocidad en el tiempo"
              data={historyValores}
              dataKey="velocidad"
              color="#3b82f6"
              unit="m/s"
            />
            <LineChartCard
              title="Flujo en el tiempo"
              data={historyValores}
              dataKey="flujo_instantaneo"
              color="#14b8a6"
              unit="m3/h"
            />
          </div>
        </>
      )}
    </div>
  );
}
