/**
 * Fallback contact discovery for when Apollo's B2B database has nothing on
 * a business — common for small independent practices. Looks directly at
 * the practice's own website for a real contact email/phone, the same way
 * a person would if they clicked "Contact Us."
 */
export interface WebsiteContactResult {
  found: boolean;
  email?: string;
  phone?: string;
  address?: string;
}

const GENERIC_EMAIL_PREFIXES = ["info", "contact", "hello", "office", "frontdesk", "reception", "admin", "appointments"];

function extractEmail(html: string): string | undefined {
  const mailtoMatch = html.match(/href=["']mailto:([^"'?]+)["']/i);
  if (mailtoMatch) return mailtoMatch[1].trim();

  const textMatch = html.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/);
  return textMatch ? textMatch[0] : undefined;
}

function extractPhone(html: string): string | undefined {
  const telMatch = html.match(/href=["']tel:([^"']+)["']/i);
  if (telMatch) return telMatch[1].trim();

  const textMatch = html.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  return textMatch ? textMatch[0] : undefined;
}

function extractAddress(html: string): string | undefined {
  // Prefer a schema.org PostalAddress if present — most reliable signal.
  const schemaMatch = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i);
  if (schemaMatch) return schemaMatch[1].trim();

  const lineMatch = html.match(
    /\b\d{1,6}\s+[A-Za-z0-9.\s]{2,40}\b(Street|St|Avenue|Ave|Road|Rd|Suite|Ste|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln)\b[^<\n]{0,40}/i
  );
  return lineMatch ? lineMatch[0].replace(/\s+/g, " ").trim() : undefined;
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "SmileAIAudit/1.0 (contact discovery)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function extractWebsiteContact(website: string): Promise<WebsiteContactResult> {
  let base = website.trim();
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/$/, "");

  const homepage = await fetchHtml(base);
  let email = homepage ? extractEmail(homepage) : undefined;
  let phone = homepage ? extractPhone(homepage) : undefined;
  let address = homepage ? extractAddress(homepage) : undefined;

  // A homepage often skips the email — try a contact page before giving up.
  if (!email) {
    for (const path of ["/contact", "/contact-us"]) {
      const html = await fetchHtml(`${base}${path}`);
      if (!html) continue;
      email = extractEmail(html);
      phone = phone || extractPhone(html);
      address = address || extractAddress(html);
      if (email) break;
    }
  }

  return { found: Boolean(email), email, phone, address };
}

/** True when the email looks like a real front-desk address rather than a placeholder/noreply. */
export function isUsableContactEmail(email: string): boolean {
  const local = email.split("@")[0]?.toLowerCase() || "";
  if (["noreply", "no-reply", "donotreply", "webmaster", "postmaster"].includes(local)) return false;
  return true;
}

export function guessContactRole(email: string): string {
  const local = email.split("@")[0]?.toLowerCase() || "";
  return GENERIC_EMAIL_PREFIXES.some((p) => local.includes(p)) ? "Front Desk" : "Practice Contact";
}
