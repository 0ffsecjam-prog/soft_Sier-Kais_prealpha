-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Court" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "slotDurationMin" INTEGER NOT NULL DEFAULT 60,
    "pricePerSlotCents" INTEGER NOT NULL DEFAULT 0,
    "openingHour" INTEGER NOT NULL DEFAULT 8,
    "closingHour" INTEGER NOT NULL DEFAULT 23,
    "weeklySchedule" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "statusMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Court_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Court" ("closingHour", "complexId", "createdAt", "id", "name", "openingHour", "pricePerSlotCents", "slotDurationMin") SELECT "closingHour", "complexId", "createdAt", "id", "name", "openingHour", "pricePerSlotCents", "slotDurationMin" FROM "Court";
DROP TABLE "Court";
ALTER TABLE "new_Court" RENAME TO "Court";
CREATE INDEX "Court_complexId_idx" ON "Court"("complexId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
