-- Lighthouse's own screenshot of the finished page, taken from the PageSpeed response the
-- audit already fetches (no extra API call). Stored for the homepage rows only, and only when
-- small enough for the report; see lib/audit/providers/pagespeed.ts#parseScreenshot.
ALTER TABLE "AuditPerformance" ADD COLUMN "screenshotJson" JSONB;
