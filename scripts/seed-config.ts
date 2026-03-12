// scripts/seed-config.ts
// Single source of truth for all seed & mock data.
// Imported by backend/prisma/seed.ts and scripts/mqtt-mock.ts

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  unidades: UnidadSeedConfig[]
  dispositivo: DispositivoSeedConfig
}

export interface AreaSeedConfig {
  nombre: string
  slug: string
  actividadProductiva: string
  sectores: SectorSeedConfig[]
}

export interface LocalSeedConfig {
  nombre: string
  slug: string
  tipoProductivo: 'finca' | 'laboratorio'
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

  return { nombre, slug: localSlug, tipoProductivo, areas }
}

// ---------------------------------------------------------------------------
// Full hierarchy
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
          buildLocal('Finca Delia', 'finca'),
          buildLocal('Finca Santay', 'finca'),
        ],
      },
      {
        razonSocial: 'Acuacorp S.A.',
        marcaComercial: 'Acuacorp',
        ruc: '0991987654001',
        actividadEconomica: 'Laboratorio de larvas',
        locales: [
          buildLocal('Laboratorio Central', 'laboratorio'),
          buildLocal('Finca Puna', 'finca'),
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
          buildLocal('Finca Aurora', 'finca'),
          buildLocal('Finca Balao', 'finca'),
        ],
      },
      {
        razonSocial: 'BioAcua S.A.',
        marcaComercial: 'BioAcua',
        ruc: '0794567890001',
        actividadEconomica: 'Biotecnologia acuicola',
        locales: [
          buildLocal('Laboratorio Pedernales', 'laboratorio'),
          buildLocal('Finca Esmeraldas', 'finca'),
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
        locales: [buildLocal('Finca Muisne', 'finca')],
      },
      {
        razonSocial: 'AquaVida S.A.',
        marcaComercial: 'AquaVida',
        ruc: '1396789012001',
        actividadEconomica: 'Acuicultura sostenible',
        locales: [buildLocal('Finca Tonchigue', 'finca')],
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
