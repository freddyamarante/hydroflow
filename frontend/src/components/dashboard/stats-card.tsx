'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  href?: string;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  href,
  trend,
  className,
}: StatsCardProps) {
  const content = (
    <Card
      className={cn(
        'transition-colors',
        href && 'hover:bg-muted/50 cursor-pointer',
        className
      )}
    >
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm font-medium">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="bg-primary/10 text-primary rounded-lg p-2.5">
            <Icon className="size-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend.value >= 0 ? (
              <TrendingUp className="text-emerald-500 size-3.5" />
            ) : (
              <TrendingDown className="text-red-500 size-3.5" />
            )}
            <span
              className={cn(
                'font-medium',
                trend.value >= 0 ? 'text-emerald-500' : 'text-red-500'
              )}
            >
              {trend.value > 0 && '+'}
              {trend.value}%
            </span>
            {trend.label && (
              <span className="text-muted-foreground">{trend.label}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
