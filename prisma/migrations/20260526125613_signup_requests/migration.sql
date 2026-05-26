-- CreateTable
CREATE TABLE "SignupRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT,
    "businessName" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT,
    "address" TEXT,
    "numberOfCourts" INTEGER NOT NULL,
    "courtTypes" TEXT NOT NULL,
    "surfaceType" TEXT,
    "matchesPerWeek" TEXT,
    "hasCameras" TEXT,
    "hasInternet" TEXT,
    "referralSource" TEXT,
    "message" TEXT,
    "adminNotes" TEXT,
    "convertedUserId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "SignupRequest_status_idx" ON "SignupRequest"("status");

-- CreateIndex
CREATE INDEX "SignupRequest_createdAt_idx" ON "SignupRequest"("createdAt");
