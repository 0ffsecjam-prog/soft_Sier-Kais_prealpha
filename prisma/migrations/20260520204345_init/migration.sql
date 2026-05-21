-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Complex" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "revenueSharePct" INTEGER NOT NULL DEFAULT 7000,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complex_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Court" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Court_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courtId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "filePath" TEXT NOT NULL,
    "thumbnailPath" TEXT,
    "priceCents" INTEGER NOT NULL,
    "downloadFeeCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'READY',
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Recording_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATETIME,
    "createdById" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccessToken_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AccessToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pricePaidCents" INTEGER NOT NULL,
    "hasDownloadAccess" BOOLEAN NOT NULL DEFAULT false,
    "downloadPaidAt" DATETIME,
    "downloadFeeCents" INTEGER,
    "revokedAt" DATETIME,
    CONSTRAINT "Claim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "Recording" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Claim_tokenId_fkey" FOREIGN KEY ("tokenId") REFERENCES "AccessToken" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "claimId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SIMULATED',
    "externalRef" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConfigSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Complex_ownerId_key" ON "Complex"("ownerId");

-- CreateIndex
CREATE INDEX "Court_complexId_idx" ON "Court"("complexId");

-- CreateIndex
CREATE INDEX "Recording_courtId_idx" ON "Recording"("courtId");

-- CreateIndex
CREATE INDEX "Recording_recordedAt_idx" ON "Recording"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccessToken_code_key" ON "AccessToken"("code");

-- CreateIndex
CREATE INDEX "AccessToken_recordingId_idx" ON "AccessToken"("recordingId");

-- CreateIndex
CREATE INDEX "AccessToken_code_idx" ON "AccessToken"("code");

-- CreateIndex
CREATE INDEX "Claim_userId_idx" ON "Claim"("userId");

-- CreateIndex
CREATE INDEX "Claim_recordingId_idx" ON "Claim"("recordingId");

-- CreateIndex
CREATE INDEX "Claim_userId_recordingId_idx" ON "Claim"("userId", "recordingId");

-- CreateIndex
CREATE INDEX "Payment_claimId_idx" ON "Payment"("claimId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- CreateIndex
CREATE INDEX "Log_level_idx" ON "Log"("level");
