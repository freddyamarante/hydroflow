'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { LocalForm, LocalFormValues } from '@/components/forms/local-form';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
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
import { Map, Layers, Box, Pencil, Trash2, Plus, Eye } from 'lucide-react';

interface LocalDashboard {
  local: {
    id: string;
    nombre: string;
    tipoProductivo: string | null;
    empresaId: string;
    areaProduccion: string | null;
    direccion: string | null;
    ubicacionDomiciliaria: string | null;
    empresa: { id: string; razonSocial: string };
  };
  stats: {
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
  };
  areas: {
    id: string;
    nombre: string;
    actividadProductiva: string | null;
    sectoresCount: number;
  }[];
}

export default function LocalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const localId = params.localId as string;

  const [data, setData] = useState<LocalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/locales/${localId}/dashboard`);
      setData(res.data);
    } catch {
      setError('Error al cargar los datos del local');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleEditSubmit(values: LocalFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/locales/${localId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar el local');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/locales/${localId}`);
      router.push(`/dashboard/empresas/${empresaId}`);
    } catch {
      setError('Error al eliminar el local');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArea(values: AreaFormValues) {
    try {
      setSubmitting(true);
      await api.post('/api/areas', { ...values, localProductivoId: localId });
      setAreaDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear el área');
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

  const { local, stats, areas } = data;

  const areaColumns: ColumnDef<(typeof areas)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'actividadProductiva', header: 'Actividad Productiva', accessorKey: 'actividadProductiva' },
    {
      id: 'sectoresCount',
      header: 'Sectores',
      accessorFn: (row) => row.sectoresCount,
      className: 'text-center',
    },
  ];

  const areaActions: RowAction<(typeof areas)[0]>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (area) =>
        router.push(`/dashboard/empresas/${empresaId}/locales/${localId}/areas/${area.id}`),
    },
  ];

  const infoFields = [
    { label: 'Nombre', value: local.nombre },
    { label: 'Tipo Productivo', value: local.tipoProductivo },
    { label: 'Área de Producción', value: local.areaProduccion },
    { label: 'Dirección', value: local.direccion },
    { label: 'Ubicación', value: local.ubicacionDomiciliaria },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Empresas', href: '/dashboard/empresas' },
              { label: local.empresa.razonSocial, href: `/dashboard/empresas/${empresaId}` },
              { label: local.nombre, href: `/dashboard/empresas/${empresaId}/locales/${localId}` },
            ]}
          />
          <h2 className="text-3xl font-bold">{local.nombre}</h2>
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
      <StatsGrid className="lg:grid-cols-3">
        <StatsCard icon={Map} label="Áreas" value={stats.totalAreas} />
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Local Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Local</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
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

      {/* Areas Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Áreas</h3>
          <Button onClick={() => setAreaDialogOpen(true)}>
            <Plus className="size-4" />
            Nueva Área
          </Button>
        </div>
        <DataTable
          columns={areaColumns}
          data={areas}
          searchKey="nombre"
          searchPlaceholder="Buscar áreas..."
          emptyMessage="No hay áreas registradas."
          rowActions={areaActions}
          onRowClick={(area) =>
            router.push(`/dashboard/empresas/${empresaId}/locales/${localId}/areas/${area.id}`)
          }
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Local Productivo</DialogTitle>
            <DialogDescription>Modifica los datos del local productivo.</DialogDescription>
          </DialogHeader>
          <LocalForm
            empresaId={empresaId}
            defaultValues={{
              nombre: local.nombre,
              tipoProductivo: local.tipoProductivo ?? '',
              empresaId: local.empresaId,
              areaProduccion: local.areaProduccion ?? '',
              direccion: local.direccion ?? '',
              ubicacionDomiciliaria: local.ubicacionDomiciliaria ?? '',
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
            <DialogTitle>Eliminar Local Productivo</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
              <strong>{local.nombre}</strong> y todas sus áreas, sectores y unidades.
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

      {/* New Area Dialog */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Área</DialogTitle>
            <DialogDescription>
              Crea una nueva área en {local.nombre}.
            </DialogDescription>
          </DialogHeader>
          <AreaForm
            localProductivoId={localId}
            onSubmit={handleCreateArea}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
