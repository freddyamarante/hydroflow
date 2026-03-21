import mqtt from 'mqtt'
import { ALL_DISPOSITIVOS } from './seed-config'

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const MQTT_USERNAME = process.env.MQTT_USERNAME || ''
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || ''
const DATABASE_URL = process.env.DATABASE_URL || ''
const INTERVAL_MS = parseInt(process.env.MOCK_INTERVAL_MS || '60000') // 60s default
const RETENTION_HOURS = parseInt(process.env.MOCK_RETENTION_HOURS || '24')

function fluctuate(base: number, pct: number = 0.1): number {
  const delta = base * pct * (Math.random() * 2 - 1)
  return Math.round((base + delta) * 100) / 100
}

function generateAnomaly(base: { baseVel: number; baseNivel: number }) {
  const anomalyType = Math.random()
  if (anomalyType < 0.33) {
    return { voltaje: Math.round(Math.random() > 0.5 ? 470 + Math.random() * 20 : 390 + Math.random() * 20) }
  } else if (anomalyType < 0.66) {
    return { corriente: Math.round((45 + Math.random() * 15) * 100) / 100 }
  } else {
    return {
      velocidad: Math.round(base.baseVel * 0.3 * 100) / 100,
      nivel: Math.round(base.baseNivel * 0.2 * 100) / 100,
    }
  }
}

// ---------------------------------------------------------------------------
// Data retention: delete lecturas older than RETENTION_HOURS
// ---------------------------------------------------------------------------

async function cleanupOldLecturas(): Promise<void> {
  if (!DATABASE_URL) return

  try {
    // Use pg directly to avoid needing Prisma in the mock container
    const { default: postgres } = await import('postgres')
    const sql = postgres(DATABASE_URL)
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString()
    const result = await sql`DELETE FROM lectura WHERE timestamp < ${cutoff}`
    const count = result.count
    if (count > 0) {
      console.log(`[Cleanup] Deleted ${count} lecturas older than ${RETENTION_HOURS}h`)
    }
    await sql.end()
  } catch (err) {
    console.error('[Cleanup] Error:', (err as Error).message)
  }
}

// ---------------------------------------------------------------------------
// MQTT mock publisher
// ---------------------------------------------------------------------------

const connectOptions: mqtt.IClientOptions = {}
if (MQTT_USERNAME) {
  connectOptions.username = MQTT_USERNAME
}
if (MQTT_PASSWORD) {
  connectOptions.password = MQTT_PASSWORD
}

const client = mqtt.connect(BROKER_URL, connectOptions)

client.on('connect', () => {
  const totalUnidades = ALL_DISPOSITIVOS.reduce((sum, d) => sum + d.unidades.length, 0)
  console.log(`[Mock] Connected to ${BROKER_URL}`)
  console.log(`[Mock] Publishing ${ALL_DISPOSITIVOS.length} dispositivo messages (${totalUnidades} unidades) every ${INTERVAL_MS / 1000}s`)
  console.log(`[Mock] Data retention: ${RETENTION_HOURS}h (cleanup every 30min)`)
  console.log(`[Mock] Press Ctrl+C to stop\n`)

  let cycle = 0

  // Publish readings on interval
  const publishTimer = setInterval(() => {
    cycle++
    const timestamp = new Date().toISOString()
    let anomalyCount = 0

    for (const dispositivo of ALL_DISPOSITIVOS) {
      const unidades: Record<string, unknown>[] = []

      for (const u of dispositivo.unidades) {
        const isAnomaly = Math.random() < 0.05

        const entry: Record<string, unknown> = {
          nombre: u.nombre,
          velocidad: fluctuate(u.baseVel),
          nivel: fluctuate(u.baseNivel),
          voltaje: fluctuate(440, 0.02),
          corriente: fluctuate(28, 0.1),
        }

        if (isAnomaly) {
          anomalyCount++
          Object.assign(entry, generateAnomaly(u))
        }

        unidades.push(entry)
      }

      const payload = { timestamp, unidades }
      client.publish(dispositivo.topic, JSON.stringify(payload))
    }

    console.log(
      `[Mock] Cycle ${cycle} | ${timestamp} | ${ALL_DISPOSITIVOS.length} msgs sent (${totalUnidades} unidades)` +
        (anomalyCount > 0 ? ` | ${anomalyCount} anomalies` : '')
    )
  }, INTERVAL_MS)

  // Cleanup old data every 30 minutes
  cleanupOldLecturas()
  const cleanupTimer = setInterval(cleanupOldLecturas, 30 * 60 * 1000)

  process.on('SIGINT', () => {
    clearInterval(publishTimer)
    clearInterval(cleanupTimer)
    client.end(false, () => {
      console.log(`\n[Mock] Disconnected after ${cycle} cycles`)
      process.exit(0)
    })
  })
})

client.on('error', (err) => {
  console.error(`[Mock] Connection failed: ${err.message}`)
  console.error('[Mock] Is the MQTT broker running? Try: bun run dev:services')
  process.exit(1)
})
