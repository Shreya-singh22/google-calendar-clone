-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Calendar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "colorId" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "kind" TEXT NOT NULL DEFAULT 'user',
    "country" TEXT,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Calendar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Calendar" ("colorId", "createdAt", "id", "name", "updatedAt", "userId", "visible") SELECT "colorId", "createdAt", "id", "name", "updatedAt", "userId", "visible" FROM "Calendar";
DROP TABLE "Calendar";
ALTER TABLE "new_Calendar" RENAME TO "Calendar";
CREATE INDEX "Calendar_userId_idx" ON "Calendar"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
