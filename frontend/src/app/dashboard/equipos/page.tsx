'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { EquipoForm, EquipoFormValues } from '@/components/forms/equipo-form';
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

interface Equipo {
  id: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  especificaciones: any;
  unidadProduccionId: string;
  unidadProduccion?: { id: string; nombre: string };
  createdAt: string;
}

interface UnidadOption {
  id: string;
  nombre: string;
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [unidades, setUnidades] = useState<UnidadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
  const [deletingEquipo, setDeletingEquipo] = useState<Equipo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [equiposRes, unidadesRes] = await Promise.all([
        api.get('/api/equipos?limit=100'),
        api.get('/api/unidades?limit=100'),
      ]);
      setEquipos(equiposRes.data.items);
      setUnidades(unidadesRes.data.items);
    } catch {
      setError('Error al cargar equipos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditingEquipo(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(equipo: Equipo) {
    setEditingEquipo(equipo);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: EquipoFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      if (editingEquipo) {
        await api.put(`/api/equipos/${editingEquipo.id}`, values);
      } else {
        await api.post('/api/equipos', values);
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      setError(editingEquipo ? 'Error al actualizar equipo' : 'Error al crear equipo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingEquipo) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/equipos/${deletingEquipo.id}`);
      setDeleteDialogOpen(false);
      setDeletingEquipo(null);
      fetchData();
    } catch {
      setError('Error al eliminar equipo');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Equipo>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
    {
      id: 'marca',
      header: 'Marca',
      accessorFn: (row) => row.marca ?? '-',
    },
    {
      id: 'modelo',
      header: 'Modelo',
      accessorFn: (row) => row.modelo ?? '-',
    },
    {
      id: 'unidad',
      header: 'Unidad',
      accessorFn: (row) => row.unidadProduccion?.nombre ?? '-',
    },
  ];

  const rowActions: RowAction<Equipo>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (equipo) => openEditDialog(equipo),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (equipo) => {
        setDeletingEquipo(equipo);
        setDeleteDialogOpen(true);
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Equipos</h2>
          <p className="text-muted-foreground mt-1">
            Administra los equipos de las unidades de produccion
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Equipo
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={equipos}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay equipos registrados."
        rowActions={rowActions}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}</DialogTitle>
            <DialogDescription>
              {editingEquipo
                ? 'Modifica los datos del equipo.'
                : 'Ingresa los datos del nuevo equipo.'}
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <EquipoForm
            defaultValues={
              editingEquipo
                ? {
                    nombre: editingEquipo.nombre,
                    tipo: editingEquipo.tipo,
                    marca: editingEquipo.marca ?? '',
                    modelo: editingEquipo.modelo ?? '',
                    especificaciones: editingEquipo.especificaciones,
                    unidadProduccionId: editingEquipo.unidadProduccionId,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            loading={submitting}
            unidades={unidades}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Equipo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el equipo{' '}
              <strong>{deletingEquipo?.nombre}</strong>.
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
