-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('NONE', 'SUPERADMIN', 'SYSTEMADMIN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('KREISVERBAND', 'ORTSVEREIN', 'BEREITSCHAFT', 'EINSATZEINHEIT', 'SEG', 'WASSERWACHT', 'JUGENDROTKREUZ', 'SONSTIGE');

-- CreateEnum
CREATE TYPE "AssignmentScope" AS ENUM ('UNIT', 'SUBTREE');

-- CreateEnum
CREATE TYPE "HelperStatus" AS ENUM ('AKTIV', 'PASSIV', 'INAKTIV', 'AUSGETRETEN', 'ANONYMISIERT');

-- CreateEnum
CREATE TYPE "QualCategory" AS ENUM ('AUSBILDUNG', 'LEHRGANG', 'FUEHRERSCHEIN', 'MEDIZIN', 'FUNK', 'SANITAET', 'FUEHRUNG', 'TECHNIK', 'SONDER');

-- CreateEnum
CREATE TYPE "QualStatus" AS ENUM ('GUELTIG', 'IN_PRUEFUNG', 'WIDERRUFEN');

-- CreateEnum
CREATE TYPE "ShiftKind" AS ENUM ('SANITAETSDIENST', 'BEREITSCHAFTSABEND', 'AUSBILDUNG', 'BESPRECHUNG', 'EINSATZ', 'UEBUNG', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('ENTWURF', 'OFFEN', 'ABGESAGT', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('EINGELADEN', 'ANGEFRAGT', 'BESTAETIGT', 'WARTELISTE', 'ABGELEHNT', 'ZURUECKGEZOGEN');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('SELBST', 'PLANER');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('VERFUEGBAR', 'EINGESCHRAENKT', 'NICHT_VERFUEGBAR');

-- CreateEnum
CREATE TYPE "AvailabilityReason" AS ENUM ('URLAUB', 'SCHULE', 'ARBEIT', 'KRANKHEIT', 'PRIVAT', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('EINSATZBEREIT', 'EINGESCHRAENKT', 'NICHT_EINSATZBEREIT', 'IN_WARTUNG');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('OK', 'DEFEKT', 'IN_WARTUNG', 'AUSGESONDERT');

-- CreateEnum
CREATE TYPE "DocCategory" AS ENUM ('QUALIFIKATIONSNACHWEIS', 'DIENSTANWEISUNG', 'AUSBILDUNG', 'FAHRZEUG', 'PRUEFBERICHT', 'INTERN');

-- CreateEnum
CREATE TYPE "DocAccess" AS ENUM ('HELFER', 'FUEHRUNG', 'PERSOENLICH');

-- CreateEnum
CREATE TYPE "AlertAudienceType" AS ENUM ('EINHEIT', 'GRUPPE', 'QUALIFIKATION', 'ALARMGRUPPE');

-- CreateEnum
CREATE TYPE "AlertResponse" AS ENUM ('OFFEN', 'KOMME', 'VIELLEICHT', 'KANN_NICHT');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('AKTIV', 'BEENDET');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('LAUFEND', 'ABGESCHLOSSEN');

-- CreateEnum
CREATE TYPE "EventTaskKind" AS ENUM ('SANITAETSDIENST', 'EINSATZLEITUNG', 'FAHRZEUG', 'MATERIAL', 'FUNK', 'SONSTIGES');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DIENST_NEU', 'DIENST_ANFRAGE', 'DIENST_BESTAETIGT', 'DIENST_ABGELEHNT', 'DIENST_GEAENDERT', 'DIENST_ABGESAGT', 'ALARM', 'NACHRICHT', 'BEKANNTMACHUNG', 'QUALIFIKATION_LAEUFT_AB', 'DOKUMENT_LAEUFT_AB', 'VERANSTALTUNG_GEAENDERT', 'SYSTEM');

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "UnitType" NOT NULL,
    "parentId" TEXT,
    "path" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'NONE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePw" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totpSecretEnc" TEXT,
    "totpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "recoveryHashes" TEXT[],
    "icalToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "twoFactorOk" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "permissions" TEXT[],
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scope" "AssignmentScope" NOT NULL DEFAULT 'UNIT',
    "grants" TEXT[],
    "denies" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Helper" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "zip" TEXT,
    "city" TEXT,
    "memberNumber" TEXT,
    "status" "HelperStatus" NOT NULL DEFAULT 'AKTIV',
    "joinedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "groupName" TEXT,
    "functions" TEXT[],
    "dienststellung" TEXT,
    "leadershipRole" TEXT,
    "internalNotes" TEXT,
    "maxShiftsPerMonth" INTEGER,
    "minRestHours" INTEGER NOT NULL DEFAULT 11,
    "preferredKinds" "ShiftKind"[],
    "preferredWeekdays" INTEGER[],
    "anonymizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Helper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationType" (
    "id" TEXT NOT NULL,
    "unitId" TEXT,
    "name" TEXT NOT NULL,
    "category" "QualCategory" NOT NULL,
    "validityMonths" INTEGER,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "QualificationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualificationCover" (
    "typeId" TEXT NOT NULL,
    "coversTypeId" TEXT NOT NULL,

    CONSTRAINT "QualificationCover_pkey" PRIMARY KEY ("typeId","coversTypeId")
);

-- CreateTable
CREATE TABLE "HelperQualification" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "status" "QualStatus" NOT NULL DEFAULT 'GUELTIG',
    "note" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "warnedLevel" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HelperQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL,
    "reason" "AvailabilityReason",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "organizer" TEXT,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTask" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "kind" "EventTaskKind" NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EventTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "eventId" TEXT,
    "name" TEXT NOT NULL,
    "kind" "ShiftKind" NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "meetingPoint" TEXT,
    "location" TEXT,
    "organizer" TEXT,
    "description" TEXT,
    "responsibleId" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'ENTWURF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRequirement" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "functionKey" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShiftRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftRequirementQualification" (
    "requirementId" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,

    CONSTRAINT "ShiftRequirementQualification_pkey" PRIMARY KEY ("requirementId","typeId")
);

-- CreateTable
CREATE TABLE "ShiftAssignment" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "requirementId" TEXT,
    "status" "AssignmentStatus" NOT NULL,
    "source" "AssignmentSource" NOT NULL,
    "note" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "workedMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftVehicle" (
    "shiftId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "ShiftVehicle_pkey" PRIMARY KEY ("shiftId","vehicleId")
);

-- CreateTable
CREATE TABLE "ShiftMaterial" (
    "shiftId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ShiftMaterial_pkey" PRIMARY KEY ("shiftId","materialId")
);

-- CreateTable
CREATE TABLE "AlertGroup" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AlertGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertGroupMember" (
    "groupId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,

    CONSTRAINT "AlertGroupMember_pkey" PRIMARY KEY ("groupId","helperId")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "meetingPoint" TEXT,
    "meetingTime" TIMESTAMP(3),
    "audienceType" "AlertAudienceType" NOT NULL,
    "audienceRef" TEXT,
    "alertGroupId" TEXT,
    "shiftId" TEXT,
    "status" "AlertStatus" NOT NULL DEFAULT 'AKTIV',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertRecipient" (
    "alertId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "response" "AlertResponse" NOT NULL DEFAULT 'OFFEN',
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "AlertRecipient_pkey" PRIMARY KEY ("alertId","helperId")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "alertedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "location" TEXT,
    "documentation" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'LAUFEND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentHelper" (
    "incidentId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "IncidentHelper_pkey" PRIMARY KEY ("incidentId","helperId")
);

-- CreateTable
CREATE TABLE "IncidentVehicle" (
    "incidentId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,

    CONSTRAINT "IncidentVehicle_pkey" PRIMARY KEY ("incidentId","vehicleId")
);

-- CreateTable
CREATE TABLE "IncidentMaterial" (
    "incidentId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "IncidentMaterial_pkey" PRIMARY KEY ("incidentId","materialId")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "callSign" TEXT,
    "plate" TEXT,
    "type" TEXT,
    "location" TEXT,
    "odometerKm" INTEGER,
    "tuvDue" DATE,
    "huDue" DATE,
    "insuranceDue" DATE,
    "status" "VehicleStatus" NOT NULL DEFAULT 'EINSATZBEREIT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "odometerKm" INTEGER,
    "cost" DECIMAL(10,2),
    "nextDue" DATE,

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT,
    "serialNumber" TEXT,
    "maintenanceDue" DATE,
    "expiresAt" DATE,
    "status" "MaterialStatus" NOT NULL DEFAULT 'OK',
    "responsibleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocCategory" NOT NULL,
    "access" "DocAccess" NOT NULL DEFAULT 'FUEHRUNG',
    "ownerHelperId" TEXT,
    "vehicleId" TEXT,
    "expiresAt" DATE,
    "warnedExpiry" BOOLEAN NOT NULL DEFAULT false,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageRecipient" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("messageId","userId")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "inApp" BOOLEAN NOT NULL DEFAULT true,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "push" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("userId","type")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "unitId" TEXT,
    "summary" TEXT NOT NULL,
    "changes" JSONB,
    "ip" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_path_key" ON "OrgUnit"("path");

-- CreateIndex
CREATE INDEX "OrgUnit_parentId_idx" ON "OrgUnit"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_icalToken_key" ON "User"("icalToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_key_key" ON "RoleDefinition"("key");

-- CreateIndex
CREATE INDEX "RoleAssignment_userId_idx" ON "RoleAssignment"("userId");

-- CreateIndex
CREATE INDEX "RoleAssignment_unitId_idx" ON "RoleAssignment"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleAssignment_userId_unitId_roleId_key" ON "RoleAssignment"("userId", "unitId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Helper_userId_key" ON "Helper"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Helper_memberNumber_key" ON "Helper"("memberNumber");

-- CreateIndex
CREATE INDEX "Helper_unitId_status_idx" ON "Helper"("unitId", "status");

-- CreateIndex
CREATE INDEX "Helper_lastName_firstName_idx" ON "Helper"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "QualificationType_unitId_name_key" ON "QualificationType"("unitId", "name");

-- CreateIndex
CREATE INDEX "HelperQualification_helperId_idx" ON "HelperQualification"("helperId");

-- CreateIndex
CREATE INDEX "HelperQualification_typeId_idx" ON "HelperQualification"("typeId");

-- CreateIndex
CREATE INDEX "HelperQualification_validUntil_idx" ON "HelperQualification"("validUntil");

-- CreateIndex
CREATE INDEX "Availability_helperId_startDate_endDate_idx" ON "Availability"("helperId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Event_unitId_startsAt_idx" ON "Event"("unitId", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_unitId_startsAt_idx" ON "Shift"("unitId", "startsAt");

-- CreateIndex
CREATE INDEX "Shift_startsAt_endsAt_idx" ON "Shift"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ShiftRequirement_shiftId_idx" ON "ShiftRequirement"("shiftId");

-- CreateIndex
CREATE INDEX "ShiftAssignment_helperId_status_idx" ON "ShiftAssignment"("helperId", "status");

-- CreateIndex
CREATE INDEX "ShiftAssignment_shiftId_status_idx" ON "ShiftAssignment"("shiftId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftAssignment_shiftId_helperId_key" ON "ShiftAssignment"("shiftId", "helperId");

-- CreateIndex
CREATE UNIQUE INDEX "AlertGroup_unitId_name_key" ON "AlertGroup"("unitId", "name");

-- CreateIndex
CREATE INDEX "Alert_unitId_createdAt_idx" ON "Alert"("unitId", "createdAt");

-- CreateIndex
CREATE INDEX "Incident_unitId_startedAt_idx" ON "Incident"("unitId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_unitId_number_key" ON "Incident"("unitId", "number");

-- CreateIndex
CREATE INDEX "Vehicle_unitId_idx" ON "Vehicle"("unitId");

-- CreateIndex
CREATE INDEX "VehicleMaintenance_vehicleId_date_idx" ON "VehicleMaintenance"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "MaterialItem_unitId_idx" ON "MaterialItem"("unitId");

-- CreateIndex
CREATE INDEX "MaterialIssue_materialId_returnedAt_idx" ON "MaterialIssue"("materialId", "returnedAt");

-- CreateIndex
CREATE INDEX "Document_unitId_category_idx" ON "Document"("unitId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_storageKey_key" ON "DocumentVersion"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "MessageRecipient_userId_readAt_idx" ON "MessageRecipient"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Announcement_unitId_publishAt_idx" ON "Announcement"("unitId", "publishAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_unitId_at_idx" ON "AuditLog"("unitId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "OrgUnit" ADD CONSTRAINT "OrgUnit_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleAssignment" ADD CONSTRAINT "RoleAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "RoleDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helper" ADD CONSTRAINT "Helper_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Helper" ADD CONSTRAINT "Helper_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationType" ADD CONSTRAINT "QualificationType_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationCover" ADD CONSTRAINT "QualificationCover_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "QualificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualificationCover" ADD CONSTRAINT "QualificationCover_coversTypeId_fkey" FOREIGN KEY ("coversTypeId") REFERENCES "QualificationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperQualification" ADD CONSTRAINT "HelperQualification_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperQualification" ADD CONSTRAINT "HelperQualification_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "QualificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperQualification" ADD CONSTRAINT "HelperQualification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTask" ADD CONSTRAINT "EventTask_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Helper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRequirement" ADD CONSTRAINT "ShiftRequirement_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRequirementQualification" ADD CONSTRAINT "ShiftRequirementQualification_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ShiftRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftRequirementQualification" ADD CONSTRAINT "ShiftRequirementQualification_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "QualificationType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ShiftRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftVehicle" ADD CONSTRAINT "ShiftVehicle_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftVehicle" ADD CONSTRAINT "ShiftVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftMaterial" ADD CONSTRAINT "ShiftMaterial_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftMaterial" ADD CONSTRAINT "ShiftMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertGroup" ADD CONSTRAINT "AlertGroup_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertGroupMember" ADD CONSTRAINT "AlertGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "AlertGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertGroupMember" ADD CONSTRAINT "AlertGroupMember_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_alertGroupId_fkey" FOREIGN KEY ("alertGroupId") REFERENCES "AlertGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRecipient" ADD CONSTRAINT "AlertRecipient_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertRecipient" ADD CONSTRAINT "AlertRecipient_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHelper" ADD CONSTRAINT "IncidentHelper_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentHelper" ADD CONSTRAINT "IncidentHelper_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentVehicle" ADD CONSTRAINT "IncidentVehicle_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentVehicle" ADD CONSTRAINT "IncidentVehicle_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMaterial" ADD CONSTRAINT "IncidentMaterial_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentMaterial" ADD CONSTRAINT "IncidentMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "Helper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "Helper"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerHelperId_fkey" FOREIGN KEY ("ownerHelperId") REFERENCES "Helper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "OrgUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
