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

const areaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  localProductivoId: z.string().min(1, 'El local productivo es requerido'),
  actividadProductiva: z.string().optional(),
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
}

export function AreaForm({
  defaultValues,
  onSubmit,
  loading = false,
  locales = [],
  localProductivoId,
}: AreaFormProps) {
  const form = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: {
      nombre: '',
      localProductivoId: localProductivoId ?? '',
      actividadProductiva: '',
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Area
        </Button>
      </form>
    </Form>
  );
}
