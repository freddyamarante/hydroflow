import { WebSocket } from 'ws';
import prisma from '../lib/prisma.js';
import { onMqttMessage } from './mqtt.js';

// Map of unidadId -> Set of WebSocket connections
const wsConnections = new Map<string, Set<WebSocket>>();

export function broadcastToUnit(unidadId: string, data: unknown): void {
  const connections = wsConnections.get(unidadId);
  if (!connections) return;

  const message = JSON.stringify(data);
  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function addWsConnection(unidadId: string, ws: WebSocket): void {
  if (!wsConnections.has(unidadId)) {
    wsConnections.set(unidadId, new Set());
  }
  wsConnections.get(unidadId)!.add(ws);
}

export function removeWsConnection(unidadId: string, ws: WebSocket): void {
  const connections = wsConnections.get(unidadId);
  if (connections) {
    connections.delete(ws);
    if (connections.size === 0) {
      wsConnections.delete(unidadId);
    }
  }
}

export function initReadingsHandler(): void {
  onMqttMessage(async (topic: string, payload: Buffer) => {
    try {
      const data = JSON.parse(payload.toString());

      // Find unidad by MQTT topic
      const unidad = await prisma.unidadProduccion.findUnique({
        where: { topicMqtt: topic },
      });

      if (!unidad) {
        return;
      }

      // Calculate flujo_instantaneo
      const velocidad = data.velocidad ?? 0;
      const nivel = data.nivel ?? 0;
      const configuracion = (unidad.configuracion as Record<string, unknown>) || {};
      const anchoCanal = (configuracion.ancho_canal as number) ?? 0;

      const flujoInstantaneo = velocidad * nivel * anchoCanal;

      const valores = {
        ...data,
        flujo_instantaneo: flujoInstantaneo,
      };

      // Store lectura
      const lectura = await prisma.lectura.create({
        data: {
          unidadProduccionId: unidad.id,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
          valores,
        },
      });

      // Broadcast to WebSocket clients
      broadcastToUnit(unidad.id, {
        id: lectura.id,
        unidadProduccionId: unidad.id,
        timestamp: lectura.timestamp,
        valores,
      });
    } catch (err) {
      console.error('[Readings] Error processing message:', err);
    }
  });

  console.log('[Readings] Handler initialized');
}
