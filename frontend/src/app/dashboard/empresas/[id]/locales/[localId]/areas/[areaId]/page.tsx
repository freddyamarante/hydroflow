'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
import { SectorForm, SectorFormValues } from '@/components/forms/sector-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Layers, Box, Pencil, Trash2, Plus, Eye } from 'lucide-react';

interface AreaDashboard {
  area: {
    id: string;
    nombre: string;
    localProductivoId: string;
    actividadProductiva: string | null;
    bounds: unknown;
    localProductivo: { id: string; nombre: string; bounds: unknown };
  };
  stats: {
    totalSectores: number;
    totalUnidades: number;
  };
  sectores: {
    id: string;
    nombre: string;
    tipo: string | null;
    unidadesCount: number;
    usuarioResponsable: { id: string; nombre: string } | null;
  }[];
  currentUserLocalRole: 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null;
}

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const localId = params.localId as string;
  const areaId = params.areaId as string;

  const [data, setData] = useState<AreaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresaName, setEmpresaName] = useState<string>('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localUsuarios, setLocalUsuarios] = useState<{ id: string; nombre: string; apellido?: string | null }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [areaRes, empresaRes, localUsersRes] = await Promise.all([
        api.get(`/api/areas/${areaId}/dashboard`),
        api.get(`/api/empresas/${empresaId}`),
        api.get(`/api/locales/${localId}/usuarios`).catch(() => ({ data: { items: [] } })),
      ]);
      setData(areaRes.data);
      setEmpresaName(empresaRes.data.razonSocial);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({
        id: u.usuarioId,
        nombre: u.nombre,
        apellido: u.apellido,
      })));
    } catch {
      setError('Error al cargar los datos del area');
    } finally {
      setLoading(false);
    }
  }, [areaId, empresaId, localId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleEditSubmit(values: AreaFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/areas/${areaId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar el area');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/areas/${areaId}`);
      router.push(`/dashboard/empresas/${empresaId}/locales/${localId}`);
    } catch {
      setError('Error al eliminar el area');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSector(values: SectorFormValues) {
    try {
      setSubmitting(true);
      await api.post('/api/sectores', { ...values, areaId });
      setSectorDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear el sector');
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

  const { area, stats, sectores, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';

  const basePath = `/dashboard/empresas/${empresaId}/locales/${localId}`;
  const areaBounds = area.bounds as GeoJSON.Polygon | null;
  const localBounds = area.localProductivo.bounds as GeoJSON.Polygon | null;

  const sectorColumns: ColumnDef<(typeof sectores)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
    {
      id: 'responsable',
      header: 'Responsable',
      accessorFn: (row) => row.usuarioResponsable?.nombre ?? '-',
    },
    {
      id: 'unidadesCount',
      header: 'Unidades',
      accessorFn: (row) => row.unidadesCount,
      className: 'text-center',
    },
  ];

  const sectorActions: RowAction<(typeof sectores)[0]>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (sector) =>
        router.push(`${basePath}/areas/${areaId}/sectores/${sector.id}`),
    },
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
              { label: area.localProductivo.nombre, href: basePath },
              { label: area.nombre, href: `${basePath}/areas/${areaId}` },
            ]}
          />
          <h2 className="text-3xl font-bold">{area.nombre}</h2>
          {area.actividadProductiva && (
            <p className="text-muted-foreground">{area.actividadProductiva}</p>
          )}
        </div>
        {canWrite && (
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
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsGrid className="lg:grid-cols-2">
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Sectores Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Sectores</h3>
          {canWrite && (
            <Button onClick={() => setSectorDialogOpen(true)}>
              <Plus className="size-4" />
              Nuevo Sector
            </Button>
          )}
        </div>
        <DataTable
          columns={sectorColumns}
          data={sectores}
          searchKey="nombre"
          searchPlaceholder="Buscar sectores..."
          emptyMessage="No hay sectores registrados."
          rowActions={sectorActions}
          onRowClick={(sector) =>
            router.push(`${basePath}/areas/${areaId}/sectores/${sector.id}`)
          }
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Area</DialogTitle>
            <DialogDescription>Modifica los datos del area.</DialogDescription>
          </DialogHeader>
          <AreaForm
            localProductivoId={localId}
            defaultValues={{
              nombre: area.nombre,
              localProductivoId: area.localProductivoId,
              actividadProductiva: area.actividadProductiva ?? '',
              bounds: areaBounds ?? undefined,
            }}
            parentBounds={localBounds}
            onSubmit={handleEditSubmit}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Area</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
              <strong>{area.nombre}</strong> y todos sus sectores y unidades.
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

      {/* New Sector Dialog */}
      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Sector</DialogTitle>
            <DialogDescription>
              Crea un nuevo sector en {area.nombre}.
            </DialogDescription>
          </DialogHeader>
          <SectorForm
            areaId={areaId}
            usuarios={localUsuarios}
            onSubmit={handleCreateSector}
            loading={submitting}
            parentBounds={areaBounds}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
