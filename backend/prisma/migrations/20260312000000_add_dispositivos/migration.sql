-- CreateTable
CREATE TABLE "tipo_dispositivo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipo_dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispositivo" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipoDispositivoId" TEXT NOT NULL,
    "areaActividad" TEXT NOT NULL,
    "asignado" BOOLEAN NOT NULL DEFAULT false,
    "sectorId" TEXT,
    "localProductivoId" TEXT NOT NULL,
    "configuracionMqtt" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispositivo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_dispositivo_codigo_key" ON "tipo_dispositivo"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "dispositivo_codigo_key" ON "dispositivo"("codigo");

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_tipoDispositivoId_fkey" FOREIGN KEY ("tipoDispositivoId") REFERENCES "tipo_dispositivo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispositivo" ADD CONSTRAINT "dispositivo_localProductivoId_fkey" FOREIGN KEY ("localProductivoId") REFERENCES "local_productivo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddColumn (link unidad_produccion to dispositivo)
ALTER TABLE "unidad_produccion" ADD COLUMN "dispositivoId" TEXT;

-- AddForeignKey
ALTER TABLE "unidad_produccion" ADD CONSTRAINT "unidad_produccion_dispositivoId_fkey" FOREIGN KEY ("dispositivoId") REFERENCES "dispositivo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
