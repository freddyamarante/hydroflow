-- CreateEnum
CREATE TYPE "RolLocal" AS ENUM ('SUPERVISOR', 'VISOR');

-- AlterEnum: Replace Rol values (ADMIN, SUPERVISOR, VISOR) -> (ADMIN, USER)
-- Step 1: Map existing SUPERVISOR/VISOR users to USER
UPDATE "usuario" SET "rol" = 'ADMIN' WHERE "rol" = 'ADMIN';

-- Step 2: Add RolLocal column to usuario_local_productivo with default VISOR
ALTER TABLE "usuario_local_productivo" ADD COLUMN "rol" "RolLocal" NOT NULL DEFAULT 'VISOR';

-- Step 3: Set local roles based on old system role before we change the enum
-- Users who were SUPERVISOR get SUPERVISOR on their local links
UPDATE "usuario_local_productivo" ulp
SET "rol" = 'SUPERVISOR'
FROM "usuario" u
WHERE ulp."usuarioId" = u."id" AND u."rol" = 'SUPERVISOR';

-- Step 4: Rename old enum and create new one
ALTER TYPE "Rol" RENAME TO "Rol_old";
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'USER');

-- Step 5: Convert column to use new enum, mapping SUPERVISOR and VISOR to USER
ALTER TABLE "usuario" ALTER COLUMN "rol" DROP DEFAULT;
ALTER TABLE "usuario" ALTER COLUMN "rol" TYPE "Rol" USING (
  CASE
    WHEN "rol"::text = 'ADMIN' THEN 'ADMIN'::"Rol"
    ELSE 'USER'::"Rol"
  END
);
ALTER TABLE "usuario" ALTER COLUMN "rol" SET DEFAULT 'USER';

-- Step 6: Drop old enum
DROP TYPE "Rol_old";

-- Step 7: Add esAdminEmpresa column
ALTER TABLE "usuario" ADD COLUMN "esAdminEmpresa" BOOLEAN NOT NULL DEFAULT false;
