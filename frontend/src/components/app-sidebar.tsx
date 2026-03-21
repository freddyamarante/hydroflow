'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { LayoutDashboard, Building2, Users, Cpu, ShieldAlert, Bell, Network, Settings } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/landing/logo';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

function getConfigItems(rol?: string): NavItem[] {
  if (rol === 'ADMIN') {
    return [
      { title: 'Tipos de Actividad', href: '/dashboard/admin/tipos-actividad', icon: Settings },
      { title: 'Tipos de Unidad', href: '/dashboard/admin/tipos-unidad', icon: Settings },
    ];
  }
  return [];
}

function getNavItems(rol?: string): NavItem[] {
  if (rol === 'ADMIN') {
    return [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Grupos Corporativos', href: '/dashboard/grupos-corporativos', icon: Network },
      { title: 'Empresas', href: '/dashboard/empresas', icon: Building2 },
      { title: 'Dispositivos', href: '/dashboard/dispositivos', icon: Cpu },
      { title: 'Reglas', href: '/dashboard/reglas', icon: ShieldAlert },
      { title: 'Alertas', href: '/dashboard/alertas', icon: Bell },
      { title: 'Usuarios', href: '/dashboard/usuarios', icon: Users },
    ];
  }

  return [
    { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { title: 'Alertas', href: '/dashboard/alertas', icon: Bell },
    { title: 'Reglas', href: '/dashboard/reglas', icon: ShieldAlert },
  ];
}

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const navItems = getNavItems(user?.rol);
  const configItems = getConfigItems(user?.rol);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Logo className="w-36" variant="white" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegacion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === '/dashboard'
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {configItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Configuracion</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {configItems.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                        <Link href={item.href}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
