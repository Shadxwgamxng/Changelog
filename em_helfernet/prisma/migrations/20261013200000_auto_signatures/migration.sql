-- AlterTable
ALTER TABLE "CertificateTemplate" ADD COLUMN     "sig1Mode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "sig2Mode" TEXT NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "signatureFont" TEXT NOT NULL DEFAULT 'GREAT_VIBES',
ADD COLUMN     "signatureForm" TEXT NOT NULL DEFAULT 'KURZ',
ADD COLUMN     "signatureInk" TEXT NOT NULL DEFAULT '#1a3a8a';


-- Bereits hochgeladene Unterschriftsbilder weiter verwenden
UPDATE "CertificateTemplate" SET "sig1Mode" = 'BILD' WHERE "sig1Image" IS NOT NULL;
UPDATE "CertificateTemplate" SET "sig2Mode" = 'BILD' WHERE "sig2Image" IS NOT NULL;
