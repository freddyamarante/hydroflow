// scripts/seed-config.ts
// Single source of truth for all seed & mock data.
// Imported by backend/prisma/seed.ts and scripts/mqtt-mock.ts

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeoPolygon {
  type: 'Polygon'
  coordinates: [number, number][][]
}

export interface GeoPoint {
  lat: number
  lng: number
}

export interface UnidadMockEntry {
  nombre: string
  anchoCanal: number
  baseVel: number
  baseNivel: number
}

export interface DispositivoMockConfig {
  topic: string
  codigo: string
  unidades: UnidadMockEntry[]
}

export interface UnidadSeedConfig {
  nombre: string
  slug: string
  anchoCanal: number
  baseVel: number
  baseNivel: number
  posicion?: GeoPoint
}

export interface DispositivoSeedConfig {
  codigo: string
  tipo: 'PLC' | 'NOD'
  areaActividad: string
}

export interface SectorSeedConfig {
  nombre: string
  slug: string
  tipo: string
  bounds?: GeoPolygon
  unidades: UnidadSeedConfig[]
  dispositivo: DispositivoSeedConfig
}

export interface AreaSeedConfig {
  nombre: string
  slug: string
  actividadProductiva: string
  bounds?: GeoPolygon
  sectores: SectorSeedConfig[]
}

export interface LocalSeedConfig {
  nombre: string
  slug: string
  tipoProductivo: 'finca' | 'laboratorio'
  bounds?: GeoPolygon
  areas: AreaSeedConfig[]
}

export interface EmpresaSeedConfig {
  razonSocial: string
  marcaComercial: string
  ruc: string
  actividadEconomica: string
  locales: LocalSeedConfig[]
}

export interface GrupoSeedConfig {
  razonSocial: string
  tipoIndustria: string
  direccion: string
  empresas: EmpresaSeedConfig[]
}

// ---------------------------------------------------------------------------
// Deterministic pseudo-random from string hash
// ---------------------------------------------------------------------------

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function seededValue(seed: string, min: number, max: number, decimals = 1): number {
  const h = hashCode(seed)
  const norm = (h % 10000) / 10000
  const factor = Math.pow(10, decimals)
  return Math.round((min + norm * (max - min)) * factor) / factor
}

// ---------------------------------------------------------------------------
// Slug helper (exported for ID generation in the seeder)
// ---------------------------------------------------------------------------

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// ---------------------------------------------------------------------------
// Geo helpers
// ---------------------------------------------------------------------------

interface LocalGeo {
  lat: number
  lng: number
  w: number  // width in degrees (longitude)
  h: number  // height in degrees (latitude)
}

function makeRect(west: number, south: number, east: number, north: number): GeoPolygon {
  return {
    type: 'Polygon',
    coordinates: [[
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ]],
  }
}

/**
 * Generate geographic bounds/positions for an entire local hierarchy.
 * Local → rectangle. Areas → 2x2 grid. Sectors → horizontal strips.
 * Unidades → points spread across each sector.
 */
function applyGeo(
  localSlug: string,
  geo: LocalGeo,
  areas: AreaSeedConfig[],
): GeoPolygon {
  const { lat, lng, w, h } = geo
  const localBounds = makeRect(lng - w / 2, lat - h / 2, lng + w / 2, lat + h / 2)

  const margin = Math.max(w, h) * 0.025
  const areaGap = Math.max(w, h) * 0.012

  const innerLeft = lng - w / 2 + margin
  const innerBottom = lat - h / 2 + margin
  const innerW = w - 2 * margin
  const innerH = h - 2 * margin
  const areaW = (innerW - areaGap) / 2
  const areaH = (innerH - areaGap) / 2

  // Grid positions [col, row] where row 0 = bottom, row 1 = top
  // Finca: Norte=NW, Sur=SE, Este=NE, Oeste=SW
  // Lab:   Sala A=NW, Sala B=NE, Sala C=SW, Sala D=SE
  const GRID: [number, number][] = [[0, 1], [1, 0], [1, 1], [0, 0]]

  areas.forEach((area, aIdx) => {
    const [col, row] = GRID[aIdx]
    const aLeft = innerLeft + col * (areaW + areaGap)
    const aBottom = innerBottom + row * (areaH + areaGap)

    area.bounds = makeRect(aLeft, aBottom, aLeft + areaW, aBottom + areaH)

    // 3 sectors as horizontal strips, top to bottom
    const sGap = areaH * 0.025
    const sH = (areaH - 2 * sGap) / 3

    area.sectores.forEach((sector, sIdx) => {
      const sTop = aBottom + areaH - sIdx * (sH + sGap)
      const sBot = sTop - sH

      sector.bounds = makeRect(aLeft, sBot, aLeft + areaW, sTop)

      // Unidades spread across the sector
      const padX = areaW * 0.1
      const nUnits = sector.unidades.length
      const spacingX = nUnits > 1 ? (areaW - 2 * padX) / (nUnits - 1) : 0
      const midY = (sBot + sTop) / 2
      const yRange = sH * 0.15

      sector.unidades.forEach((u, uIdx) => {
        // Alternate slight Y offset for a natural zigzag
        const ySeed = `${localSlug}/${area.slug}/${sector.slug}/${u.slug}/y`
        const yOff = seededValue(ySeed, -yRange, yRange, 6)

        u.posicion = {
          lat: midY + yOff,
          lng: aLeft + padX + uIdx * spacingX,
        }
      })
    })
  })

  return localBounds
}

