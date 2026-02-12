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

const baseSchema = {
  email: z.string().email('Email invalido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  rol: z.enum(['ADMIN', 'SUPERVISOR', 'VISOR']),
  empresaId: z.string().optional(),
};

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(6, 'Minimo 6 caracteres'),
});

const editSchema = z.object({
  ...baseSchema,
  password: z.string().min(6, 'Minimo 6 caracteres').optional().or(z.literal('')),
});

export type UsuarioCreateFormValues = z.infer<typeof createSchema>;
export type UsuarioEditFormValues = z.infer<typeof editSchema>;
export type UsuarioFormValues = UsuarioCreateFormValues | UsuarioEditFormValues;

interface EmpresaOption {
  id: string;
  razonSocial: string;
}

interface UsuarioFormProps {
  defaultValues?: Partial<UsuarioEditFormValues>;
  onSubmit: (values: UsuarioFormValues) => void | Promise<void>;
  loading?: boolean;
  empresas?: EmpresaOption[];
}

export function UsuarioForm({
  defaultValues,
  onSubmit,
  loading = false,
  empresas = [],
}: UsuarioFormProps) {
  const isEdit = !!defaultValues;
  const schema = isEdit ? editSchema : createSchema;

  const form = useForm<UsuarioFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      nombre: '',
      apellido: '',
      telefono: '',
      rol: 'VISOR' as const,
      empresaId: '',
      password: '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nombre"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre *</FormLabel>
                <FormControl>
                  <Input placeholder="Nombre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="apellido"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Apellido</FormLabel>
                <FormControl>
                  <Input placeholder="Apellido" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input type="email" placeholder="usuario@ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {isEdit ? 'Nueva Contrasena' : 'Contrasena *'}
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder={isEdit ? 'Dejar vacio para no cambiar' : 'Minimo 6 caracteres'}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono</FormLabel>
              <FormControl>
                <Input placeholder="Telefono" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="VISOR">Visor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {empresas.length > 0 && (
          <FormField
            control={form.control}
            name="empresaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.razonSocial}
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
          {isEdit ? 'Actualizar' : 'Crear'} Usuario
        </Button>
      </form>
    </Form>
  );
}
