-- CreateEnum
CREATE TYPE "PersonalItemGroup" AS ENUM ('CLOTHING', 'WEAPON', 'ATTACHMENT', 'GADGET');

-- CreateTable
CREATE TABLE "PersonalItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "group" "PersonalItemGroup" NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PersonalItem_userId_group_idx" ON "PersonalItem"("userId", "group");

-- CreateIndex
CREATE INDEX "PersonalItem_parentId_idx" ON "PersonalItem"("parentId");

-- AddForeignKey
ALTER TABLE "PersonalItem" ADD CONSTRAINT "PersonalItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalItem" ADD CONSTRAINT "PersonalItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PersonalItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
