'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface LineChartCardProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
}

function formatTime(label: any) {
  try {
    const date = new Date(String(label));
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return String(label);
  }
}

export function LineChartCard({ title, data, dataKey, color, unit }: LineChartCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <YAxis
                className="text-xs"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                labelFormatter={formatTime}
                formatter={(value: any) => [`${Number(value).toFixed(2)} ${unit}`, title]}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
