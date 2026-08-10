-- CreateTable
CREATE TABLE "PhotoLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "time" DATETIME NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "familyId" TEXT,
    "babyId" TEXT NOT NULL,
    "caretakerId" TEXT,
    CONSTRAINT "PhotoLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PhotoLog_babyId_fkey" FOREIGN KEY ("babyId") REFERENCES "Baby" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PhotoLog_caretakerId_fkey" FOREIGN KEY ("caretakerId") REFERENCES "Caretaker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "PhotoLog_time_idx" ON "PhotoLog"("time");

-- CreateIndex
CREATE INDEX "PhotoLog_babyId_idx" ON "PhotoLog"("babyId");

-- CreateIndex
CREATE INDEX "PhotoLog_caretakerId_idx" ON "PhotoLog"("caretakerId");

-- CreateIndex
CREATE INDEX "PhotoLog_deletedAt_idx" ON "PhotoLog"("deletedAt");

-- CreateIndex
CREATE INDEX "PhotoLog_familyId_idx" ON "PhotoLog"("familyId");
