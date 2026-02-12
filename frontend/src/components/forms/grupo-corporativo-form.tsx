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
import { Loader2 } from 'lucide-react';

const grupoCorporativoSchema = z.object({
  razonSocial: z.string().min(1, 'La razon social es requerida'),
  tipoIndustria: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
  paginaWeb: z.string().optional(),
});

export type GrupoCorporativoFormValues = z.infer<typeof grupoCorporativoSchema>;

interface GrupoCorporativoFormProps {
  defaultValues?: Partial<GrupoCorporativoFormValues>;
  onSubmit: (values: GrupoCorporativoFormValues) => void | Promise<void>;
  loading?: boolean;
}

export function GrupoCorporativoForm({
  defaultValues,
  onSubmit,
  loading = false,
}: GrupoCorporativoFormProps) {
  const form = useForm<GrupoCorporativoFormValues>({
    resolver: zodResolver(grupoCorporativoSchema),
    defaultValues: {
      razonSocial: '',
      tipoIndustria: '',
      direccion: '',
      ubicacionDomiciliaria: '',
      paginaWeb: '',
      ...defaultValues,
    },
  });

  const isEdit = !!defaultValues;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="razonSocial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razon Social *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre del grupo corporativo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipoIndustria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Industria</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Acuicultura" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direccion</FormLabel>
              <FormControl>
                <Input placeholder="Direccion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ubicacionDomiciliaria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicacion Domiciliaria</FormLabel>
              <FormControl>
                <Input placeholder="Ciudad, Provincia, Pais" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paginaWeb"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pagina Web</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Grupo Corporativo
        </Button>
      </form>
    </Form>
  );
}
