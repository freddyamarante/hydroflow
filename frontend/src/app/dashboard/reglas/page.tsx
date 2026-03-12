'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { ReglaForm, ReglaFormValues } from '@/components/forms/regla-form';
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
import { Plus, Pencil, Trash2, ToggleLeft } from 'lucide-react';

interface Regla {
  id: string;
  nombre: string;
  variable: string;
  operador: string;
  compararCon: string | null;
  valorFijo: number | null;
  codigoEspecificacion: string | null;
  toleranciaPorcentaje: number | null;
  severidad: string;
  activa: boolean;
  unidadProduccionId: string;
  unidadProduccion?: { id: string; nombre: string };
  createdAt: string;
}

interface UnidadOption {
  id: string;
  nombre: string;
}

const severidadColors: Record<string, string> = {
  BAJA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  CRITICA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function ReglasPage() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [unidades, setUnidades] = useState<UnidadOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRegla, setEditingRegla] = useState<Regla | null>(null);
  const [deletingRegla, setDeletingRegla] = useState<Regla | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [reglasRes, unidadesRes] = await Promise.all([
        api.get('/api/reglas?limit=100'),
        api.get('/api/unidades?limit=100'),
      ]);
      setReglas(reglasRes.data.items);
      setUnidades(unidadesRes.data.items);
    } catch {
      setError('Error al cargar reglas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditingRegla(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(regla: Regla) {
    setEditingRegla(regla);
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ReglaFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        ...values,
        compararCon: values.compararCon || undefined,
        valorFijo: values.valorFijo ? parseFloat(values.valorFijo) : undefined,
        codigoEspecificacion: values.codigoEspecificacion || undefined,
        toleranciaPorcentaje: values.toleranciaPorcentaje ? parseFloat(values.toleranciaPorcentaje) : undefined,
      };
      if (editingRegla) {
        await api.put(`/api/reglas/${editingRegla.id}`, payload);
      } else {
        await api.post('/api/reglas', payload);
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      setError(editingRegla ? 'Error al actualizar regla' : 'Error al crear regla');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(regla: Regla) {
    try {
      await api.patch(`/api/reglas/${regla.id}/toggle`);
      fetchData();
    } catch {
      setError('Error al cambiar estado de la regla');
    }
  }

  async function handleDelete() {
    if (!deletingRegla) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/reglas/${deletingRegla.id}`);
      setDeleteDialogOpen(false);
      setDeletingRegla(null);
      fetchData();
    } catch {
      setError('Error al eliminar regla');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Regla>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'variable', header: 'Variable', accessorKey: 'variable' },
    { id: 'operador', header: 'Operador', accessorKey: 'operador' },
    {
      id: 'severidad',
      header: 'Severidad',
      accessorFn: (row) => row.severidad,
      cell: (row) => (
        <Badge className={severidadColors[row.severidad] ?? ''}>
          {row.severidad}
        </Badge>
      ),
    },
    {
      id: 'activa',
      header: 'Estado',
      accessorFn: (row) => (row.activa ? 'Activa' : 'Inactiva'),
      cell: (row) => (
        <Badge variant={row.activa ? 'default' : 'secondary'}>
          {row.activa ? 'Activa' : 'Inactiva'}
        </Badge>
      ),
    },
    {
      id: 'unidad',
      header: 'Unidad',
      accessorFn: (row) => row.unidadProduccion?.nombre ?? '-',
    },
  ];

  const rowActions: RowAction<Regla>[] = [
    {
      label: 'Activar/Desactivar',
      icon: <ToggleLeft className="size-4" />,
      onClick: (regla) => handleToggle(regla),
    },
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (regla) => openEditDialog(regla),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (regla) => {
        setDeletingRegla(regla);
        setDeleteDialogOpen(true);
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Reglas</h2>
          <p className="text-muted-foreground mt-1">
            Administra las reglas de alerta para las unidades de produccion
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nueva Regla
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={reglas}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay reglas registradas."
        rowActions={rowActions}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRegla ? 'Editar Regla' : 'Nueva Regla'}</DialogTitle>
            <DialogDescription>
              {editingRegla
                ? 'Modifica los datos de la regla.'
                : 'Ingresa los datos de la nueva regla.'}
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <ReglaForm
            defaultValues={
              editingRegla
                ? {
                    nombre: editingRegla.nombre,
                    unidadProduccionId: editingRegla.unidadProduccionId,
                    variable: editingRegla.variable,
                    operador: editingRegla.operador as any,
                    compararCon: editingRegla.compararCon ?? '',
                    valorFijo: editingRegla.valorFijo?.toString() ?? '',
                    codigoEspecificacion: editingRegla.codigoEspecificacion ?? '',
                    toleranciaPorcentaje: editingRegla.toleranciaPorcentaje?.toString() ?? '',
                    severidad: editingRegla.severidad as any,
                    activa: editingRegla.activa,
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
            <DialogTitle>Eliminar Regla</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la regla{' '}
              <strong>{deletingRegla?.nombre}</strong>.
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
