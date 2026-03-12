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
import { BoundsEditor } from '@/components/maps/bounds-editor';

const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  localProductivoId: z.string().min(1, 'El local productivo es requerido'),
  actividadProductiva: z.string().optional(),
  bounds: z.any().optional(),
});

export type AreaFormValues = z.infer<typeof areaSchema>;

interface LocalOption {
  id: string;
  nombre: string;
}

interface AreaFormProps {
  defaultValues?: Partial<AreaFormValues>;
  onSubmit: (values: AreaFormValues) => void | Promise<void>;
  loading?: boolean;
  locales?: LocalOption[];
  localProductivoId?: string;
  parentBounds?: GeoJSON.Polygon | null;
  siblingAreas?: { id: string; nombre: string; bounds: GeoJSON.Polygon }[];
}

export function AreaForm({
  defaultValues,
  onSubmit,
  loading = false,
  locales = [],
  localProductivoId,
  parentBounds,
  siblingAreas,
}: AreaFormProps) {
  const [mapOpen, setMapOpen] = useState(!!defaultValues?.bounds);

  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nombre: '',
      localProductivoId: localProductivoId ?? '',
      actividadProductiva: '',
      bounds: undefined,
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
                <Input placeholder="Nombre del area" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!localProductivoId && locales.length > 0 && (
          <FormField
            control={form.control}
            name="localProductivoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local Productivo *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar local productivo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.nombre}
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
          name="actividadProductiva"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actividad Productiva</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Cultivo de camaron" {...field} />
              </FormControl>
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
                name="bounds"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <BoundsEditor
                        value={field.value as GeoJSON.Polygon | null | undefined}
                        onChange={field.onChange}
                        parentBounds={parentBounds}
                        siblingPolygons={siblingAreas}
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
          {isEdit ? 'Actualizar' : 'Crear'} Area
        </Button>
      </form>
    </Form>
  );
}
