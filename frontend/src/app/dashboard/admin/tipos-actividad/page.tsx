'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface TipoActividad {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  _count?: {
    tiposUnidad: number;
  };
}

interface FormData {
  nombre: string;
  codigo: string;
  descripcion: string;
}

const emptyForm: FormData = {
  nombre: '',
  codigo: '',
  descripcion: '',
};

export default function TiposActividadPage() {
  const [tipos, setTipos] = useState<TipoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoActividad | null>(null);
  const [deletingTipo, setDeletingTipo] = useState<TipoActividad | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTipos() {
    try {
      setLoading(true);
      const res = await api.get('/api/tipos-actividad');
      setTipos(res.data);
    } catch {
      setError('Error al cargar tipos de actividad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTipos();
  }, []);

  function openCreateDialog() {
    setEditingTipo(null);
    setFormData(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(tipo: TipoActividad) {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      codigo: tipo.codigo,
      descripcion: tipo.descripcion ?? '',
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(tipo: TipoActividad) {
    setDeletingTipo(tipo);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!formData.codigo.trim()) {
      setError('El codigo es requerido');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim(),
        descripcion: formData.descripcion.trim() || undefined,
      };

      if (editingTipo) {
        await api.put(`/api/tipos-actividad/${editingTipo.id}`, payload);
      } else {
        await api.post('/api/tipos-actividad', payload);
      }

      setDialogOpen(false);
      fetchTipos();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Ya existe un tipo de actividad con ese codigo');
      } else {
        setError(editingTipo ? 'Error al actualizar tipo de actividad' : 'Error al crear tipo de actividad');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingTipo) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.delete(`/api/tipos-actividad/${deletingTipo.id}`);
      setDeleteDialogOpen(false);
      setDeletingTipo(null);
      fetchTipos();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('No se puede eliminar: tiene tipos de unidad asociados');
      } else {
        setError('Error al eliminar tipo de actividad');
      }
      setDeleteDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<TipoActividad>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'codigo', header: 'Codigo', accessorKey: 'codigo', sortable: true },
    {
      id: 'tiposUnidad',
      header: '# Tipos de Unidad',
      accessorFn: (row) => row._count?.tiposUnidad ?? 0,
      className: 'text-center',
    },
  ];

  const rowActions: RowAction<TipoActividad>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (tipo) => openEditDialog(tipo),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (tipo) => openDeleteDialog(tipo),
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuracion', href: '/dashboard/admin/tipos-actividad' },
          { label: 'Tipos de Actividad' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Tipos de Actividad</h2>
          <p className="text-muted-foreground mt-1">
            Administra los tipos de actividad productiva del sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Tipo
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={tipos}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay tipos de actividad registrados."
        rowActions={rowActions}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Actividad' : 'Nuevo Tipo de Actividad'}
            </DialogTitle>
            <DialogDescription>
              {editingTipo
                ? 'Modifica los datos del tipo de actividad.'
                : 'Ingresa los datos del nuevo tipo de actividad.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Acuicultura"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Codigo *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej: ACUICULTURA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripcion opcional del tipo de actividad"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingTipo ? 'Guardar Cambios' : 'Crear Tipo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Tipo de Actividad</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el tipo de actividad{' '}
              <strong>{deletingTipo?.nombre}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
