-- Tracks where each Contact was actually found (Apollo, website scrape, manual, self-serve audit form)
-- so the admin UI can show real data provenance instead of an unlabeled contact.
ALTER TABLE "Contact" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL';
