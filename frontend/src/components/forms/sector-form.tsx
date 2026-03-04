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

const sectorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  areaId: z.string().min(1, 'El area es requerida'),
  tipo: z.string().optional(),
  usuarioResponsableId: z.string().optional().transform(v => (!v || v === '__none__') ? undefined : v),
  bounds: z.any().optional(),
});

export type SectorFormValues = z.infer<typeof sectorSchema>;

interface AreaOption {
  id: string;
  nombre: string;
}

interface UsuarioOption {
  id: string;
  nombre: string;
  apellido?: string | null;
}

interface SectorFormProps {
  defaultValues?: Partial<SectorFormValues>;
  onSubmit: (values: SectorFormValues) => void | Promise<void>;
  loading?: boolean;
  areas?: AreaOption[];
  usuarios?: UsuarioOption[];
  areaId?: string;
  parentBounds?: GeoJSON.Polygon | null;
}

export function SectorForm({
  defaultValues,
  onSubmit,
  loading = false,
  areas = [],
  usuarios = [],
  areaId,
  parentBounds,
}: SectorFormProps) {
  const [mapOpen, setMapOpen] = useState(!!defaultValues?.bounds);

  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      nombre: '',
      areaId: areaId ?? '',
      tipo: '',
      usuarioResponsableId: '',
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
                <Input placeholder="Nombre del sector" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!areaId && areas.length > 0 && (
          <FormField
            control={form.control}
            name="areaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Area *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar area" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.nombre}
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
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Piscina, Estanque" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {usuarios.length > 0 && (
          <FormField
            control={form.control}
            name="usuarioResponsableId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usuario Responsable</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {usuarios.map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.id}>
                        {usuario.nombre} {usuario.apellido ?? ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
          {isEdit ? 'Actualizar' : 'Crear'} Sector
        </Button>
      </form>
    </Form>
  );
}
