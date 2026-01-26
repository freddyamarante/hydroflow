'use client';

import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Droplets, Thermometer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Sensores Activos',
      value: '0',
      description: 'Sin sensores conectados',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Calidad del Agua',
      value: 'N/A',
      description: 'Esperando datos',
      icon: Droplets,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    },
    {
      title: 'Temperatura',
      value: 'N/A',
      description: 'Esperando datos',
      icon: Thermometer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: 'Estado de Energía',
      value: 'N/A',
      description: 'Esperando datos',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
          Bienvenido de nuevo, {user?.name}!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Resumen del sistema de monitoreo de tu finca camaronera
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.bgColor} p-2 rounded-lg`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Primeros Pasos</CardTitle>
          <CardDescription>
            Tu sistema HydroFlow está listo. Comienza conectando tus sensores IoT.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-600 dark:bg-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Configurar Broker MQTT
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Configura el broker MQTT para recibir datos de sensores desde tus dispositivos IoT.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-600 dark:bg-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Añadir Estaciones de Sensores
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Registra tus estaciones de bombeo y módulos de sensores en el sistema.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-cyan-600 dark:bg-cyan-500 flex items-center justify-center text-white font-bold shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  Monitoreo en Tiempo Real
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Comienza a monitorear la calidad del agua, temperatura y otros parámetros vitales.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
