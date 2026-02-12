'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface GaugeCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  color: string;
}

export function GaugeCard({ title, value, unit, icon: Icon, color }: GaugeCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {typeof value === 'number' ? value.toFixed(2) : value}
          <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
