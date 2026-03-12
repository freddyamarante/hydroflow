-- CreateTable
CREATE TABLE "equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "especificaciones" JSONB,
    "unidadProduccionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_unidadProduccionId_fkey" FOREIGN KEY ("unidadProduccionId") REFERENCES "unidad_produccion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
