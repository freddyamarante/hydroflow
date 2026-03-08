'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Sector {
  id: string;
  nombre: string;
  tipo: string | null;
  areaId: string;
  area?: {
    id: string;
    nombre: string;
    localProductivo?: { id: string; nombre: string };
  };
  _count?: { unidadesProduccion: number };
  createdAt: string;
}

interface AreaOption {
  id: string;
  nombre: string;
}

export default function SectoresPage() {
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [areas, setAreas] = useState<AreaOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [deletingSector, setDeletingSector] = useState<Sector | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [sectoresRes, areasRes] = await Promise.all([
        api.get('/api/sectores?limit=100'),
        api.get('/api/areas?limit=100'),
      ]);
      setSectores(sectoresRes.data.items);
      setAreas(areasRes.data.items);
    } catch {
      setError('Error al cargar sectores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditingSector(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(sector: Sector) {
    setEditingSector(sector);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: SectorFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      if (editingSector) {
        await api.put(`/api/sectores/${editingSector.id}`, values);
      } else {
        await api.post('/api/sectores', values);
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      setError(editingSector ? 'Error al actualizar sector' : 'Error al crear sector');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingSector) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/sectores/${deletingSector.id}`);
      setDeleteDialogOpen(false);
      setDeletingSector(null);
      fetchData();
    } catch {
      setError('Error al eliminar sector');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Sector>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    {
      id: 'tipo',
      header: 'Tipo',
      accessorFn: (row) => row.tipo ?? '-',
    },
    {
      id: 'area',
      header: 'Area',
      accessorFn: (row) => row.area?.nombre ?? '-',
      sortable: true,
    },
    {
      id: 'local',
      header: 'Local',
      accessorFn: (row) => row.area?.localProductivo?.nombre ?? '-',
    },
    {
      id: 'unidades',
      header: 'Unidades',
      accessorFn: (row) => row._count?.unidadesProduccion ?? 0,
    },
  ];

  const rowActions: RowAction<Sector>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (sector) => openEditDialog(sector),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (sector) => {
        setDeletingSector(sector);
        setDeleteDialogOpen(true);
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Sectores</h2>
          <p className="text-muted-foreground mt-1">
            Administra los sectores de las areas productivas
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Sector
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={sectores}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay sectores registrados."
        rowActions={rowActions}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSector ? 'Editar Sector' : 'Nuevo Sector'}</DialogTitle>
            <DialogDescription>
              {editingSector
                ? 'Modifica los datos del sector.'
                : 'Ingresa los datos del nuevo sector.'}
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <SectorForm
            defaultValues={
              editingSector
                ? {
                    nombre: editingSector.nombre,
                    areaId: editingSector.areaId,
                    tipo: editingSector.tipo ?? '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            loading={submitting}
            areas={areas}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Sector</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el sector{' '}
              <strong>{deletingSector?.nombre}</strong> y todas sus unidades.
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
    </div>
  );
}
