-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "orgName" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "footerText" TEXT,
    "accentColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "font" TEXT NOT NULL,
    "logoMode" TEXT NOT NULL,
    "logo" BYTEA,
    "logoMime" TEXT,
    "background" BYTEA,
    "backgroundMime" TEXT,
    "showFrame" BOOLEAN NOT NULL DEFAULT true,
    "showQr" BOOLEAN NOT NULL DEFAULT true,
    "sig1Label" TEXT,
    "sig1Name" TEXT,
    "sig1Image" BYTEA,
    "sig1Mime" TEXT,
    "sig2Label" TEXT,
    "sig2Name" TEXT,
    "sig2Image" BYTEA,
    "sig2Mime" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

