'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Area {
  id: string;
  nombre: string;
  actividadProductiva: string | null;
  localProductivoId: string;
  localProductivo?: { id: string; nombre: string };
  _count?: { sectores: number };
  createdAt: string;
}

interface Local {
  id: string;
  nombre: string;
}

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [deletingArea, setDeletingArea] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [areasRes, localesRes] = await Promise.all([
        api.get('/api/areas?limit=100'),
        api.get('/api/locales?limit=100'),
      ]);
      setAreas(areasRes.data.items);
      setLocales(localesRes.data.items);
    } catch {
      setError('Error al cargar areas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditingArea(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(area: Area) {
    setEditingArea(area);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: AreaFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      if (editingArea) {
        await api.put(`/api/areas/${editingArea.id}`, values);
      } else {
        await api.post('/api/areas', values);
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      setError(editingArea ? 'Error al actualizar area' : 'Error al crear area');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingArea) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/areas/${deletingArea.id}`);
      setDeleteDialogOpen(false);
      setDeletingArea(null);
      fetchData();
    } catch {
      setError('Error al eliminar area');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Area>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    {
      id: 'actividadProductiva',
      header: 'Actividad Productiva',
      accessorFn: (row) =>
        row.actividadProductiva ? (
          <Badge variant="outline">{row.actividadProductiva}</Badge>
        ) : (
          '-'
        ),
    },
    {
      id: 'local',
      header: 'Local Productivo',
      accessorFn: (row) => row.localProductivo?.nombre ?? '-',
      sortable: true,
    },
    {
      id: 'sectores',
      header: 'Sectores',
      accessorFn: (row) => row._count?.sectores ?? 0,
    },
  ];

  const rowActions: RowAction<Area>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (area) => openEditDialog(area),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (area) => {
        setDeletingArea(area);
        setDeleteDialogOpen(true);
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Areas</h2>
          <p className="text-muted-foreground mt-1">
            Administra las areas de los locales productivos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nueva Area
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={areas}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay areas registradas."
        rowActions={rowActions}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingArea ? 'Editar Area' : 'Nueva Area'}</DialogTitle>
            <DialogDescription>
              {editingArea
                ? 'Modifica los datos del area.'
                : 'Ingresa los datos de la nueva area.'}
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <AreaForm
            defaultValues={
              editingArea
                ? {
                    nombre: editingArea.nombre,
                    localProductivoId: editingArea.localProductivoId,
                    actividadProductiva: editingArea.actividadProductiva ?? '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            loading={submitting}
            locales={locales}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Area</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el area{' '}
              <strong>{deletingArea?.nombre}</strong> y todos sus sectores y unidades.
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
