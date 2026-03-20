'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FormulaEditor } from '@/components/formula-editor';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Pencil, Trash2 } from 'lucide-react';

type TipoVariable = 'SENSOR' | 'FIJA' | 'CALCULADA';

interface Variable {
  id: string;
  nombre: string;
  codigo: string;
  unidad: string | null;
  tipo: TipoVariable;
  orden: number;
  formula: string | null;
  claveJson: string | null;
  valorPorDefecto: number | null;
  esVisibleEnDashboard: boolean;
  esVisibleEnMapa: boolean;
  iconoSugerido: string | null;
  colorSugerido: string | null;
  tipoUnidadProduccionId: string;
}

interface TipoUnidad {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  tipoActividadProductivaId: string;
  tipoActividadProductiva?: {
    id: string;
    nombre: string;
  };
  variables: Variable[];
}

interface FormData {
  nombre: string;
  codigo: string;
  unidad: string;
  tipo: TipoVariable;
  orden: string;
  formula: string;
  claveJson: string;
  valorPorDefecto: string;
  esVisibleEnDashboard: boolean;
  esVisibleEnMapa: boolean;
  iconoSugerido: string;
  colorSugerido: string;
}

const emptyForm: FormData = {
  nombre: '',
  codigo: '',
  unidad: '',
  tipo: 'SENSOR',
  orden: '',
  formula: '',
  claveJson: '',
  valorPorDefecto: '',
  esVisibleEnDashboard: true,
  esVisibleEnMapa: false,
  iconoSugerido: '',
  colorSugerido: '',
};

