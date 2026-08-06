-- One shared Google account connected for Calendar/Meet — a single row, upserted at id "default".
CREATE TABLE "GoogleCalendarToken" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "googleAccountEmail" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scope" TEXT NOT NULL,
    "connectedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleCalendarToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GoogleCalendarToken" ADD CONSTRAINT "GoogleCalendarToken_connectedByUserId_fkey"
    FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
