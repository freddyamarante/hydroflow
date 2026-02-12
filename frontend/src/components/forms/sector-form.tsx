'use client';

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
import { Loader2 } from 'lucide-react';

const sectorSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  areaId: z.string().min(1, 'El area es requerida'),
  tipo: z.string().optional(),
  usuarioResponsableId: z.string().optional(),
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
}

export function SectorForm({
  defaultValues,
  onSubmit,
  loading = false,
  areas = [],
  usuarios = [],
  areaId,
}: SectorFormProps) {
  const form = useForm<SectorFormValues>({
    resolver: zodResolver(sectorSchema),
    defaultValues: {
      nombre: '',
      areaId: areaId ?? '',
      tipo: '',
      usuarioResponsableId: '',
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Sector
        </Button>
      </form>
    </Form>
  );
}
