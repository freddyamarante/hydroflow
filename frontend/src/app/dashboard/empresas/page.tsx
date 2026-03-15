'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

interface Empresa {
  id: string;
  razonSocial: string;
  marcaComercial: string | null;
  ruc: string | null;
  actividadEconomica: string | null;
  telefono: string | null;
  direccion: string | null;
  ubicacionDomiciliaria: string | null;
  areaProduccion: string | null;
  paginaWeb: string | null;
  grupoCorporativoId: string | null;
  grupoCorporativo?: { id: string; razonSocial: string } | null;
  _count?: {
    localesProductivos: number;
  };
}

interface EmpresaFormData {
  razonSocial: string;
  marcaComercial: string;
  ruc: string;
  actividadEconomica: string;
  telefono: string;
  direccion: string;
  ubicacionDomiciliaria: string;
  areaProduccion: string;
  paginaWeb: string;
}

const emptyForm: EmpresaFormData = {
  razonSocial: '',
  marcaComercial: '',
  ruc: '',
  actividadEconomica: '',
  telefono: '',
  direccion: '',
  ubicacionDomiciliaria: '',
  areaProduccion: '',
  paginaWeb: '',
};

export default function EmpresasPage() {
  const router = useRouter();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [deletingEmpresa, setDeletingEmpresa] = useState<Empresa | null>(null);
  const [formData, setFormData] = useState<EmpresaFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchEmpresas() {
    try {
      setLoading(true);
      const res = await api.get('/api/empresas');
      setEmpresas(res.data.items);
    } catch {
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEmpresas();
  }, []);

  function openCreateDialog() {
    setEditingEmpresa(null);
    setFormData(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(empresa: Empresa) {
    setEditingEmpresa(empresa);
    setFormData({
      razonSocial: empresa.razonSocial,
      marcaComercial: empresa.marcaComercial ?? '',
      ruc: empresa.ruc ?? '',
      actividadEconomica: empresa.actividadEconomica ?? '',
      telefono: empresa.telefono ?? '',
      direccion: empresa.direccion ?? '',
      ubicacionDomiciliaria: empresa.ubicacionDomiciliaria ?? '',
      areaProduccion: empresa.areaProduccion ?? '',
      paginaWeb: empresa.paginaWeb ?? '',
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(empresa: Empresa) {
    setDeletingEmpresa(empresa);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.razonSocial.trim()) {
      setError('La razón social es requerida');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        razonSocial: formData.razonSocial.trim(),
        marcaComercial: formData.marcaComercial.trim() || undefined,
        ruc: formData.ruc.trim() || undefined,
        actividadEconomica: formData.actividadEconomica.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        ubicacionDomiciliaria: formData.ubicacionDomiciliaria.trim() || undefined,
        areaProduccion: formData.areaProduccion.trim() || undefined,
        paginaWeb: formData.paginaWeb.trim() || undefined,
      };

      if (editingEmpresa) {
        await api.put(`/api/empresas/${editingEmpresa.id}`, payload);
      } else {
        await api.post('/api/empresas', payload);
      }

      setDialogOpen(false);
      fetchEmpresas();
    } catch {
      setError(editingEmpresa ? 'Error al actualizar empresa' : 'Error al crear empresa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingEmpresa) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/empresas/${deletingEmpresa.id}`);
      setDeleteDialogOpen(false);
      setDeletingEmpresa(null);
      fetchEmpresas();
    } catch {
      setError('Error al eliminar empresa');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Empresa>[] = [
    {
      id: 'razonSocial',
      header: 'Razón Social',
      accessorKey: 'razonSocial',
      sortable: true,
    },
    {
      id: 'marcaComercial',
      header: 'Marca Comercial',
      accessorKey: 'marcaComercial',
      sortable: true,
    },
    {
      id: 'ruc',
      header: 'RUC',
      accessorKey: 'ruc',
    },
    {
      id: 'grupo',
      header: 'Grupo Corporativo',
      accessorFn: (row) => row.grupoCorporativo ? (
        <Badge variant="outline">{row.grupoCorporativo.razonSocial}</Badge>
      ) : '-',
    },
    {
      id: 'locales',
      header: 'Locales',
      accessorFn: (row) => row._count?.localesProductivos ?? 0,
      className: 'text-center',
    },
  ];

  const rowActions: RowAction<Empresa>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (empresa) => router.push(`/dashboard/empresas/${empresa.id}`),
    },
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (empresa) => openEditDialog(empresa),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (empresa) => openDeleteDialog(empresa),
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Empresas</h2>
          <p className="text-muted-foreground mt-1">
            Administra las empresas registradas en el sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nueva Empresa
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
        data={empresas}
        loading={loading}
        searchKey="razonSocial"
        searchPlaceholder="Buscar por razón social..."
        emptyMessage="No hay empresas registradas."
        rowActions={rowActions}
        onRowClick={(empresa) => router.push(`/dashboard/empresas/${empresa.id}`)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEmpresa ? 'Editar Empresa' : 'Nueva Empresa'}
            </DialogTitle>
            <DialogDescription>
              {editingEmpresa
                ? 'Modifica los datos de la empresa.'
                : 'Ingresa los datos de la nueva empresa.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Ej: Produmar S.A."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marcaComercial">Marca Comercial</Label>
                <Input
                  id="marcaComercial"
                  value={formData.marcaComercial}
                  onChange={(e) => setFormData({ ...formData, marcaComercial: e.target.value })}
                  placeholder="Nombre comercial"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ruc">RUC</Label>
                <Input
                  id="ruc"
                  value={formData.ruc}
                  onChange={(e) => setFormData({ ...formData, ruc: e.target.value })}
                  placeholder="Número de RUC"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="actividadEconomica">Actividad Económica</Label>
              <Input
                id="actividadEconomica"
                value={formData.actividadEconomica}
                onChange={(e) => setFormData({ ...formData, actividadEconomica: e.target.value })}
                placeholder="Ej: Acuicultura"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="+593 ..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paginaWeb">Página Web</Label>
                <Input
                  id="paginaWeb"
                  value={formData.paginaWeb}
                  onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Dirección de la empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacionDomiciliaria">Ubicación Domiciliaria</Label>
              <Input
                id="ubicacionDomiciliaria"
                value={formData.ubicacionDomiciliaria}
                onChange={(e) => setFormData({ ...formData, ubicacionDomiciliaria: e.target.value })}
                placeholder="Ciudad, País"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="areaProduccion">Área de Producción</Label>
              <Input
                id="areaProduccion"
                value={formData.areaProduccion}
                onChange={(e) => setFormData({ ...formData, areaProduccion: e.target.value })}
                placeholder="Ej: 500 hectáreas"
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
                {submitting ? 'Guardando...' : editingEmpresa ? 'Guardar Cambios' : 'Crear Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Empresa</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la empresa{' '}
              <strong>{deletingEmpresa?.razonSocial}</strong> y todos sus locales, áreas,
              sectores y unidades asociados.
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
