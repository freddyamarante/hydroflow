import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import { HIERARCHY, slugify } from '../../scripts/seed-config'

const prisma = new PrismaClient()

function makeId(...parts: string[]): string {
  return 'seed-' + parts.join('-')
}

async function main() {
  console.log('Clearing existing data...')

  // Delete in reverse dependency order
  await prisma.lectura.deleteMany()
  await prisma.alerta.deleteMany()
  await prisma.regla.deleteMany()
  await prisma.equipo.deleteMany()
  await prisma.unidadProduccion.deleteMany()
  await prisma.dispositivo.deleteMany()
  await prisma.tipoDispositivo.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.area.deleteMany()
  await prisma.usuarioLocalProductivo.deleteMany()
  await prisma.localProductivo.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.empresa.deleteMany()
  await prisma.grupoCorporativo.deleteMany()

  console.log('Seeding hierarchy...')

  // ------------------------------------------------------------------
  // Collect all records, then batch-insert with createMany per level
  // ------------------------------------------------------------------

  const grupoRecords: Parameters<typeof prisma.grupoCorporativo.createMany>[0]['data'] = []
  const empresaRecords: Parameters<typeof prisma.empresa.createMany>[0]['data'] = []
  const localRecords: Parameters<typeof prisma.localProductivo.createMany>[0]['data'] = []
  const areaRecords: Parameters<typeof prisma.area.createMany>[0]['data'] = []
  const sectorRecords: Parameters<typeof prisma.sector.createMany>[0]['data'] = []
  const unidadRecords: Parameters<typeof prisma.unidadProduccion.createMany>[0]['data'] = []
  const equipoRecords: Parameters<typeof prisma.equipo.createMany>[0]['data'] = []

  // Track IDs for user assignments
  let produmarId = ''

  for (const grupo of HIERARCHY) {
    const grupoSlug = slugify(grupo.razonSocial)
    const grupoId = makeId('grupo', grupoSlug)

    grupoRecords.push({
      id: grupoId,
      razonSocial: grupo.razonSocial,
      tipoIndustria: grupo.tipoIndustria,
      direccion: grupo.direccion,
    })

    for (const empresa of grupo.empresas) {
      const empresaSlug = slugify(empresa.marcaComercial)
      const empresaId = makeId('empresa', empresaSlug)

      if (empresa.marcaComercial === 'Produmar') produmarId = empresaId

      empresaRecords.push({
        id: empresaId,
        razonSocial: empresa.razonSocial,
        marcaComercial: empresa.marcaComercial,
        ruc: empresa.ruc,
        actividadEconomica: empresa.actividadEconomica,
        grupoCorporativoId: grupoId,
      })

      for (const local of empresa.locales) {
        const localId = makeId('local', local.slug)

        localRecords.push({
          id: localId,
          nombre: local.nombre,
          tipoProductivo: local.tipoProductivo,
          empresaId,
        })

        for (const area of local.areas) {
          const areaId = makeId('area', local.slug, area.slug)

          areaRecords.push({
            id: areaId,
            nombre: area.nombre,
            localProductivoId: localId,
            actividadProductiva: area.actividadProductiva,
          })

          for (const sector of area.sectores) {
            const sectorId = makeId('sector', local.slug, area.slug, sector.slug)

            sectorRecords.push({
              id: sectorId,
              nombre: sector.nombre,
              areaId,
              tipo: sector.tipo,
            })

            for (const unidad of sector.unidades) {
              const topic = `hydroflow/${local.slug}/${area.slug}/${sector.slug}/${unidad.slug}`
              const unidadId = makeId('unidad', local.slug, area.slug, sector.slug, unidad.slug)
              const num = unidad.nombre.replace('Grupo de Bombeo ', '')

              unidadRecords.push({
                id: unidadId,
                nombre: unidad.nombre,
                sectorId,
                topicMqtt: topic,
                configuracion: { ancho_canal: unidad.anchoCanal },
              })

              equipoRecords.push(
                {
                  nombre: `Bomba ${num}`,
                  tipo: 'bomba',
                  marca: 'Flygt',
                  modelo: 'NP 3127',
                  especificaciones: {
                    potencia_hp: 25,
                    caudal_max_lps: 350,
                    altura_max_m: 5.2,
                    diametro_impulsor_mm: 300,
                  },
                  unidadProduccionId: unidadId,
                },
                {
                  nombre: `Motor ${num}`,
                  tipo: 'motor',
                  marca: 'WEG',
                  modelo: 'W22 Plus',
                  especificaciones: {
                    voltaje_nominal: 440,
                    corriente_nominal: 28,
                    potencia_kw: 18.5,
                    velocidad_rpm: 1770,
                    factor_potencia: 0.87,
                  },
                  unidadProduccionId: unidadId,
                },
                {
                  nombre: `Reductor ${num}`,
                  tipo: 'reductor',
                  marca: 'SEW-Eurodrive',
                  modelo: 'R87',
                  especificaciones: {
                    relacion_reduccion: '7.5:1',
                    torque_salida_nm: 820,
                    velocidad_salida_rpm: 236,
                  },
                  unidadProduccionId: unidadId,
                },
              )
            }
          }
        }
      }
    }
  }

  // Batch-insert in dependency order
  await prisma.grupoCorporativo.createMany({ data: grupoRecords })
  console.log(`Created ${grupoRecords.length} grupos corporativos`)

  await prisma.empresa.createMany({ data: empresaRecords })
  console.log(`Created ${empresaRecords.length} empresas`)

  await prisma.localProductivo.createMany({ data: localRecords })
  console.log(`Created ${localRecords.length} locales productivos`)

  await prisma.area.createMany({ data: areaRecords })
  console.log(`Created ${areaRecords.length} areas`)

  await prisma.sector.createMany({ data: sectorRecords })
  console.log(`Created ${sectorRecords.length} sectores`)

  await prisma.unidadProduccion.createMany({ data: unidadRecords })
  console.log(`Created ${unidadRecords.length} unidades de produccion`)

  await prisma.equipo.createMany({ data: equipoRecords })
  console.log(`Created ${equipoRecords.length} equipos`)

  // Seed device types
  await prisma.tipoDispositivo.createMany({
    data: [
      { codigo: 'PLC', nombre: 'Controlador Lógico Programable' },
      { codigo: 'NOD', nombre: 'Nodo IOT' },
    ],
  })
  console.log('Created 2 tipos de dispositivo')

  // ------------------------------------------------------------------
  // Admin user
  // ------------------------------------------------------------------

  const hashedPassword = await argon2.hash('admin123')

  await prisma.usuario.create({
    data: {
      id: 'seed-user-admin',
      nombre: 'Admin',
      apellido: 'HydroFlow',
      email: 'admin@hydro-flow.io',
      contrasena: hashedPassword,
      rol: 'ADMIN',
      esAdminEmpresa: false,
      empresaId: produmarId,
    },
  })

  console.log('Created admin user')
  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
