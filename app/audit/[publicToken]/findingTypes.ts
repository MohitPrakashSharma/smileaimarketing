/**
 * The finding shape the report API sends to the client. The free customer
 * report renders a short business briefing from it (see lib/audit/view/briefing);
 * the full per-check evidence these fields carry is printed only in the
 * restricted technical report.
 */

export type FindingDeveloperDetail = {
  checkId: string;
  title: string;
  severity: string;
  dataSource?: string;
  device?: string | null;
  affectedPageCount: number;
  detected: string | null;
  expected: string;
  fix: string;
  developerFix: string | null;
  urls: Array<{ url: string; detected?: string; expected?: string }>;
};

export type FindingView = {
  id: string;
  pillar: string;
  severity: string;
  title: string;
  source: string | null;
  device: string | null;
  affectedUrls: string[];
  affectedPageCount: number;
  detectedValue: string | null;
  whyItMatters: string;
  recommendedFix: string;
  developerDetails: FindingDeveloperDetail[] | null;
  impact: number;
  effort: number;
  confidence: number;
  owner: string;
  bucket: string;
};
