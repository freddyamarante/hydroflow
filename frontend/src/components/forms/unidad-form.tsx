'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronDown } from 'lucide-react';
import { PointEditor } from '@/components/maps/point-editor';

const unidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  sectorId: z.string().min(1, 'El sector es requerido'),
  topicMqtt: z.string().min(1, 'El topic MQTT es requerido'),
  posicion: z.any().optional(),
});

export type UnidadFormValues = z.infer<typeof unidadSchema>;

/** Transforms form values to the API payload shape */
export function transformUnidadPayload(values: UnidadFormValues) {
  const payload: Record<string, unknown> = {
    nombre: values.nombre,
    sectorId: values.sectorId,
    topicMqtt: values.topicMqtt,
  };
  if (values.posicion) {
    payload.posicion = values.posicion;
  }
  return payload;
}

interface SectorOption {
  id: string;
  nombre: string;
}

interface UnidadFormProps {
  defaultValues?: Partial<UnidadFormValues>;
  onSubmit: (values: UnidadFormValues) => void | Promise<void>;
  loading?: boolean;
  sectores?: SectorOption[];
  sectorId?: string;
  parentBounds?: GeoJSON.Polygon | null;
}

export function UnidadForm({
  defaultValues,
  onSubmit,
  loading = false,
  sectores = [],
  sectorId,
  parentBounds,
}: UnidadFormProps) {
  const [mapOpen, setMapOpen] = useState(!!defaultValues?.posicion);

  const form = useForm<UnidadFormValues>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      nombre: '',
      sectorId: sectorId ?? '',
      topicMqtt: '',
      posicion: undefined,
      ...defaultValues,
    },
  });

  const isEdit = !!defaultValues;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la unidad de produccion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!sectorId && sectores.length > 0 && (
          <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sector *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectores.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="topicMqtt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Topic MQTT *</FormLabel>
              <FormControl>
                <Input
                  placeholder="hydroflow/local/area/sector/unidad_id"
                  {...field}
                />
              </FormControl>
              <p className="text-sm text-muted-foreground">
                Formato: hydroflow/local/area/sector/unidad_id
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Map section - collapsible */}
        <div className="border rounded-md">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setMapOpen(!mapOpen)}
          >
            <span>Ubicacion en Mapa (opcional)</span>
            <ChevronDown
              className={`size-4 transition-transform ${mapOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {mapOpen && (
            <div className="px-4 pb-4">
              <FormField
                control={form.control}
                name="posicion"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PointEditor
                        value={field.value as { lat: number; lng: number } | null | undefined}
                        onChange={field.onChange}
                        parentBounds={parentBounds}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Unidad de Produccion
        </Button>
      </form>
    </Form>
  );
}
