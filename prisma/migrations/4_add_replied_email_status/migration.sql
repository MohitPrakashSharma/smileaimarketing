-- Adds REPLIED to EmailStatus so inbound replies (manual or webhook-reported) can be tracked.
ALTER TYPE "EmailStatus" ADD VALUE 'REPLIED';
