# Database Schema

This document defines the PostgreSQL database schema using Prisma syntax, detailing entity fields, relations, indexes, and constraints.

---

## 1. Schema Definition (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  SUPERADMIN
  ADMIN
  SALES
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
}

enum BusinessStatus {
  DISCOVERED
  QUALIFIED
  AUDITING
  AUDITED
  OUTREACH_PENDING
  OUTREACH_ACTIVE
  CONVERTED
  DISQUALIFIED
}

enum AuditStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum EmailStatus {
  QUEUED
  SENT
  DELIVERED
  BOUNCED
  OPENED
  CLICKED
}

enum AppointmentType {
  ONLINE
  IN_PERSON
}

enum AppointmentStatus {
  SCHEDULED
  CANCELLED
  COMPLETED
  NO_SHOW
}

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  name          String
  passwordHash  String
  role          UserRole        @default(SALES)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  activities    SalesActivity[]

  @@index([email])
}

model Campaign {
  id          String         @id @default(uuid())
  name        String
  city        String
  category    String
  status      CampaignStatus @default(DRAFT)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  businesses  Business[]
  sequences   EmailSequence[]
}

model Business {
  id               String          @id @default(uuid())
  campaignId       String?
  campaign         Campaign?       @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  name             String
  website          String
  address          String?
  city             String
  country          String          @default("US")
  phone            String?
  category         String
  status           BusinessStatus  @default(DISCOVERED)
  opportunityScore Int             @default(0)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  contacts         Contact[]
  audits           Audit[]
  appointments     Appointment[]
  salesActivities  SalesActivity[]

  @@unique([website, city])
  @@index([campaignId])
  @@index([status])
  @@index([city])
}

model Contact {
  id             String          @id @default(uuid())
  businessId     String
  business       Business        @relation(fields: [businessId], references: [id], onDelete: Cascade)
  firstName      String
  lastName       String
  email          String
  phone          String?
  role           String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  emailMessages  EmailMessage[]
  appointments   Appointment[]
  consentRecords ConsentRecord[]

  @@unique([businessId, email])
  @@index([email])
}

model Audit {
  id               String          @id @default(uuid())
  businessId       String
  business         Business        @relation(fields: [businessId], references: [id], onDelete: Cascade)
  publicToken      String          @unique @default(uuid()) // Secure non-sequential URL token
  status           AuditStatus     @default(PENDING)
  score            Int             @default(0)
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt
  results          AuditResult[]
  competitorGaps   Competitor[]

  @@index([businessId])
  @@index([publicToken])
}

model AuditResult {
  id            String      @id @default(uuid())
  auditId       String
  audit         Audit       @relation(fields: [auditId], references: [id], onDelete: Cascade)
  category      String      // e.g., "LOCAL_VISIBILITY", "WEBSITE_QUALITY", "CONVERSION", "REPUTATION"
  score         Int         // Category specific score
  findingsJson  Json        // Structured facts e.g. { speed: 45, ssl: false }
  detailsJson   Json?       // AI-rewritten copy and human recommendations
  createdAt     DateTime    @default(now())

  @@index([auditId])
}

model Competitor {
  id            String      @id @default(uuid())
  auditId       String
  audit         Audit       @relation(fields: [auditId], references: [id], onDelete: Cascade)
  name          String
  website       String?
  rank          Int
  mapScore      Int?
  createdAt     DateTime    @default(now())

  @@index([auditId])
}

model EmailSequence {
  id          String       @id @default(uuid())
  campaignId  String
  campaign    Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  name        String
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  steps       EmailStep[]
}

model EmailStep {
  id            String        @id @default(uuid())
  sequenceId    String
  sequence      EmailSequence @relation(fields: [sequenceId], references: [id], onDelete: Cascade)
  stepDay       Int           // Day offset e.g., 0, 3, 7, 12
  subject       String
  bodyTemplate  String        // Markdown or HTML template containing replacement variables
  messages      EmailMessage[]
}

model EmailMessage {
  id               String            @id @default(uuid())
  contactId        String
  contact          Contact           @relation(fields: [contactId], references: [id], onDelete: Cascade)
  stepId           String
  step             EmailStep         @relation(fields: [stepId], references: [id], onDelete: Cascade)
  status           EmailStatus       @default(QUEUED)
  messageId        String?           // External email service ID (e.g. Resend, Sendgrid)
  sentAt           DateTime?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  events           EngagementEvent[]

  @@index([contactId])
  @@index([status])
  @@index([messageId])
}

model EngagementEvent {
  id             String       @id @default(uuid())
  emailMessageId String
  emailMessage   EmailMessage @relation(fields: [emailMessageId], references: [id], onDelete: Cascade)
  eventType      String       // "OPEN", "CLICK", "BOUNCE", "SPAM", "UNSUBSCRIBE"
  linkClicked    String?
  ipAddress      String?
  userAgent      String?
  timestamp      DateTime     @default(now())

  @@index([emailMessageId])
}

model Appointment {
  id               String            @id @default(uuid())
  businessId       String
  business         Business          @relation(fields: [businessId], references: [id], onDelete: Cascade)
  contactId        String
  contact          Contact           @relation(fields: [contactId], references: [id], onDelete: Cascade)
  type             AppointmentType
  status           AppointmentStatus @default(SCHEDULED)
  scheduledTime    DateTime
  durationMinutes  Int               @default(15)
  address          String?           // For offline in-person visits
  preferredWindow  String?           // Muted text for timing range
  notes            String?
  salesBriefingUrl String?           // URL link to generated PDF salesperson brief
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@index([businessId])
  @@index([contactId])
  @@index([scheduledTime])
}

model SalesActivity {
  id          String   @id @default(uuid())
  businessId  String
  business    Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String   // "NOTE", "CALL", "EMAIL", "MEETING"
  content     String
  createdAt   DateTime @default(now())

  @@index([businessId])
  @@index([userId])
}

model SuppressionRecord {
  id        String   @id @default(uuid())
  email     String   @unique
  domain    String?  // Exclude entire clinic domains if requested
  reason    String
  createdAt DateTime @default(now())

  @@index([email])
  @@index([domain])
}

model ConsentRecord {
  id             String   @id @default(uuid())
  contactId      String
  contact        Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  ipAddress      String?
  consentType    String   // e.g. "MARKETING_EMAIL", "COMMUNICATION"
  consentGranted Boolean  @default(true)
  timestamp      DateTime @default(now())

  @@index([contactId])
}
```

---

## 2. Relationships & Core Constraints

1. **Unique Business Resolution**: Businesses are uniquely identified by a combination of `(website, city)`. This ensures that if the same business website is discovered in multiple campaigns targeting the same city, it resolves to a single operational record.
2. **Audit Access Isolation**: The `Audit` table generates a random UUID for the `publicToken` field. Public visitors access report URLs via `/audit/[publicToken]`, preventing sequential ID guessing (preventing ID enumeration attacks).
3. **Cascade Deletes**: If a `Business` record is removed, all dependent `Contact` entities, `Audit` records, `Appointment` schedules, and `SalesActivity` history cascade-delete cleanly to avoid orphaned database rows.
4. **Suppression Guard**: Before sending any email message, the system queries the `SuppressionRecord` table to check if either the exact target email or the recipient's domain matches a suppressed record.
