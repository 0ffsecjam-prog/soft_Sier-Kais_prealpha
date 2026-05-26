-- CreateTable
CREATE TABLE "CourtBlockedDate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courtId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CourtBlockedDate_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "Court" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CourtBlockedDate_courtId_date_idx" ON "CourtBlockedDate"("courtId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CourtBlockedDate_courtId_date_key" ON "CourtBlockedDate"("courtId", "date");
