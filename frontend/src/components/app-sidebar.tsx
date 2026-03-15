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
import { LayoutDashboard, Building2, Users, Cpu, ShieldAlert, Bell, Network } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
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

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-600 dark:bg-cyan-500 rounded-lg flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="white"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.227 0 4.458l-.146.146a3 3 0 01-4.243 0l-1.4-1.4m-4.555-4.555l-1.4-1.4a3 3 0 010-4.242l.146-.146a3.153 3.153 0 014.458 0l1.402 1.402M5 14.5V18a2 2 0 002 2h2"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold">HydroFlow</h2>
            <p className="text-xs text-muted-foreground">Monitoreo Hidrico</p>
          </div>
        </div>
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
      </SidebarContent>
    </Sidebar>
  );
}