// ---------------------------------------------------------------------------
// Dispositivo code generation
// ---------------------------------------------------------------------------

// Area activity code mapping (matches backend AREA_CODES in dispositivos.ts)
const AREA_ACTIVITY_CODES: Record<string, string> = {
  AIREACION_MECANICA: 'AM',
  AIREACION_ELECTRICA: 'AE',
  ESTACION_DE_BOMBEO: 'EB',
}

// Global sequence counter per area+tipo prefix to ensure unique codes
const prefixSeqCounters = new Map<string, number>()

function generateDispositivoCodigo(areaActividad: string): string {
  const areaCode = AREA_ACTIVITY_CODES[areaActividad] || 'XX'
  const prefix = `${areaCode}PLC`
  const seq = (prefixSeqCounters.get(prefix) || 0) + 1
  prefixSeqCounters.set(prefix, seq)
  return `${prefix}${String(seq).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const FINCA_AREAS = [
  { nombre: 'Zona Norte', actividad: 'Engorde' },
  { nombre: 'Zona Sur', actividad: 'Engorde' },
  { nombre: 'Zona Este', actividad: 'Pre-cria' },
  { nombre: 'Zona Oeste', actividad: 'Engorde' },
]

const LAB_AREAS = [
  { nombre: 'Sala A', actividad: 'Larvicultura' },
  { nombre: 'Sala B', actividad: 'Maduracion' },
  { nombre: 'Sala C', actividad: 'Reproduccion' },
  { nombre: 'Sala D', actividad: 'Alevinaje' },
]

const SECTOR_TYPES = ['axial abierto', 'axial cerrado', 'recirculacion']
const SECTORES_PER_AREA = 3
const UNIDADES_PER_SECTOR = 4

// ---------------------------------------------------------------------------
// Build a local with its full subtree
// ---------------------------------------------------------------------------

function buildLocal(
  nombre: string,
  tipoProductivo: 'finca' | 'laboratorio',
  geo?: LocalGeo,
): LocalSeedConfig {
  const localSlug = slugify(nombre)
  const templates = tipoProductivo === 'laboratorio' ? LAB_AREAS : FINCA_AREAS

  const areas: AreaSeedConfig[] = templates.map((tpl, aIdx) => {
    const areaSlug = slugify(tpl.nombre)

    const sectores: SectorSeedConfig[] = Array.from(
      { length: SECTORES_PER_AREA },
      (_, sIdx) => {
        const sectorNombre = `Estacion ${sIdx + 1}`
        const sectorSlug = slugify(sectorNombre)
        const tipo = SECTOR_TYPES[(aIdx * SECTORES_PER_AREA + sIdx) % SECTOR_TYPES.length]

        // One dispositivo (PLC) per sector — controls all unidades in the sector
        const dispositivoCodigo = generateDispositivoCodigo('ESTACION_DE_BOMBEO')

        const unidades: UnidadSeedConfig[] = Array.from(
          { length: UNIDADES_PER_SECTOR },
          (_, uIdx) => {
            const unidadNombre = `Grupo de Bombeo ${uIdx + 1}`
            const unidadSlug = slugify(unidadNombre)
            const seed = `${localSlug}/${areaSlug}/${sectorSlug}/${unidadSlug}`

            return {
              nombre: unidadNombre,
              slug: unidadSlug,
              anchoCanal: seededValue(`${seed}/ancho`, 2.0, 4.5),
              baseVel: seededValue(`${seed}/vel`, 1.5, 3.5),
              baseNivel: seededValue(`${seed}/nivel`, 0.8, 2.2),
            }
          },
        )

        return {
          nombre: sectorNombre,
          slug: sectorSlug,
          tipo,
          unidades,
          dispositivo: {
            codigo: dispositivoCodigo,
            tipo: 'PLC' as const,
            areaActividad: 'ESTACION_DE_BOMBEO',
          },
        }
      },
    )

    return {
      nombre: tpl.nombre,
      slug: areaSlug,
      actividadProductiva: tpl.actividad,
      sectores,
    }
  })

  // Apply geographic coordinates if provided
  let bounds: GeoPolygon | undefined
  if (geo) {
    bounds = applyGeo(localSlug, geo, areas)
  }

  return { nombre, slug: localSlug, tipoProductivo, bounds, areas }
}

// ---------------------------------------------------------------------------
// Full hierarchy — real Ecuador shrimp farm locations
// ---------------------------------------------------------------------------

export const HIERARCHY: GrupoSeedConfig[] = [
  {
    razonSocial: 'Grupo Almar',
    tipoIndustria: 'Acuicultura',
    direccion: 'Guayaquil, Ecuador',
    empresas: [
      {
        razonSocial: 'Produmar S.A.',
        marcaComercial: 'Produmar',
        ruc: '0992123456001',
        actividadEconomica: 'Criadero de camaron',
        locales: [
          // Naranjal coast — major shrimp farming zone south of Guayaquil
          buildLocal('Finca Delia', 'finca', { lat: -2.5180, lng: -79.6350, w: 0.0095, h: 0.0070 }),
          // Near Isla Santay, Durán side — estuary area
          buildLocal('Finca Santay', 'finca', { lat: -2.2240, lng: -79.8730, w: 0.0080, h: 0.0065 }),
        ],
      },
      {
        razonSocial: 'Acuacorp S.A.',
        marcaComercial: 'Acuacorp',
        ruc: '0991987654001',
        actividadEconomica: 'Laboratorio de larvas',
        locales: [
          // Industrial Guayaquil, near Daule river — lab facility
          buildLocal('Laboratorio Central', 'laboratorio', { lat: -2.1480, lng: -79.9620, w: 0.0040, h: 0.0035 }),
          // Isla Puná, Gulf of Guayaquil — coastal farm
          buildLocal('Finca Puna', 'finca', { lat: -2.7350, lng: -80.1280, w: 0.0105, h: 0.0072 }),
        ],
      },
    ],
  },
  {
    razonSocial: 'Grupo Pacifico',
    tipoIndustria: 'Acuicultura',
    direccion: 'Machala, Ecuador',
    empresas: [
      {
        razonSocial: 'Mariscos del Pacifico S.A.',
        marcaComercial: 'Mariscos del Pacifico',
        ruc: '0793456789001',
        actividadEconomica: 'Procesamiento de camaron',
        locales: [
          // Machala coast — El Oro province shrimp belt
          buildLocal('Finca Aurora', 'finca', { lat: -3.2380, lng: -79.9650, w: 0.0090, h: 0.0068 }),
          // Balao, Guayas — another major shrimp zone
          buildLocal('Finca Balao', 'finca', { lat: -2.9060, lng: -79.8050, w: 0.0085, h: 0.0070 }),
        ],
      },
      {
        razonSocial: 'BioAcua S.A.',
        marcaComercial: 'BioAcua',
        ruc: '0794567890001',
        actividadEconomica: 'Biotecnologia acuicola',
        locales: [
          // Pedernales, Manabí — northern coast lab
          buildLocal('Laboratorio Pedernales', 'laboratorio', { lat: 0.0720, lng: -80.0540, w: 0.0038, h: 0.0032 }),
          // San Lorenzo, Esmeraldas — mangrove estuary farm
          buildLocal('Finca Esmeraldas', 'finca', { lat: 0.9380, lng: -79.6550, w: 0.0088, h: 0.0062 }),
        ],
      },
    ],
  },
  {
    razonSocial: 'Grupo Maritimo',
    tipoIndustria: 'Acuicultura',
    direccion: 'Manta, Ecuador',
    empresas: [
      {
        razonSocial: 'OceanFarm S.A.',
        marcaComercial: 'OceanFarm',
        ruc: '1395678901001',
        actividadEconomica: 'Acuicultura oceanica',
        locales: [
          // Muisne estuary, Esmeraldas — real shrimp farming area
          buildLocal('Finca Muisne', 'finca', { lat: 0.6150, lng: -80.0250, w: 0.0092, h: 0.0068 }),
        ],
      },
      {
        razonSocial: 'AquaVida S.A.',
        marcaComercial: 'AquaVida',
        ruc: '1396789012001',
        actividadEconomica: 'Acuicultura sostenible',
        locales: [
          // Tonchigüe, Esmeraldas — coastal shrimp zone
          buildLocal('Finca Tonchigue', 'finca', { lat: 0.4680, lng: -80.0720, w: 0.0078, h: 0.0060 }),
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Flat list of all dispositivos with their unidades — used by the MQTT mock
// ---------------------------------------------------------------------------

export const ALL_DISPOSITIVOS: DispositivoMockConfig[] = HIERARCHY.flatMap((g) =>
  g.empresas.flatMap((e) =>
    e.locales.flatMap((l) =>
      l.areas.flatMap((a) =>
        a.sectores.map((s) => ({
          topic: `hydroflow/${s.dispositivo.codigo}`,
          codigo: s.dispositivo.codigo,
          unidades: s.unidades.map((u) => ({
            nombre: u.nombre,
            anchoCanal: u.anchoCanal,
            baseVel: u.baseVel,
            baseNivel: u.baseNivel,
          })),
        })),
      ),
    ),
  ),
)

// Legacy export — kept for backward compatibility
export const ALL_UNIDADES = ALL_DISPOSITIVOS
