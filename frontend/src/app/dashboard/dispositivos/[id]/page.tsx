'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Link2, Link2Off, Trash2 } from 'lucide-react';

interface Dispositivo {
  id: string;
  codigo: string;
  tipoDispositivo: { id: string; codigo: string; nombre: string };
  areaActividad: string;
  asignado: boolean;
  sectorId: string | null;
  sector: { id: string; nombre: string } | null;
  localProductivoId: string;
  configuracionMqtt: unknown;
  unidadesProduccion: { id: string; nombre: string }[];
  createdAt: string;
}

interface Sector {
  id: string;
  nombre: string;
}

const AREA_LABELS: Record<string, string> = {
  AIREACION_MECANICA: 'Aireacion Mecanica',
  AIREACION_ELECTRICA: 'Aireacion Electrica',
  ESTACION_DE_BOMBEO: 'Estacion de Bombeo',
};

export default function DispositivoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dispositivo, setDispositivo] = useState<Dispositivo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState('');

  const fetchDispositivo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/dispositivos/${id}`);
      setDispositivo(res.data);
    } catch {
      setError('Error al cargar dispositivo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDispositivo();
  }, [fetchDispositivo]);

  async function openAssignDialog() {
    try {
      const res = await api.get('/api/sectores?limit=100');
      setSectores(res.data.items);
      setSelectedSectorId('');
      setAssignDialogOpen(true);
    } catch {
      setError('Error al cargar sectores');
    }
  }

  async function handleAssign() {
    if (!selectedSectorId) return;
    try {
      setSubmitting(true);
      setError(null);
      await api.post(`/api/dispositivos/${id}/asignar`, { sectorId: selectedSectorId });
      setAssignDialogOpen(false);
      fetchDispositivo();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Error al asignar dispositivo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassign() {
    try {
      setSubmitting(true);
      setError(null);
      await api.post(`/api/dispositivos/${id}/desasignar`);
      setUnassignDialogOpen(false);
      fetchDispositivo();
    } catch {
      setError('Error al desasignar dispositivo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/dispositivos/${id}`);
      router.push('/dashboard/dispositivos');
    } catch {
      setError('Error al eliminar dispositivo');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!dispositivo) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dispositivo no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/dispositivos')}>
          Volver
        </Button>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Dispositivos', href: '/dashboard/dispositivos' },
    { label: dispositivo.codigo },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/dispositivos')}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-bold">{dispositivo.codigo}</h2>
            <p className="text-muted-foreground mt-1">
              {dispositivo.tipoDispositivo.nombre}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!dispositivo.asignado && (
            <>
              <Button onClick={openAssignDialog}>
                <Link2 className="size-4" />
                Asignar a Sector
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            </>
          )}
          {dispositivo.asignado && (
            <Button variant="outline" onClick={() => setUnassignDialogOpen(true)}>
              <Link2Off className="size-4" />
              Desasignar
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informacion del Dispositivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Codigo</span>
              <span className="font-mono font-medium">{dispositivo.codigo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant="outline">{dispositivo.tipoDispositivo.codigo} - {dispositivo.tipoDispositivo.nombre}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Area de Actividad</span>
              <span>{AREA_LABELS[dispositivo.areaActividad] ?? dispositivo.areaActividad}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={dispositivo.asignado ? 'default' : 'secondary'}>
                {dispositivo.asignado ? 'Asignado' : 'Disponible'}
              </Badge>
            </div>
            {dispositivo.sector && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sector</span>
                <span>{dispositivo.sector.nombre}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {dispositivo.asignado && dispositivo.unidadesProduccion.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unidades Vinculadas</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {dispositivo.unidadesProduccion.map((unidad) => (
                  <li key={unidad.id} className="flex items-center justify-between rounded-md border p-2">
                    <span>{unidad.nombre}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/unidades/${unidad.id}`)}
                    >
                      Ver
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Assign Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar a Sector</DialogTitle>
            <DialogDescription>
              Seleccione el sector al que desea asignar el dispositivo {dispositivo.codigo}.
            </DialogDescription>
          </DialogHeader>
          <Select onValueChange={setSelectedSectorId} value={selectedSectorId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar sector" />
            </SelectTrigger>
            <SelectContent>
              {sectores.map((sector) => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={!selectedSectorId || submitting}>
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign Dialog */}
      <Dialog open={unassignDialogOpen} onOpenChange={setUnassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desasignar Dispositivo</DialogTitle>
            <DialogDescription>
              Se desasignara el dispositivo <strong>{dispositivo.codigo}</strong> del sector{' '}
              <strong>{dispositivo.sector?.nombre}</strong>. Las unidades vinculadas perderan la referencia al dispositivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnassignDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleUnassign} disabled={submitting}>
              {submitting ? 'Desasignando...' : 'Desasignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Dispositivo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el dispositivo{' '}
              <strong>{dispositivo.codigo}</strong>.
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
