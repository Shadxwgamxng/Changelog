-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('GEPLANT', 'ABGESCHLOSSEN', 'ABGESAGT');

-- CreateEnum
CREATE TYPE "CourseParticipantStatus" AS ENUM ('ANGEMELDET', 'WARTELISTE', 'ABGEMELDET', 'BESTANDEN', 'NICHT_BESTANDEN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'LEHRGANG';
ALTER TYPE "NotificationType" ADD VALUE 'LEHRGANG_ERGEBNIS';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "discordId" TEXT,
ADD COLUMN     "discordName" TEXT;

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "signupDeadline" TIMESTAMP(3),
    "capacity" INTEGER,
    "qualificationTypeId" TEXT,
    "prerequisiteIds" TEXT[],
    "leadHelperId" TEXT,
    "instructors" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'GEPLANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseParticipant" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "status" "CourseParticipantStatus" NOT NULL DEFAULT 'ANGEMELDET',
    "note" TEXT,
    "result" TEXT,
    "assessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "participantId" TEXT,
    "courseId" TEXT,
    "helperQualificationId" TEXT,
    "holderName" TEXT NOT NULL,
    "courseTitle" TEXT NOT NULL,
    "qualificationName" TEXT,
    "unitName" TEXT NOT NULL,
    "courseStartsAt" TIMESTAMP(3) NOT NULL,
    "courseEndsAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "issuedByName" TEXT NOT NULL,
    "instructors" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_unitId_startsAt_idx" ON "Course"("unitId", "startsAt");

-- CreateIndex
CREATE INDEX "CourseParticipant_helperId_idx" ON "CourseParticipant"("helperId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseParticipant_courseId_helperId_key" ON "CourseParticipant"("courseId", "helperId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_number_key" ON "Certificate"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_code_key" ON "Certificate"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_participantId_key" ON "Certificate"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_helperQualificationId_key" ON "Certificate"("helperQualificationId");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_qualificationTypeId_fkey" FOREIGN KEY ("qualificationTypeId") REFERENCES "QualificationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_leadHelperId_fkey" FOREIGN KEY ("leadHelperId") REFERENCES "Helper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseParticipant" ADD CONSTRAINT "CourseParticipant_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseParticipant" ADD CONSTRAINT "CourseParticipant_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "CourseParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_helperQualificationId_fkey" FOREIGN KEY ("helperQualificationId") REFERENCES "HelperQualification"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Fortlaufende Zertifikatsnummern
CREATE SEQUENCE "certificate_number_seq" START 1;

-- Neue Rechte für bestehende Systemrollen (angepasste Rechte bleiben erhalten)
UPDATE "RoleDefinition" SET "permissions" = array_append("permissions", 'course.view')
  WHERE "system" AND "key" IN ('EINHEITENLEITER', 'BEREITSCHAFTSLEITER', 'ZUGFUEHRER', 'GRUPPENFUEHRER', 'DIENSTPLANER', 'HELFER') AND NOT ('course.view' = ANY("permissions"));
UPDATE "RoleDefinition" SET "permissions" = array_append("permissions", 'course.manage')
  WHERE "system" AND "key" IN ('EINHEITENLEITER', 'BEREITSCHAFTSLEITER') AND NOT ('course.manage' = ANY("permissions"));

-- Neue Rollenvorlage „Ausbilder“
INSERT INTO "RoleDefinition" ("id", "key", "name", "description", "rank", "permissions", "system")
VALUES ('role_ausbilder', 'AUSBILDER', 'Ausbilder', 'Plant Lehrgänge, bewertet Teilnehmer und stellt Zertifikate aus.', 40,
  ARRAY['shift.view', 'event.view', 'vehicle.view', 'material.view', 'document.view', 'helper.view', 'qualification.view', 'course.view', 'course.manage'], true)
ON CONFLICT ("key") DO NOTHING;
