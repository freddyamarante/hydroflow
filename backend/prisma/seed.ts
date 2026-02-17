import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing existing data...')

  // Delete in reverse dependency order
  await prisma.lectura.deleteMany()
  await prisma.alerta.deleteMany()
  await prisma.regla.deleteMany()
  await prisma.equipo.deleteMany()
  await prisma.unidadProduccion.deleteMany()
  await prisma.sector.deleteMany()
  await prisma.area.deleteMany()
  await prisma.usuarioLocalProductivo.deleteMany()
  await prisma.localProductivo.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.empresa.deleteMany()
  await prisma.grupoCorporativo.deleteMany()

  console.log('Seeding hierarchy...')

  // ============================================
  // 1. GRUPO CORPORATIVO
  // ============================================
  const grupo = await prisma.grupoCorporativo.create({
    data: {
      id: 'seed-grupo-almar',
      razonSocial: 'Grupo Almar',
      tipoIndustria: 'Acuicultura',
      direccion: 'Guayaquil, Ecuador',
    },
  })

  // ============================================
  // 2. EMPRESAS
  // ============================================
  const produmar = await prisma.empresa.create({
    data: {
      id: 'seed-empresa-produmar',
      razonSocial: 'Produmar S.A.',
      marcaComercial: 'Produmar',
      ruc: '0992123456001',
      actividadEconomica: 'Criadero de camaron',
      grupoCorporativoId: grupo.id,
    },
  })

  const acuacorp = await prisma.empresa.create({
    data: {
      id: 'seed-empresa-acuacorp',
      razonSocial: 'Acuacorp S.A.',
      marcaComercial: 'Acuacorp',
      ruc: '0991987654001',
      actividadEconomica: 'Laboratorio de larvas',
      grupoCorporativoId: grupo.id,
    },
  })

  // ============================================
  // 3. LOCALES PRODUCTIVOS
  // ============================================
  const fincaDelia = await prisma.localProductivo.create({
    data: {
      id: 'seed-local-delia',
      nombre: 'Finca Delia',
      tipoProductivo: 'finca',
      empresaId: produmar.id,
    },
  })

  const fincaSantay = await prisma.localProductivo.create({
    data: {
      id: 'seed-local-santay',
      nombre: 'Finca Santay',
      tipoProductivo: 'finca',
      empresaId: produmar.id,
    },
  })

  const labCentral = await prisma.localProductivo.create({
    data: {
      id: 'seed-local-lab',
      nombre: 'Laboratorio Central',
      tipoProductivo: 'laboratorio',
      empresaId: acuacorp.id,
    },
  })

  // ============================================
  // 4. AREAS
  // ============================================

  // Finca Delia: 2 areas
  const deliaZonaNorte = await prisma.area.create({
    data: {
      id: 'seed-area-delia-norte',
      nombre: 'Zona Norte',
      localProductivoId: fincaDelia.id,
      actividadProductiva: 'Engorde',
    },
  })

  const deliaZonaSur = await prisma.area.create({
    data: {
      id: 'seed-area-delia-sur',
      nombre: 'Zona Sur',
      localProductivoId: fincaDelia.id,
      actividadProductiva: 'Engorde',
    },
  })

  // Finca Santay: 2 areas
  const santayZonaEste = await prisma.area.create({
    data: {
      id: 'seed-area-santay-este',
      nombre: 'Zona Este',
      localProductivoId: fincaSantay.id,
      actividadProductiva: 'Engorde',
    },
  })

  const santayZonaOeste = await prisma.area.create({
    data: {
      id: 'seed-area-santay-oeste',
      nombre: 'Zona Oeste',
      localProductivoId: fincaSantay.id,
      actividadProductiva: 'Pre-cria',
    },
  })

  // Laboratorio Central: 1 area
  const labSalaA = await prisma.area.create({
    data: {
      id: 'seed-area-lab-sala-a',
      nombre: 'Sala A',
      localProductivoId: labCentral.id,
      actividadProductiva: 'Larvicultura',
    },
  })

  // ============================================
  // 5. SECTORES
  // ============================================

  // Finca Delia - Zona Norte: 2 sectores
  const delNorteEst1 = await prisma.sector.create({
    data: {
      id: 'seed-sector-delia-norte-est1',
      nombre: 'Estacion 1',
      areaId: deliaZonaNorte.id,
      tipo: 'axial abierto',
    },
  })

  const delNorteEst2 = await prisma.sector.create({
    data: {
      id: 'seed-sector-delia-norte-est2',
      nombre: 'Estacion 2',
      areaId: deliaZonaNorte.id,
      tipo: 'axial abierto',
    },
  })

  // Finca Delia - Zona Sur: 2 sectores
  const delSurEst3 = await prisma.sector.create({
    data: {
      id: 'seed-sector-delia-sur-est3',
      nombre: 'Estacion 3',
      areaId: deliaZonaSur.id,
      tipo: 'axial abierto',
    },
  })

  const delSurEst4 = await prisma.sector.create({
    data: {
      id: 'seed-sector-delia-sur-est4',
      nombre: 'Estacion 4',
      areaId: deliaZonaSur.id,
      tipo: 'axial cerrado',
    },
  })

  // Finca Santay - Zona Este: 2 sectores
  const sanEsteEst1 = await prisma.sector.create({
    data: {
      id: 'seed-sector-santay-este-est1',
      nombre: 'Estacion 1',
      areaId: santayZonaEste.id,
      tipo: 'axial abierto',
    },
  })

  const sanEsteEst2 = await prisma.sector.create({
    data: {
      id: 'seed-sector-santay-este-est2',
      nombre: 'Estacion 2',
      areaId: santayZonaEste.id,
      tipo: 'axial abierto',
    },
  })

  // Finca Santay - Zona Oeste: 1 sector
  const sanOesteEst1 = await prisma.sector.create({
    data: {
      id: 'seed-sector-santay-oeste-est1',
      nombre: 'Estacion 1',
      areaId: santayZonaOeste.id,
      tipo: 'axial cerrado',
    },
  })

  // Laboratorio Central - Sala A: 1 sector
  const labSalaAModulo1 = await prisma.sector.create({
    data: {
      id: 'seed-sector-lab-sala-a-mod1',
      nombre: 'Modulo 1',
      areaId: labSalaA.id,
      tipo: 'recirculacion',
    },
  })

  // ============================================
  // 6. UNIDADES DE PRODUCCION (21 total)
  // ============================================

  interface UnidadDef {
    id: string
    nombre: string
    sectorId: string
    topicMqtt: string
    anchoCanal: number
  }

  const unidadDefs: UnidadDef[] = [
    // Finca Delia - Zona Norte - Estacion 1 (3 unidades)
    { id: 'seed-unidad-delia-n-e1-gb1', nombre: 'Grupo de Bombeo 1', sectorId: delNorteEst1.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-1', anchoCanal: 3.0 },
    { id: 'seed-unidad-delia-n-e1-gb2', nombre: 'Grupo de Bombeo 2', sectorId: delNorteEst1.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-2', anchoCanal: 3.0 },
    { id: 'seed-unidad-delia-n-e1-gb3', nombre: 'Grupo de Bombeo 3', sectorId: delNorteEst1.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-1/grupo-bombeo-3', anchoCanal: 2.5 },

    // Finca Delia - Zona Norte - Estacion 2 (3 unidades)
    { id: 'seed-unidad-delia-n-e2-gb1', nombre: 'Grupo de Bombeo 1', sectorId: delNorteEst2.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-1', anchoCanal: 3.5 },
    { id: 'seed-unidad-delia-n-e2-gb2', nombre: 'Grupo de Bombeo 2', sectorId: delNorteEst2.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-2', anchoCanal: 3.5 },
    { id: 'seed-unidad-delia-n-e2-gb3', nombre: 'Grupo de Bombeo 3', sectorId: delNorteEst2.id, topicMqtt: 'hydroflow/finca-delia/zona-norte/estacion-2/grupo-bombeo-3', anchoCanal: 3.0 },

    // Finca Delia - Zona Sur - Estacion 3 (3 unidades)
    { id: 'seed-unidad-delia-s-e3-gb1', nombre: 'Grupo de Bombeo 1', sectorId: delSurEst3.id, topicMqtt: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-1', anchoCanal: 4.0 },
    { id: 'seed-unidad-delia-s-e3-gb2', nombre: 'Grupo de Bombeo 2', sectorId: delSurEst3.id, topicMqtt: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-2', anchoCanal: 4.0 },
    { id: 'seed-unidad-delia-s-e3-gb3', nombre: 'Grupo de Bombeo 3', sectorId: delSurEst3.id, topicMqtt: 'hydroflow/finca-delia/zona-sur/estacion-3/grupo-bombeo-3', anchoCanal: 3.5 },

    // Finca Delia - Zona Sur - Estacion 4 (2 unidades)
    { id: 'seed-unidad-delia-s-e4-gb1', nombre: 'Grupo de Bombeo 1', sectorId: delSurEst4.id, topicMqtt: 'hydroflow/finca-delia/zona-sur/estacion-4/grupo-bombeo-1', anchoCanal: 3.0 },
    { id: 'seed-unidad-delia-s-e4-gb2', nombre: 'Grupo de Bombeo 2', sectorId: delSurEst4.id, topicMqtt: 'hydroflow/finca-delia/zona-sur/estacion-4/grupo-bombeo-2', anchoCanal: 3.0 },

    // Finca Santay - Zona Este - Estacion 1 (2 unidades)
    { id: 'seed-unidad-santay-e-e1-gb1', nombre: 'Grupo de Bombeo 1', sectorId: sanEsteEst1.id, topicMqtt: 'hydroflow/finca-santay/zona-este/estacion-1/grupo-bombeo-1', anchoCanal: 3.0 },
    { id: 'seed-unidad-santay-e-e1-gb2', nombre: 'Grupo de Bombeo 2', sectorId: sanEsteEst1.id, topicMqtt: 'hydroflow/finca-santay/zona-este/estacion-1/grupo-bombeo-2', anchoCanal: 3.0 },

    // Finca Santay - Zona Este - Estacion 2 (2 unidades)
    { id: 'seed-unidad-santay-e-e2-gb1', nombre: 'Grupo de Bombeo 1', sectorId: sanEsteEst2.id, topicMqtt: 'hydroflow/finca-santay/zona-este/estacion-2/grupo-bombeo-1', anchoCanal: 3.5 },
    { id: 'seed-unidad-santay-e-e2-gb2', nombre: 'Grupo de Bombeo 2', sectorId: sanEsteEst2.id, topicMqtt: 'hydroflow/finca-santay/zona-este/estacion-2/grupo-bombeo-2', anchoCanal: 3.5 },

    // Finca Santay - Zona Oeste - Estacion 1 (2 unidades)
    { id: 'seed-unidad-santay-o-e1-gb1', nombre: 'Grupo de Bombeo 1', sectorId: sanOesteEst1.id, topicMqtt: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-1', anchoCanal: 2.5 },
    { id: 'seed-unidad-santay-o-e1-gb2', nombre: 'Grupo de Bombeo 2', sectorId: sanOesteEst1.id, topicMqtt: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-2', anchoCanal: 2.5 },

    // Finca Santay - Zona Oeste - Estacion 1 (extra unit)
    { id: 'seed-unidad-santay-o-e1-gb3', nombre: 'Grupo de Bombeo 3', sectorId: sanOesteEst1.id, topicMqtt: 'hydroflow/finca-santay/zona-oeste/estacion-1/grupo-bombeo-3', anchoCanal: 3.0 },

    // Laboratorio Central - Sala A - Modulo 1 (3 unidades)
    { id: 'seed-unidad-lab-a-m1-gb1', nombre: 'Grupo de Bombeo 1', sectorId: labSalaAModulo1.id, topicMqtt: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-1', anchoCanal: 2.5 },
    { id: 'seed-unidad-lab-a-m1-gb2', nombre: 'Grupo de Bombeo 2', sectorId: labSalaAModulo1.id, topicMqtt: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-2', anchoCanal: 2.5 },
    { id: 'seed-unidad-lab-a-m1-gb3', nombre: 'Grupo de Bombeo 3', sectorId: labSalaAModulo1.id, topicMqtt: 'hydroflow/lab-central/sala-a/modulo-1/grupo-bombeo-3', anchoCanal: 3.0 },
  ]

  for (const u of unidadDefs) {
    await prisma.unidadProduccion.create({
      data: {
        id: u.id,
        nombre: u.nombre,
        sectorId: u.sectorId,
        topicMqtt: u.topicMqtt,
        configuracion: { ancho_canal: u.anchoCanal },
      },
    })
  }

  console.log(`Created ${unidadDefs.length} unidades de produccion`)

  // ============================================
  // 7. EQUIPOS (3 per unidad = 63 total)
  // ============================================

  for (const u of unidadDefs) {
    await prisma.equipo.createMany({
      data: [
        {
          nombre: `Bomba ${u.nombre.replace('Grupo de Bombeo ', '')}`,
          tipo: 'bomba',
          marca: 'Flygt',
          modelo: 'NP 3127',
          especificaciones: {
            potencia_hp: 25,
            caudal_max_lps: 350,
            altura_max_m: 5.2,
            diametro_impulsor_mm: 300,
          },
          unidadProduccionId: u.id,
        },
        {
          nombre: `Motor ${u.nombre.replace('Grupo de Bombeo ', '')}`,
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
          unidadProduccionId: u.id,
        },
        {
          nombre: `Reductor ${u.nombre.replace('Grupo de Bombeo ', '')}`,
          tipo: 'reductor',
          marca: 'SEW-Eurodrive',
          modelo: 'R87',
          especificaciones: {
            relacion_reduccion: '7.5:1',
            torque_salida_nm: 820,
            velocidad_salida_rpm: 236,
          },
          unidadProduccionId: u.id,
        },
      ],
    })
  }

  console.log(`Created ${unidadDefs.length * 3} equipos`)

  // ============================================
  // 8. USUARIOS
  // ============================================

  const hashedPassword = await argon2.hash('admin123')

  const admin = await prisma.usuario.create({
    data: {
      id: 'seed-user-admin',
      nombre: 'Admin',
      apellido: 'HydroFlow',
      email: 'admin@hydro-flow.io',
      contrasena: hashedPassword,
      rol: 'ADMIN',
      empresaId: produmar.id,
    },
  })

  const supProdumar = await prisma.usuario.create({
    data: {
      id: 'seed-user-sup-produmar',
      nombre: 'Carlos',
      apellido: 'Mendoza',
      email: 'supervisor@produmar.com',
      contrasena: hashedPassword,
      rol: 'SUPERVISOR',
      empresaId: produmar.id,
    },
  })

  const visorProdumar = await prisma.usuario.create({
    data: {
      id: 'seed-user-visor-produmar',
      nombre: 'Maria',
      apellido: 'Torres',
      email: 'visor@produmar.com',
      contrasena: hashedPassword,
      rol: 'VISOR',
      empresaId: produmar.id,
    },
  })

  const supAcuacorp = await prisma.usuario.create({
    data: {
      id: 'seed-user-sup-acuacorp',
      nombre: 'Jorge',
      apellido: 'Ramirez',
      email: 'supervisor@acuacorp.com',
      contrasena: hashedPassword,
      rol: 'SUPERVISOR',
      empresaId: acuacorp.id,
    },
  })

  console.log('Created 4 users')

  // ============================================
  // 9. USUARIO-LOCAL PRODUCTIVO (permissions)
  // ============================================

  // supervisor@produmar -> Finca Delia + Finca Santay
  await prisma.usuarioLocalProductivo.createMany({
    data: [
      { usuarioId: supProdumar.id, localProductivoId: fincaDelia.id },
      { usuarioId: supProdumar.id, localProductivoId: fincaSantay.id },
    ],
  })

  // visor@produmar -> Finca Delia only
  await prisma.usuarioLocalProductivo.create({
    data: {
      usuarioId: visorProdumar.id,
      localProductivoId: fincaDelia.id,
    },
  })

  // supervisor@acuacorp -> Laboratorio Central
  await prisma.usuarioLocalProductivo.create({
    data: {
      usuarioId: supAcuacorp.id,
      localProductivoId: labCentral.id,
    },
  })

  console.log('Created user-local permissions')
  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
