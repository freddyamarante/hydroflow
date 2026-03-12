'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex-1 flex flex-col min-h-svh">
        <header className="sticky top-0 z-50 w-full border-b bg-background/70 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/70 backdrop-blur-sm border text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{user.nombre}</span>
                  <span className="text-xs text-muted-foreground">{user.rol}</span>
                </div>
              )}
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
