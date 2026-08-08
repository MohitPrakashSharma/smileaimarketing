/**
 * Normalizes a URL or domain string into a clean canonical domain format:
 * - lowercase
 * - strip http://, https://, www.
 * - strip query parameters, port numbers, trailing slashes, paths
 */
export function normalizeDomain(rawUrl: string): string {
  if (!rawUrl) return "";
  let clean = rawUrl.trim().toLowerCase();
  
  // Remove protocol
  clean = clean.replace(/^https?:\/\//, "");
  // Remove www. prefix
  clean = clean.replace(/^www\./, "");
  // Remove trailing path, query parameters, port
  clean = clean.split("/")[0].split("?")[0].split(":")[0];
  
  return clean;
}

/**
 * Normalizes a business name for fuzzy deduplication:
 * - lowercase
 * - remove common punctuation, legal suffixes (llc, inc, pc, pllc, corp, co)
 * - collapse multiple spaces
 */
export function normalizeName(rawName: string): string {
  if (!rawName) return "";
  let clean = rawName.trim().toLowerCase();
  
  // Replace punctuation with spaces
  clean = clean.replace(/[^\w\s]/g, " ");
  // Remove common legal/clinic suffixes
  clean = clean.replace(/\b(llc|inc|pc|pllc|corp|co|ltd|dmd|dds|pa|group|associates)\b/g, "");
  // Collapse whitespace
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}
