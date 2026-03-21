import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('Demo seed: creating admin user only...')

  // Clear any existing data
  await prisma.lectura.deleteMany()
  await prisma.alerta.deleteMany()
  await prisma.regla.deleteMany()
  await prisma.equipo.deleteMany()
  await prisma.unidadProduccion.deleteMany()
  await prisma.variableDefinicion.deleteMany()
  await prisma.tipoUnidadProduccion.deleteMany()
  await prisma.tipoActividadProductiva.deleteMany()
  await prisma.dispositivo.deleteMany().catch(() => {})
  await prisma.tipoDispositivo.deleteMany().catch(() => {})
  await prisma.sector.deleteMany()
  await prisma.area.deleteMany()
  await prisma.usuarioLocalProductivo.deleteMany()
  await prisma.localProductivo.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.empresa.deleteMany()
  await prisma.grupoCorporativo.deleteMany()

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
    },
  })

  console.log('Created admin user: admin@hydro-flow.io / admin123')
  console.log('Demo seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
