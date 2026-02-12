'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef } from '@/components/ui/data-table';
import { SectorForm, SectorFormValues } from '@/components/forms/sector-form';
import { UnidadForm, UnidadFormValues } from '@/components/forms/unidad-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Box, Pencil, Trash2, Plus } from 'lucide-react';

interface SectorDashboard {
  sector: {
    id: string;
    nombre: string;
    areaId: string;
    tipo: string | null;
    detalles: unknown;
    usuarioResponsableId: string | null;
    area: {
      id: string;
      nombre: string;
      localProductivo: { id: string; nombre: string };
    };
  };
  stats: {
    totalUnidades: number;
  };
  unidades: {
    id: string;
    nombre: string;
    topicMqtt: string;
    posicion: unknown;
    ultimaLectura: string | null;
  }[];
}

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const localId = params.localId as string;
  const areaId = params.areaId as string;
  const sectorId = params.sectorId as string;

  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresaName, setEmpresaName] = useState<string>('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadDialogOpen, setUnidadDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [sectorRes, empresaRes] = await Promise.all([
        api.get(`/api/sectores/${sectorId}/dashboard`),
        api.get(`/api/empresas/${empresaId}`),
      ]);
      setData(sectorRes.data);
      setEmpresaName(empresaRes.data.razonSocial);
    } catch {
      setError('Error al cargar los datos del sector');
    } finally {
      setLoading(false);
    }
  }, [sectorId, empresaId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleEditSubmit(values: SectorFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/sectores/${sectorId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar el sector');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/sectores/${sectorId}`);
      router.push(
        `/dashboard/empresas/${empresaId}/locales/${localId}/areas/${areaId}`
      );
    } catch {
      setError('Error al eliminar el sector');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateUnidad(values: UnidadFormValues) {
    try {
      setSubmitting(true);
      const payload: Record<string, unknown> = {
        nombre: values.nombre,
        sectorId,
        topicMqtt: values.topicMqtt,
      };
      if (values.anchoCanal) {
        payload.configuracion = { ancho_canal: values.anchoCanal };
      }
      await api.post('/api/unidades', payload);
      setUnidadDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear la unidad de producción');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { sector, stats, unidades } = data;

  const basePath = `/dashboard/empresas/${empresaId}/locales/${localId}`;

  const unidadColumns: ColumnDef<(typeof unidades)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'topicMqtt', header: 'Topic MQTT', accessorKey: 'topicMqtt' },
    {
      id: 'ultimaLectura',
      header: 'Última Lectura',
      accessorFn: (row) =>
        row.ultimaLectura
          ? new Date(row.ultimaLectura).toLocaleString('es-EC')
          : 'Sin lecturas',
    },
  ];

  const infoFields = [
    { label: 'Nombre', value: sector.nombre },
    { label: 'Tipo', value: sector.tipo },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Empresas', href: '/dashboard/empresas' },
              { label: empresaName, href: `/dashboard/empresas/${empresaId}` },
              { label: sector.area.localProductivo.nombre, href: basePath },
              { label: sector.area.nombre, href: `${basePath}/areas/${areaId}` },
              {
                label: sector.nombre,
                href: `${basePath}/areas/${areaId}/sectores/${sectorId}`,
              },
            ]}
          />
          <h2 className="text-3xl font-bold">{sector.nombre}</h2>
          {sector.tipo && (
            <p className="text-muted-foreground">Tipo: {sector.tipo}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsGrid className="lg:grid-cols-1 max-w-xs">
        <StatsCard icon={Box} label="Unidades de Producción" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Sector Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Sector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {infoFields.map(
              (field) =>
                field.value && (
                  <div key={field.label}>
                    <span className="text-muted-foreground">{field.label}</span>
                    <p className="font-medium">{field.value}</p>
                  </div>
                )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unidades Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Unidades de Producción</h3>
          <Button onClick={() => setUnidadDialogOpen(true)}>
            <Plus className="size-4" />
            Nueva Unidad
          </Button>
        </div>
        <DataTable
          columns={unidadColumns}
          data={unidades}
          searchKey="nombre"
          searchPlaceholder="Buscar unidades..."
          emptyMessage="No hay unidades de producción registradas."
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Sector</DialogTitle>
            <DialogDescription>Modifica los datos del sector.</DialogDescription>
          </DialogHeader>
          <SectorForm
            areaId={areaId}
            defaultValues={{
              nombre: sector.nombre,
              areaId: sector.areaId,
              tipo: sector.tipo ?? '',
              usuarioResponsableId: sector.usuarioResponsableId ?? '',
            }}
            onSubmit={handleEditSubmit}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Sector</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
              <strong>{sector.nombre}</strong> y todas sus unidades de producción.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Unidad Dialog */}
      <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Unidad de Producción</DialogTitle>
            <DialogDescription>
              Crea una nueva unidad de producción en {sector.nombre}.
            </DialogDescription>
          </DialogHeader>
          <UnidadForm
            sectorId={sectorId}
            onSubmit={handleCreateUnidad}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
