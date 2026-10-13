-- AlterEnum
ALTER TYPE "DocCategory" ADD VALUE 'ZERTIFIKAT';

-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "documentId" TEXT,
ADD COLUMN     "helperId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_documentId_key" ON "Certificate"("documentId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Inhaber für bestehende Zertifikate aus der Lehrgangsteilnahme übernehmen
UPDATE "Certificate" c SET "helperId" = p."helperId" FROM "CourseParticipant" p WHERE c."participantId" = p.id AND c."helperId" IS NULL;
