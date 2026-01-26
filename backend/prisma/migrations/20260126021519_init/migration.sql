-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SUPERVISOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "TipoModulo" AS ENUM ('DESCARGA_ABIERTA', 'DESCARGA_CERRADA', 'COMPUERTA_RIO');

-- CreateEnum
CREATE TYPE "TipoEquipo" AS ENUM ('BOMBA', 'MOTOR_ELECTRICO', 'MOTOR_COMBUSTION', 'REDUCTOR');

-- CreateEnum
CREATE TYPE "Operador" AS ENUM ('MAYOR_QUE', 'MENOR_QUE', 'IGUAL_A', 'DIFERENTE_DE', 'FUERA_DE_RANGO');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('SENSOR_DESCONECTADO', 'VALOR_FUERA_RANGO', 'REGLA_VIOLADA', 'EQUIPO_FALLA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFinca" (
    "userId" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,

    CONSTRAINT "UserFinca_pkey" PRIMARY KEY ("userId","fincaId")
);

-- CreateTable
CREATE TABLE "GrupoCorporativo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoCorporativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "grupoCorporativoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finca" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "ubicacion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "fincaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstacionBombeo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "ubicacion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstacionBombeo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoBombeo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estacionId" TEXT NOT NULL,
    "tipoModulo" "TipoModulo" NOT NULL,
    "mqttTopic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoBombeo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoEquipo" NOT NULL,
    "grupoBombeoId" TEXT NOT NULL,
    "parametrosTeoricos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lectura" (
    "id" TEXT NOT NULL,
    "grupoBombeoId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datos" JSONB NOT NULL,

    CONSTRAINT "Lectura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regla" (
    "id" TEXT NOT NULL,
    "grupoBombeoId" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "operador" "Operador" NOT NULL,
    "valorTeorico" DOUBLE PRECISION NOT NULL,
    "tolerancia" DOUBLE PRECISION NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" TEXT NOT NULL,
    "grupoBombeoId" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "datos" JSONB,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resueltaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoBombeo_mqttTopic_key" ON "GrupoBombeo"("mqttTopic");

-- CreateIndex
CREATE INDEX "Lectura_grupoBombeoId_timestamp_idx" ON "Lectura"("grupoBombeoId", "timestamp");

-- CreateIndex
CREATE INDEX "Alerta_grupoBombeoId_createdAt_idx" ON "Alerta"("grupoBombeoId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserFinca" ADD CONSTRAINT "UserFinca_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFinca" ADD CONSTRAINT "UserFinca_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_grupoCorporativoId_fkey" FOREIGN KEY ("grupoCorporativoId") REFERENCES "GrupoCorporativo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finca" ADD CONSTRAINT "Finca_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sector" ADD CONSTRAINT "Sector_fincaId_fkey" FOREIGN KEY ("fincaId") REFERENCES "Finca"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstacionBombeo" ADD CONSTRAINT "EstacionBombeo_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoBombeo" ADD CONSTRAINT "GrupoBombeo_estacionId_fkey" FOREIGN KEY ("estacionId") REFERENCES "EstacionBombeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_grupoBombeoId_fkey" FOREIGN KEY ("grupoBombeoId") REFERENCES "GrupoBombeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lectura" ADD CONSTRAINT "Lectura_grupoBombeoId_fkey" FOREIGN KEY ("grupoBombeoId") REFERENCES "GrupoBombeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Regla" ADD CONSTRAINT "Regla_grupoBombeoId_fkey" FOREIGN KEY ("grupoBombeoId") REFERENCES "GrupoBombeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_grupoBombeoId_fkey" FOREIGN KEY ("grupoBombeoId") REFERENCES "GrupoBombeo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