const tipoBadgeColors: Record<TipoVariable, string> = {
  SENSOR: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  FIJA: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  CALCULADA: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

export default function VariablesPage() {
  const params = useParams();
  const tipoUnidadId = params.id as string;

  const [tipoUnidad, setTipoUnidad] = useState<TipoUnidad | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<Variable | null>(null);
  const [deletingVariable, setDeletingVariable] = useState<Variable | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.get(`/api/tipos-unidad/${tipoUnidadId}`);
      const data = res.data;
      setTipoUnidad(data);
      // Sort variables by orden
      const sorted = [...(data.variables || [])].sort(
        (a: Variable, b: Variable) => a.orden - b.orden
      );
      setVariables(sorted);
    } catch {
      setError('Error al cargar tipo de unidad');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [tipoUnidadId]);

  function openCreateDialog() {
    setEditingVariable(null);
    const nextOrden = variables.length > 0
      ? Math.max(...variables.map((v) => v.orden)) + 1
      : 1;
    setFormData({ ...emptyForm, orden: String(nextOrden) });
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(variable: Variable) {
    setEditingVariable(variable);
    setFormData({
      nombre: variable.nombre,
      codigo: variable.codigo,
      unidad: variable.unidad ?? '',
      tipo: variable.tipo,
      orden: String(variable.orden),
      formula: variable.formula ?? '',
      claveJson: variable.claveJson ?? '',
      valorPorDefecto: variable.valorPorDefecto != null ? String(variable.valorPorDefecto) : '',
      esVisibleEnDashboard: variable.esVisibleEnDashboard,
      esVisibleEnMapa: variable.esVisibleEnMapa,
      iconoSugerido: variable.iconoSugerido ?? '',
      colorSugerido: variable.colorSugerido ?? '',
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(variable: Variable) {
    setDeletingVariable(variable);
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
    if (!formData.orden || isNaN(Number(formData.orden))) {
      setError('El orden debe ser un numero valido');
      return;
    }
    if (formData.tipo === 'CALCULADA' && !formData.formula.trim()) {
      setError('La formula es requerida para variables calculadas');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        nombre: formData.nombre.trim(),
        codigo: formData.codigo.trim(),
        unidad: formData.unidad.trim() || undefined,
        tipo: formData.tipo,
        orden: Number(formData.orden),
        esVisibleEnDashboard: formData.esVisibleEnDashboard,
        esVisibleEnMapa: formData.esVisibleEnMapa,
        iconoSugerido: formData.iconoSugerido.trim() || undefined,
        colorSugerido: formData.colorSugerido.trim() || undefined,
      };

      // Conditional fields based on tipo
      if (formData.tipo === 'SENSOR') {
        payload.claveJson = formData.claveJson.trim() || undefined;
        payload.formula = undefined;
        payload.valorPorDefecto = undefined;
      } else if (formData.tipo === 'FIJA') {
        payload.valorPorDefecto = formData.valorPorDefecto ? Number(formData.valorPorDefecto) : undefined;
        payload.formula = undefined;
        payload.claveJson = undefined;
      } else if (formData.tipo === 'CALCULADA') {
        payload.formula = formData.formula.trim();
        payload.claveJson = undefined;
        payload.valorPorDefecto = undefined;
      }

      if (editingVariable) {
        await api.put(`/api/variables/${editingVariable.id}`, payload);
      } else {
        await api.post(`/api/tipos-unidad/${tipoUnidadId}/variables`, payload);
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('Ya existe una variable con ese codigo en este tipo de unidad');
      } else {
        setError(editingVariable ? 'Error al actualizar variable' : 'Error al crear variable');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingVariable) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.delete(`/api/variables/${deletingVariable.id}`);
      setDeleteDialogOpen(false);
      setDeletingVariable(null);
      fetchData();
    } catch {
      setError('Error al eliminar variable');
      setDeleteDialogOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Variable>[] = [
    {
      id: 'orden',
      header: '#',
      accessorKey: 'orden',
      className: 'w-12 text-center',
    },
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'codigo', header: 'Codigo', accessorKey: 'codigo' },
    {
      id: 'tipo',
      header: 'Tipo',
      cell: (row) => (
        <Badge className={tipoBadgeColors[row.tipo]}>
          {row.tipo}
        </Badge>
      ),
    },
    {
      id: 'unidad',
      header: 'Unidad',
      accessorFn: (row) => row.unidad ?? '-',
    },
    {
      id: 'formula',
      header: 'Formula',
      accessorFn: (row) => {
        if (row.tipo === 'CALCULADA' && row.formula) return row.formula;
        if (row.tipo === 'FIJA' && row.valorPorDefecto != null) return `Valor: ${row.valorPorDefecto}`;
        if (row.tipo === 'SENSOR' && row.claveJson) return `JSON: ${row.claveJson}`;
        return '-';
      },
    },
  ];

  const rowActions: RowAction<Variable>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (variable) => openEditDialog(variable),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (variable) => openDeleteDialog(variable),
      variant: 'destructive',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tipoUnidad) {
    return (
      <div className="space-y-6">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Tipo de unidad no encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Configuracion', href: '/dashboard/admin/tipos-actividad' },
          { label: 'Tipos de Unidad', href: '/dashboard/admin/tipos-unidad' },
          { label: tipoUnidad.nombre },
          { label: 'Variables' },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Variables de {tipoUnidad.nombre}</h2>
          <p className="text-muted-foreground mt-1">
            Define las variables que se monitorean en este tipo de unidad
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nueva Variable
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
        data={variables}
        loading={false}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay variables definidas para este tipo de unidad."
        rowActions={rowActions}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={`max-h-[85vh] overflow-y-auto ${formData.tipo === 'CALCULADA' ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}>
          <DialogHeader>
            <DialogTitle>
              {editingVariable ? 'Editar Variable' : 'Nueva Variable'}
            </DialogTitle>
            <DialogDescription>
              {editingVariable
                ? 'Modifica la definicion de la variable.'
                : 'Define una nueva variable para este tipo de unidad.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Velocidad"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codigo">Codigo *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  placeholder="Ej: velocidad"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad</Label>
                <Input
                  id="unidad"
                  value={formData.unidad}
                  onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                  placeholder="Ej: m/s"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orden">Orden *</Label>
                <Input
                  id="orden"
                  type="number"
                  value={formData.orden}
                  onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(val) => setFormData({ ...formData, tipo: val as TipoVariable })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SENSOR">Sensor</SelectItem>
                  <SelectItem value="FIJA">Fija</SelectItem>
                  <SelectItem value="CALCULADA">Calculada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields based on tipo */}
            {formData.tipo === 'SENSOR' && (
              <div className="space-y-2">
                <Label htmlFor="claveJson">Clave JSON</Label>
                <Input
                  id="claveJson"
                  value={formData.claveJson}
                  onChange={(e) => setFormData({ ...formData, claveJson: e.target.value })}
                  placeholder="Dejar vacio si es igual al codigo"
                />
              </div>
            )}

            {formData.tipo === 'FIJA' && (
              <div className="space-y-2">
                <Label htmlFor="valorPorDefecto">Valor por Defecto</Label>
                <Input
                  id="valorPorDefecto"
                  type="number"
                  step="any"
                  value={formData.valorPorDefecto}
                  onChange={(e) => setFormData({ ...formData, valorPorDefecto: e.target.value })}
                  placeholder="Ej: 3.0"
                />
              </div>
            )}

            {formData.tipo === 'CALCULADA' && (
              <div className="space-y-2">
                <Label>Formula *</Label>
                <FormulaEditor
                  value={formData.formula}
                  onChange={(formula) => setFormData({ ...formData, formula })}
                  availableVariables={variables
                    .filter((v) => v.id !== editingVariable?.id)
                    .map((v) => ({
                      codigo: v.codigo,
                      nombre: v.nombre,
                      unidad: v.unidad,
                      tipo: v.tipo,
                    }))}
                  currentVariableCodigo={editingVariable?.codigo}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="iconoSugerido">Icono Sugerido</Label>
                <Input
                  id="iconoSugerido"
                  value={formData.iconoSugerido}
                  onChange={(e) => setFormData({ ...formData, iconoSugerido: e.target.value })}
                  placeholder="Ej: Gauge"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="colorSugerido">Color Sugerido</Label>
                <Input
                  id="colorSugerido"
                  value={formData.colorSugerido}
                  onChange={(e) => setFormData({ ...formData, colorSugerido: e.target.value })}
                  placeholder="Ej: #3B82F6"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="esVisibleEnDashboard"
                  checked={formData.esVisibleEnDashboard}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, esVisibleEnDashboard: checked === true })
                  }
                />
                <Label htmlFor="esVisibleEnDashboard" className="text-sm font-normal">
                  Visible en Dashboard
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="esVisibleEnMapa"
                  checked={formData.esVisibleEnMapa}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, esVisibleEnMapa: checked === true })
                  }
                />
                <Label htmlFor="esVisibleEnMapa" className="text-sm font-normal">
                  Visible en Mapa
                </Label>
              </div>
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
                {submitting ? 'Guardando...' : editingVariable ? 'Guardar Cambios' : 'Crear Variable'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Variable</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente la variable{' '}
              <strong>{deletingVariable?.nombre}</strong>.
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
