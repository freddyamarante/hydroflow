'use client';

import { useAuth } from '@/contexts/auth-context';
import { AdminDashboard } from '@/components/dashboard/admin-dashboard';
import { UserDashboard } from '@/components/dashboard/user-dashboard';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.rol === 'ADMIN') {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
}
