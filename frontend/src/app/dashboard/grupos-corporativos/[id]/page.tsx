'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Building2, Pencil, Trash2, Eye } from 'lucide-react';

interface GrupoDetail {
  id: string;
  razonSocial: string;
  tipoIndustria: string | null;
  direccion: string | null;
  ubicacionDomiciliaria: string | null;
  paginaWeb: string | null;
  empresas: {
    id: string;
    razonSocial: string;
    marcaComercial: string | null;
    ruc: string | null;
    actividadEconomica: string | null;
  }[];
}

interface GrupoFormData {
  razonSocial: string;
  tipoIndustria: string;
  direccion: string;
  ubicacionDomiciliaria: string;
  paginaWeb: string;
}

export default function GrupoCorporativoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const grupoId = params.id as string;

  const [grupo, setGrupo] = useState<GrupoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<GrupoFormData>({
    razonSocial: '',
    tipoIndustria: '',
    direccion: '',
    ubicacionDomiciliaria: '',
    paginaWeb: '',
  });

  const fetchGrupo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/grupos-corporativos/${grupoId}`);
      setGrupo(res.data);
    } catch {
      setError('Error al cargar el grupo corporativo');
    } finally {
      setLoading(false);
    }
  }, [grupoId]);

  useEffect(() => {
    fetchGrupo();
  }, [fetchGrupo]);

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.razonSocial.trim()) return;
    try {
      setSubmitting(true);
      await api.put(`/api/grupos-corporativos/${grupoId}`, {
        razonSocial: formData.razonSocial.trim(),
        tipoIndustria: formData.tipoIndustria.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        ubicacionDomiciliaria: formData.ubicacionDomiciliaria.trim() || undefined,
        paginaWeb: formData.paginaWeb.trim() || undefined,
      });
      setEditDialogOpen(false);
      fetchGrupo();
    } catch {
      setError('Error al actualizar el grupo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/grupos-corporativos/${grupoId}`);
      router.push('/dashboard/grupos-corporativos');
    } catch {
      setError('Error al eliminar el grupo corporativo');
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

  if (error && !grupo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!grupo) return null;

  const infoFields = [
    { label: 'Razon Social', value: grupo.razonSocial },
    { label: 'Tipo de Industria', value: grupo.tipoIndustria },
    { label: 'Direccion', value: grupo.direccion },
    { label: 'Ubicacion Domiciliaria', value: grupo.ubicacionDomiciliaria },
    { label: 'Pagina Web', value: grupo.paginaWeb },
  ];

  const empresaColumns: ColumnDef<GrupoDetail['empresas'][0]>[] = [
    { id: 'razonSocial', header: 'Razon Social', accessorKey: 'razonSocial', sortable: true },
    { id: 'marcaComercial', header: 'Marca Comercial', accessorKey: 'marcaComercial' },
    { id: 'ruc', header: 'RUC', accessorKey: 'ruc' },
    { id: 'actividadEconomica', header: 'Actividad Economica', accessorKey: 'actividadEconomica' },
  ];

  const empresaActions: RowAction<GrupoDetail['empresas'][0]>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (empresa) => router.push(`/dashboard/empresas/${empresa.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Grupos Corporativos', href: '/dashboard/grupos-corporativos' },
              { label: grupo.razonSocial },
            ]}
          />
          <h2 className="text-3xl font-bold">{grupo.razonSocial}</h2>
          {grupo.tipoIndustria && (
            <p className="text-muted-foreground">{grupo.tipoIndustria}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setFormData({
                razonSocial: grupo.razonSocial,
                tipoIndustria: grupo.tipoIndustria ?? '',
                direccion: grupo.direccion ?? '',
                ubicacionDomiciliaria: grupo.ubicacionDomiciliaria ?? '',
                paginaWeb: grupo.paginaWeb ?? '',
              });
              setEditDialogOpen(true);
            }}
          >
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

      <StatsGrid className="lg:grid-cols-1 max-w-xs">
        <StatsCard icon={Building2} label="Empresas" value={grupo.empresas.length} />
      </StatsGrid>

      <Card>
        <CardHeader>
          <CardTitle>Informacion del Grupo</CardTitle>
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
                ),
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Empresas ({grupo.empresas.length})</h3>
        <DataTable
          columns={empresaColumns}
          data={grupo.empresas}
          searchKey="razonSocial"
          searchPlaceholder="Buscar empresas..."
          emptyMessage="No hay empresas vinculadas a este grupo."
          rowActions={empresaActions}
          onRowClick={(empresa) => router.push(`/dashboard/empresas/${empresa.id}`)}
        />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Grupo Corporativo</DialogTitle>
            <DialogDescription>Modifica los datos del grupo corporativo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razon Social *</Label>
              <Input id="razonSocial" value={formData.razonSocial} onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoIndustria">Tipo de Industria</Label>
              <Input id="tipoIndustria" value={formData.tipoIndustria} onChange={(e) => setFormData({ ...formData, tipoIndustria: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Direccion</Label>
              <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacionDomiciliaria">Ubicacion Domiciliaria</Label>
              <Input id="ubicacionDomiciliaria" value={formData.ubicacionDomiciliaria} onChange={(e) => setFormData({ ...formData, ubicacionDomiciliaria: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paginaWeb">Pagina Web</Label>
              <Input id="paginaWeb" value={formData.paginaWeb} onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo Corporativo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
              <strong>{grupo.razonSocial}</strong>. Las empresas asociadas no seran eliminadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
