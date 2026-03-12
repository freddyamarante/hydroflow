-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'SUPERVISOR', 'VISOR');

-- CreateEnum
CREATE TYPE "Operador" AS ENUM ('MAYOR_QUE', 'MENOR_QUE', 'IGUAL_A', 'DIFERENTE_DE', 'FUERA_DE_RANGO');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contrasena" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT,
    "telefono" TEXT,
    "empresaId" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'VISOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_local_productivo" (
    "usuarioId" TEXT NOT NULL,
    "localProductivoId" TEXT NOT NULL,

    CONSTRAINT "usuario_local_productivo_pkey" PRIMARY KEY ("usuarioId","localProductivoId")
);

-- CreateTable
CREATE TABLE "grupo_corporativo" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "tipoIndustria" TEXT,
    "direccion" TEXT,
    "ubicacionDomiciliaria" TEXT,
    "paginaWeb" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupo_corporativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresa" (
    "id" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "marcaComercial" TEXT,
    "ruc" TEXT,
    "actividadEconomica" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "ubicacionDomiciliaria" TEXT,
    "areaProduccion" TEXT,
    "paginaWeb" TEXT,
    "grupoCorporativoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_productivo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipoProductivo" TEXT,
    "empresaId" TEXT NOT NULL,
    "bounds" JSONB,
    "areaProduccion" TEXT,
    "direccion" TEXT,
    "ubicacionDomiciliaria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "local_productivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "area" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "localProductivoId" TEXT NOT NULL,
    "actividadProductiva" TEXT,
    "bounds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sector" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "tipo" TEXT,
    "bounds" JSONB,
    "detalles" JSONB,
    "usuarioResponsableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidad_produccion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "posicion" JSONB,
    "detalles" JSONB,
    "tipoModuloId" TEXT,
    "topicMqtt" TEXT NOT NULL,
    "configuracion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidad_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lectura" (
    "id" TEXT NOT NULL,
    "unidadProduccionId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valores" JSONB NOT NULL,

    CONSTRAINT "lectura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regla" (
    "id" TEXT NOT NULL,
    "unidadProduccionId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "variable" TEXT NOT NULL,
    "operador" "Operador" NOT NULL,
    "compararCon" TEXT,
    "valorFijo" DOUBLE PRECISION,
    "codigoEspecificacion" TEXT,
    "toleranciaPorcentaje" DOUBLE PRECISION,
    "severidad" "Severidad" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerta" (
    "id" TEXT NOT NULL,
    "unidadProduccionId" TEXT NOT NULL,
    "reglaId" TEXT,
    "mensaje" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL,
    "contexto" JSONB,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resueltaEn" TIMESTAMP(3),
    "resueltaPor" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_produccion_topicMqtt_key" ON "unidad_produccion"("topicMqtt");

-- CreateIndex
CREATE INDEX "lectura_unidadProduccionId_timestamp_idx" ON "lectura"("unidadProduccionId", "timestamp" DESC);

-- CreateIndex
CREATE INDEX "lectura_timestamp_idx" ON "lectura"("timestamp" DESC);

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_local_productivo" ADD CONSTRAINT "usuario_local_productivo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_local_productivo" ADD CONSTRAINT "usuario_local_productivo_localProductivoId_fkey" FOREIGN KEY ("localProductivoId") REFERENCES "local_productivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresa" ADD CONSTRAINT "empresa_grupoCorporativoId_fkey" FOREIGN KEY ("grupoCorporativoId") REFERENCES "grupo_corporativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_productivo" ADD CONSTRAINT "local_productivo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "area" ADD CONSTRAINT "area_localProductivoId_fkey" FOREIGN KEY ("localProductivoId") REFERENCES "local_productivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector" ADD CONSTRAINT "sector_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "area"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sector" ADD CONSTRAINT "sector_usuarioResponsableId_fkey" FOREIGN KEY ("usuarioResponsableId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unidad_produccion" ADD CONSTRAINT "unidad_produccion_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lectura" ADD CONSTRAINT "lectura_unidadProduccionId_fkey" FOREIGN KEY ("unidadProduccionId") REFERENCES "unidad_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regla" ADD CONSTRAINT "regla_unidadProduccionId_fkey" FOREIGN KEY ("unidadProduccionId") REFERENCES "unidad_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerta" ADD CONSTRAINT "alerta_unidadProduccionId_fkey" FOREIGN KEY ("unidadProduccionId") REFERENCES "unidad_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
