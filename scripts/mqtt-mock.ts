import mqtt from 'mqtt'

const BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883'
const INTERVAL_MS = 15_000

// All 21 topics from seed data with base profiles
const UNIDADES = [
  // Finca Delia - Zona Norte - Estacion 1
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-1', baseVel: 2.8, baseNivel: 1.9 },
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-2', baseVel: 2.5, baseNivel: 1.7 },
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-3', baseVel: 2.2, baseNivel: 1.5 },

  // Finca Delia - Zona Norte - Estacion 2
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-1', baseVel: 3.0, baseNivel: 2.0 },
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-2', baseVel: 2.7, baseNivel: 1.8 },
  { topic: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-3', baseVel: 2.4, baseNivel: 1.6 },

  // Finca Delia - Zona Sur - Estacion 3
  { topic: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-1', baseVel: 3.2, baseNivel: 2.2 },
  { topic: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-2', baseVel: 2.9, baseNivel: 2.0 },
  { topic: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-3', baseVel: 2.6, baseNivel: 1.8 },

  // Finca Delia - Zona Sur - Estacion 4
  { topic: 'hydroflow/finca-delia/zona-sur/estacion-4/grupo-bombeo-1', baseVel: 2.3, baseNivel: 1.6 },
  { topic: 'hydroflow/finca-delia/zona-sur/estacion-4/grupo-bombeo-2', baseVel: 2.1, baseNivel: 1.4 },

  // Finca Santay - Zona Este - Estacion 1
  { topic: 'hydroflow/finca-santay/zona-este/estacion-1/grupo-bombeo-1', baseVel: 2.6, baseNivel: 1.8 },
  { topic: 'hydroflow/finca-santay/zona-este/estacion-1/grupo-bombeo-2', baseVel: 2.4, baseNivel: 1.6 },

  // Finca Santay - Zona Este - Estacion 2
  { topic: 'hydroflow/finca-santay/zona-este/estacion-2/grupo-bombeo-1', baseVel: 2.8, baseNivel: 1.9 },
  { topic: 'hydroflow/finca-santay/zona-este/estacion-2/grupo-bombeo-2', baseVel: 2.5, baseNivel: 1.7 },

  // Finca Santay - Zona Oeste - Estacion 1
  { topic: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-1', baseVel: 2.0, baseNivel: 1.3 },
  { topic: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-2', baseVel: 1.8, baseNivel: 1.2 },
  { topic: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-3', baseVel: 2.2, baseNivel: 1.5 },

  // Laboratorio Central - Sala A - Modulo 1
  { topic: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-1', baseVel: 1.5, baseNivel: 1.0 },
  { topic: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-2', baseVel: 1.3, baseNivel: 0.9 },
  { topic: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-3', baseVel: 1.6, baseNivel: 1.1 },
]

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
  console.log(`[Mock] Publishing to ${UNIDADES.length} topics every ${INTERVAL_MS / 1000}s`)
  console.log(`[Mock] Press Ctrl+C to stop\n`)

  let cycle = 0

  const timer = setInterval(() => {
    cycle++
    const timestamp = new Date().toISOString()
    let anomalyCount = 0

    for (const u of UNIDADES) {
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
      `[Mock] Cycle ${cycle} | ${timestamp} | ${UNIDADES.length} msgs sent` +
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
