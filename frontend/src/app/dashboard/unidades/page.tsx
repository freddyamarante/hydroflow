'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

interface UnidadProduccion {
  id: string;
  nombre: string;
  topicMqtt: string | null;
  sectorId: string;
  sector?: { id: string; nombre: string };
  dispositivo?: { id: string; codigo: string; tipoDispositivo: { codigo: string } } | null;
  createdAt: string;
}

export default function UnidadesPage() {
  const router = useRouter();
  const [unidades, setUnidades] = useState<UnidadProduccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.get('/api/unidades?limit=100');
      setUnidades(res.data.items);
    } catch {
      setError('Error al cargar unidades');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const columns: ColumnDef<UnidadProduccion>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    {
      id: 'topicMqtt',
      header: 'Topic MQTT',
      accessorFn: (row) =>
        row.topicMqtt ? (
          <span className="font-mono text-xs">{row.topicMqtt}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: 'sector',
      header: 'Sector',
      accessorFn: (row) => row.sector?.nombre ?? '-',
      sortable: true,
    },
    {
      id: 'dispositivo',
      header: 'Dispositivo',
      accessorFn: (row) =>
        row.dispositivo ? (
          <Badge variant="outline">{row.dispositivo.codigo}</Badge>
        ) : (
          '-'
        ),
    },
  ];

  const rowActions: RowAction<UnidadProduccion>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (unidad) => router.push(`/dashboard/unidades/${unidad.id}`),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Unidades de Produccion</h2>
        <p className="text-muted-foreground mt-1">
          Vista general de todas las unidades de produccion
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={unidades}
        loading={loading}
        searchKey="nombre"
        searchPlaceholder="Buscar por nombre..."
        emptyMessage="No hay unidades de produccion registradas."
        rowActions={rowActions}
        onRowClick={(unidad) => router.push(`/dashboard/unidades/${unidad.id}`)}
      />
    </div>
  );
}
