'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  MapPin,
  Box,
  Cpu,
  Users,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { StatsCard } from '@/components/dashboard/stats-card';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { LineChartCard } from '@/components/dashboard/line-chart-card';
import { LecturasChartFilter, type PeriodoKey } from '@/components/dashboard/lecturas-chart-filter';
import { DataTable, type ColumnDef } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminStats {
  totalEmpresas: number;
  totalLocales: number;
  totalUnidades: number;
  totalEquipos: number;
  totalUsuarios: number;
  totalLecturas: number;
  lecturasHoy: number;
  alertasActivas: number;
}

interface Alert {
  id: string;
  tipo: string;
  mensaje: string;
  severidad: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  creadoEn: string;
  unidadProduccion?: {
    nombre: string;
  };
}

interface LecturaStat {
  timestamp: string;
  count: number;
}

const severityVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  BAJA: 'secondary',
  MEDIA: 'outline',
  ALTA: 'default',
  CRITICA: 'destructive',
};

const alertColumns: ColumnDef<Alert>[] = [
  {
    id: 'severidad',
    header: 'Severidad',
    accessorFn: (row) => (
      <Badge variant={severityVariant[row.severidad] ?? 'outline'}>
        {row.severidad}
      </Badge>
    ),
  },
  {
    id: 'tipo',
    header: 'Tipo',
    accessorKey: 'tipo',
    sortable: true,
  },
  {
    id: 'mensaje',
    header: 'Mensaje',
    accessorKey: 'mensaje',
  },
  {
    id: 'unidad',
    header: 'Unidad',
    accessorFn: (row) => row.unidadProduccion?.nombre ?? '-',
  },
  {
    id: 'fecha',
    header: 'Fecha',
    accessorFn: (row) => {
      try {
        return new Date(row.creadoEn).toLocaleString('es', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
      } catch {
        return row.creadoEn;
      }
    },
    sortable: true,
  },
];

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lecturasStats, setLecturasStats] = useState<LecturaStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [periodo, setPeriodo] = useState<PeriodoKey>('24h');
  const [error, setError] = useState<string | null>(null);

  const fetchLecturasStats = useCallback(async (p: PeriodoKey) => {
    setLoadingChart(true);
    try {
      const res = await api.get('/api/admin/lecturas-stats', { params: { periodo: p } });
      setLecturasStats(res.data.data ?? []);
    } catch {
      // silent — chart just won't update
    } finally {
      setLoadingChart(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, alertsRes, lecturasRes] = await Promise.all([
          api.get('/api/admin/stats'),
          api.get('/api/admin/alerts', { params: { limit: 10 } }),
          api.get('/api/admin/lecturas-stats', { params: { periodo } }),
        ]);

        setStats(statsRes.data);
        setAlerts(alertsRes.data.items ?? []);
        setLecturasStats(lecturasRes.data.data ?? []);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? 'Error al cargar datos del panel');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handlePeriodoChange = useCallback(
    (p: PeriodoKey) => {
      setPeriodo(p);
      fetchLecturasStats(p);
    },
    [fetchLecturasStats],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-2 h-5 w-96" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <XCircle className="text-destructive mx-auto mb-2 size-8" />
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Panel de Administracion</h2>
        <p className="text-muted-foreground mt-1">
          Vista general del sistema HydroFlow
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <StatsGrid>
          <StatsCard
            icon={Building2}
            label="Empresas"
            value={stats.totalEmpresas}
            href="/dashboard/empresas"
          />
          <StatsCard
            icon={MapPin}
            label="Locales Productivos"
            value={stats.totalLocales}
          />
          <StatsCard
            icon={Box}
            label="Unidades de Produccion"
            value={stats.totalUnidades}
          />
          <StatsCard
            icon={Cpu}
            label="Equipos"
            value={stats.totalEquipos}
          />
          <StatsCard
            icon={Users}
            label="Usuarios"
            value={stats.totalUsuarios}
          />
          <StatsCard
            icon={Activity}
            label="Lecturas Totales"
            value={stats.totalLecturas.toLocaleString()}
          />
          <StatsCard
            icon={BarChart3}
            label="Lecturas Hoy"
            value={stats.lecturasHoy.toLocaleString()}
          />
          <StatsCard
            icon={AlertTriangle}
            label="Alertas Activas"
            value={stats.alertasActivas}
          />
        </StatsGrid>
      )}

      {/* Lecturas Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Lecturas en el tiempo</h3>
          <LecturasChartFilter
            value={periodo}
            onChange={handlePeriodoChange}
            loading={loadingChart}
          />
        </div>
        {loadingChart ? (
          <Skeleton className="h-72 rounded-xl" />
        ) : lecturasStats.length > 0 ? (
          <LineChartCard
            title={`Lecturas (ultimos ${periodo === '24h' ? '24 horas' : periodo === '7d' ? '7 dias' : '30 dias'})`}
            data={lecturasStats}
            dataKey="count"
            color="#3b82f6"
            unit="lecturas"
          />
        ) : (
          <div className="flex h-72 items-center justify-center rounded-lg border border-dashed">
            <p className="text-muted-foreground text-sm">Sin datos para este periodo</p>
          </div>
        )}
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5" />
            Alertas Recientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={alertColumns}
            data={alerts}
            loading={false}
            emptyMessage="No hay alertas activas."
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="size-5" />
            Estado del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="size-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">API Backend</p>
                <p className="text-muted-foreground text-xs">Operativo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <CheckCircle2 className="size-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">Base de Datos</p>
                <p className="text-muted-foreground text-xs">Conectada</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <Clock className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">MQTT Broker</p>
                <p className="text-muted-foreground text-xs">
                  {stats ? `${stats.lecturasHoy} lecturas hoy` : 'Sin datos'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
