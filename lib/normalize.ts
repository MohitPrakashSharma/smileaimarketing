/**
 * Pure normalization helpers used for business deduplication.
 * Dedup check order (per docs/mvp-readiness.md #13): Google Place ID (DB
 * unique constraint) -> normalized domain -> normalized name + city.
 */

export function normalizeDomain(website: string): string {
  try {
    const url = new URL(website.match(/^https?:\/\//i) ? website : `https://${website}`);
    return url.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return website
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\b(dental|dentistry|clinic|practice|office|family|care|group|pllc|llc|inc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
