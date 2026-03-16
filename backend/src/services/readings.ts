import { WebSocket } from 'ws';
import prisma from '../lib/prisma.js';
import { onMqttMessage } from './mqtt.js';
import { evaluateRules } from './rule-engine.js';

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

interface MqttUnidadPayload {
  nombre: string;
  velocidad?: number;
  nivel?: number;
  voltaje?: number;
  corriente?: number;
  [key: string]: unknown;
}

interface MqttPayload {
  timestamp?: string;
  unidades: MqttUnidadPayload[];
}

export function initReadingsHandler(): void {
  onMqttMessage(async (topic: string, payload: Buffer) => {
    try {
      const data: MqttPayload = JSON.parse(payload.toString());

      // Extract dispositivo codigo from topic: "hydroflow/{codigo}"
      const parts = topic.split('/');
      if (parts.length < 2 || parts[0] !== 'hydroflow') {
        return;
      }
      const codigo = parts[1];

      if (!data.unidades || !Array.isArray(data.unidades)) {
        console.warn(`[Readings] Invalid payload from ${topic}: missing unidades array`);
        return;
      }

      // Look up dispositivo by codigo, including linked unidades
      const dispositivo = await prisma.dispositivo.findUnique({
        where: { codigo },
        include: {
          unidadesProduccion: {
            include: {
              sector: { select: { id: true } },
            },
          },
        },
      });

      if (!dispositivo) {
        console.warn(`[Readings] No dispositivo found for codigo: ${codigo}`);
        return;
      }

      const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
      let processedCount = 0;

      for (const entry of data.unidades) {
        // Match by nombre within this dispositivo's unidades
        const unidad = dispositivo.unidadesProduccion.find(
          (u) => u.nombre === entry.nombre,
        );

        if (!unidad) {
          console.warn(
            `[Readings] No unidad matching "${entry.nombre}" in dispositivo ${codigo}`,
          );
          continue;
        }

        // Get ancho_canal from unidad configuracion for formula
        const config = (unidad.configuracion as Record<string, unknown>) || {};
        const anchoCanal = typeof config.ancho_canal === 'number' ? config.ancho_canal : 0;

        const velocidad = typeof entry.velocidad === 'number' ? entry.velocidad : 0;
        const nivel = typeof entry.nivel === 'number' ? entry.nivel : 0;

        // Compute formulas
        const flujoInstantaneo = Math.round(velocidad * nivel * anchoCanal * 1000) / 1000;
        const bombaEncendida = nivel > 0 && flujoInstantaneo > 0;

        // Build valores: raw sensor data + calculated fields
        const { nombre: _nombre, ...sensorData } = entry;
        const valores = {
          ...sensorData,
          flujo_instantaneo: flujoInstantaneo,
          bomba_encendida: bombaEncendida,
        };

        // Store lectura
        const lectura = await prisma.lectura.create({
          data: {
            unidadProduccionId: unidad.id,
            timestamp,
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

        // Evaluate rules (fire-and-forget, don't block reading pipeline)
        evaluateRules(unidad.id, valores as Record<string, unknown>).catch(err =>
          console.error('[Rule Engine] Error evaluating rules:', err)
        );

        processedCount++;
      }

      if (processedCount > 0) {
        console.log(`[Readings] Processed ${processedCount} readings from ${codigo}`);
      }
    } catch (err) {
      console.error('[Readings] Error processing message:', err);
    }
  });

  console.log('[Readings] Handler initialized');
}
