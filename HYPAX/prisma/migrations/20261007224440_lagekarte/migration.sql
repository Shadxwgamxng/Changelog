-- CreateEnum
CREATE TYPE "MapObjectKind" AS ENUM ('MARKER', 'LINE', 'AREA', 'TEXT');

-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "mapLat" DOUBLE PRECISION,
ADD COLUMN     "mapLng" DOUBLE PRECISION,
ADD COLUMN     "mapZoom" INTEGER;

-- CreateTable
CREATE TABLE "MapObject" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "kind" "MapObjectKind" NOT NULL,
    "preset" TEXT NOT NULL,
    "coords" JSONB NOT NULL,
    "label" TEXT,
    "note" TEXT,
    "color" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MapObject_shiftId_idx" ON "MapObject"("shiftId");

-- AddForeignKey
ALTER TABLE "MapObject" ADD CONSTRAINT "MapObject_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
