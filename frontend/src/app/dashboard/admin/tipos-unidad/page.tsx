'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

interface TipoActividad {
  id: string;
  nombre: string;
  codigo: string;
}

interface TipoUnidad {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoActividadProductivaId: string;
  tipoActividadProductiva?: TipoActividad;
  _count?: {
    variables: number;
    unidadesProduccion: number;
  };
}

interface FormData {
  nombre: string;
  codigo: string;
  descripcion: string;
  tipoActividadProductivaId: string;
}

const emptyForm: FormData = {
  nombre: '',
  codigo: '',
  descripcion: '',
  tipoActividadProductivaId: '',
};

export default function TiposUnidadPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoUnidad[]>([]);
  const [actividades, setActividades] = useState<TipoActividad[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterActividadId, setFilterActividadId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoUnidad | null>(null);
  const [deletingTipo, setDeletingTipo] = useState<TipoUnidad | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      const [tiposRes, actividadesRes] = await Promise.all([
        api.get('/api/tipos-unidad', {
          params: filterActividadId !== 'all' ? { tipoActividadId: filterActividadId } : undefined,
        }),
        api.get('/api/tipos-actividad'),
      ]);
      setTipos(tiposRes.data);
      setActividades(actividadesRes.data);
    } catch {
      setError('Error al cargar tipos de unidad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [filterActividadId]);

  function openCreateDialog() {
    setEditingTipo(null);
    setFormData(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(tipo: TipoUnidad) {
    setEditingTipo(tipo);
    setFormData({
      nombre: tipo.nombre,
      codigo: tipo.codigo,
      descripcion: tipo.descripcion ?? '',
      tipoActividadProductivaId: tipo.tipoActividadProductivaId,
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(tipo: TipoUnidad) {
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
    if (!formData.tipoActividadProductivaId) {
      setError('El tipo de actividad es requerido');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        tipoActividadProductivaId: formData.tipoActividadProductivaId,
      };

      if (editingTipo) {
        await api.put(`/api/tipos-unidad/${editingTipo.id}`, payload);
      } else {
        await api.post('/api/tipos-unidad', payload);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Ya existe un tipo de unidad con ese codigo');
      } else {
        setError(editingTipo ? 'Error al actualizar tipo de unidad' : 'Error al crear tipo de unidad');
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
      await api.delete(`/api/tipos-unidad/${deletingTipo.id}`);
      setDeleteDialogOpen(false);
      setDeletingTipo(null);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('No se puede eliminar: tiene unidades de produccion asignadas');
      } else {
        setError('Error al eliminar tipo de unidad');
      }
      setDeleteDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<TipoUnidad>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'codigo', header: 'Codigo', accessorKey: 'codigo', sortable: true },
    {
      id: 'actividad',
      header: 'Actividad',
      accessorFn: (row) => row.tipoActividadProductiva ? (
        <Badge variant="outline">{row.tipoActividadProductiva.nombre}</Badge>
      ) : '-',
    },
    {
      id: 'variables',
      header: '# Variables',
      accessorFn: (row) => row._count?.variables ?? 0,
      className: 'text-center',
    },
    {
      id: 'unidades',
      header: '# Unidades',
      accessorFn: (row) => row._count?.unidadesProduccion ?? 0,
      className: 'text-center',
    },
  ];

  const rowActions: RowAction<TipoUnidad>[] = [
    {
      label: 'Ver Variables',
      icon: <Eye className="size-4" />,
      onClick: (tipo) => router.push(`/dashboard/admin/tipos-unidad/${tipo.id}/variables`),
    },
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
          { label: 'Tipos de Unidad' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Tipos de Unidad</h2>
          <p className="text-muted-foreground mt-1">
            Administra los tipos de unidad de produccion y sus variables
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

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm font-medium">Filtrar por actividad:</Label>
        <Select value={filterActividadId} onValueChange={setFilterActividadId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Todas las actividades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las actividades</SelectItem>
            {actividades.map((act) => (
              <SelectItem key={act.id} value={act.id}>
                {act.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={tipos}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay tipos de unidad registrados."
        rowActions={rowActions}
        onRowClick={(tipo) => router.push(`/dashboard/admin/tipos-unidad/${tipo.id}/variables`)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTipo ? 'Editar Tipo de Unidad' : 'Nuevo Tipo de Unidad'}
            </DialogTitle>
            <DialogDescription>
              {editingTipo
                ? 'Modifica los datos del tipo de unidad.'
                : 'Ingresa los datos del nuevo tipo de unidad.'}
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
                placeholder="Ej: Estacion de Bombeo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="codigo">Codigo *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                placeholder="Ej: ESTACION_BOMBEO"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoActividadProductivaId">Tipo de Actividad *</Label>
              <Select
                value={formData.tipoActividadProductivaId}
                onValueChange={(val) => setFormData({ ...formData, tipoActividadProductivaId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar actividad" />
                </SelectTrigger>
                <SelectContent>
                  {actividades.map((act) => (
                    <SelectItem key={act.id} value={act.id}>
                      {act.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripcion opcional del tipo de unidad"
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
            <DialogTitle>Eliminar Tipo de Unidad</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el tipo de unidad{' '}
              <strong>{deletingTipo?.nombre}</strong> y todas sus definiciones de variables.
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
