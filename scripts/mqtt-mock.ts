import mqtt from 'mqtt'
import { ALL_UNIDADES } from './seed-config'

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const INTERVAL_MS = 15_000

function fluctuate(base: number, pct: number = 0.1): number {
  const delta = base * pct * (Math.random() * 2 - 1)
  return Math.round((base + delta) * 100) / 100
}

function generateAnomaly(base: { baseVel: number; baseNivel: number }) {
  const anomalyType = Math.random()
  if (anomalyType < 0.33) {
    // Voltage spike
    return { voltaje: Math.round(Math.random() > 0.5 ? 470 + Math.random() * 20 : 390 + Math.random() * 20) }
  } else if (anomalyType < 0.66) {
    // Current spike
    return { corriente: Math.round((45 + Math.random() * 15) * 100) / 100 }
  } else {
    // Velocity/nivel drop (pump problem)
    return {
      velocidad: Math.round(base.baseVel * 0.3 * 100) / 100,
      nivel: Math.round(base.baseNivel * 0.2 * 100) / 100,
    }
  }
}

const client = mqtt.connect(BROKER_URL)

client.on('connect', () => {
  console.log(`[Mock] Connected to ${BROKER_URL}`)
  console.log(`[Mock] Publishing to ${ALL_UNIDADES.length} topics every ${INTERVAL_MS / 1000}s`)
  console.log(`[Mock] Press Ctrl+C to stop\n`)

  let cycle = 0

  const timer = setInterval(() => {
    cycle++
    const timestamp = new Date().toISOString()
    let anomalyCount = 0

    for (const u of ALL_UNIDADES) {
      const isAnomaly = Math.random() < 0.05

      const payload: Record<string, unknown> = {
        timestamp,
        velocidad: fluctuate(u.baseVel),
        nivel: fluctuate(u.baseNivel),
        voltaje: fluctuate(440, 0.02),
        corriente: fluctuate(28, 0.1),
      }

      if (isAnomaly) {
        anomalyCount++
        Object.assign(payload, generateAnomaly(u))
      }

      client.publish(u.topic, JSON.stringify(payload))
    }

    console.log(
      `[Mock] Cycle ${cycle} | ${timestamp} | ${ALL_UNIDADES.length} msgs sent` +
        (anomalyCount > 0 ? ` | ${anomalyCount} anomalies` : '')
    )
  }, INTERVAL_MS)

  process.on('SIGINT', () => {
    clearInterval(timer)
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
