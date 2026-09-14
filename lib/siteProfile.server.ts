import "server-only";
import { classifyIndustry, industryFromPlaceTypes, GENERIC_INDUSTRY, INDUSTRIES, type IndustryProfile } from "./industry";
import { normalizeDomain } from "./normalize";

/**
 * Detects who a website belongs to — business name, city/region/country and
 * industry — from nothing but the URL. Two sources, merged:
 *
 *  1. The site's own HTML: schema.org LocalBusiness/Organization JSON-LD,
 *     og:site_name / <title>, and a footer/contact-page postal address.
 *     Free, no credentials, always attempted.
 *  2. Google Places (when GOOGLE_PLACES_API_KEY is set): looks the domain up
 *     and returns the verified listing — name, address components, types,
 *     rating and review count. Preferred when the listing's website matches
 *     the audited domain.
 *
 * Nothing here guesses: a field the sources didn't establish stays undefined.
 */

export interface SiteProfile {
  website: string;
  domain: string;
  name?: string;
  city?: string;
  state?: string;
  country?: string; // ISO-2 (CA/US/GB/AU/…)
  address?: string;
  phone?: string;
  industry: IndustryProfile;
  industryConfidence: "high" | "medium" | "low";
  rating?: number;
  reviewCount?: number;
  googlePlaceId?: string;
  /** Which source established the location. */
  locationSource?: "google_places" | "schema_org" | "html_address" | "map_embed" | "service_area" | "name_or_domain" | "phone_area_code";
  /** How sure we are of `city` — the form still lets the visitor correct it either way. */
  locationConfidence?: "high" | "medium" | "low";
  reachable: boolean;
}

const FETCH_TIMEOUT_MS = 7000;
const UA = "Mozilla/5.0 (compatible; SmileAIAuditBot/1.0; +https://smileaimarketing.com)";

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "User-Agent": UA, Accept: "text/html,*/*" } });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    if (type && !/html|xml|text/i.test(type)) return null;
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ---------- HTML extraction ----------

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (html: string) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  );

function metaContent(html: string, attr: "name" | "property", key: string): string | undefined {
  const re = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`, "i");
  const m = html.match(re) || html.match(re2);
  return m ? decode(m[1]) : undefined;
}

type JsonLdNode = Record<string, unknown>;

function collectJsonLd(html: string): JsonLdNode[] {
  const out: JsonLdNode[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const walk = (n: unknown) => {
        if (Array.isArray(n)) n.forEach(walk);
        else if (n && typeof n === "object") {
          const node = n as JsonLdNode;
          out.push(node);
          if (Array.isArray(node["@graph"])) walk(node["@graph"]);
        }
      };
      walk(parsed);
    } catch {
      /* malformed JSON-LD is common; ignore */
    }
  }
  return out;
}

const typesOf = (n: JsonLdNode): string[] => {
  const t = n["@type"];
  return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
};

const ORG_TYPES = /organization|localbusiness|dentist|physician|medical|store|restaurant|attorney|legalservice|accountingservice|homeandconstructionbusiness|plumber|electrician|hvacbusiness|roofingcontractor|autorepair|healthandbeautybusiness|beautysalon|hairsalon|daycare|school|realestateagent|hotel|lodgingbusiness|professionalservice|financialservice|insuranceagency|veterinarycare|gym|sportsactivitylocation|foodestablishment|cafeorcoffeeshop|bakery|bar/i;

interface SchemaHit {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  address?: string;
  phone?: string;
  types: string[];
  rating?: number;
  reviewCount?: number;
}

function schemaBusiness(nodes: JsonLdNode[]): SchemaHit | null {
  const candidates = nodes.filter((n) => typesOf(n).some((t) => ORG_TYPES.test(t)));
  // Prefer the node that actually carries an address.
  const node = candidates.find((n) => n.address) ?? candidates[0];
  if (!node) return null;

  const addr = (Array.isArray(node.address) ? node.address[0] : node.address) as JsonLdNode | string | undefined;
  const hit: SchemaHit = { types: typesOf(node) };
  if (typeof node.name === "string") hit.name = decode(node.name);
  if (typeof node.telephone === "string") hit.phone = node.telephone.trim();
  if (addr && typeof addr === "object") {
    const g = (k: string) => (typeof addr[k] === "string" ? decode(addr[k] as string) : undefined);
    hit.city = g("addressLocality");
    hit.state = g("addressRegion");
    const c = addr.addressCountry;
    hit.country = typeof c === "string" ? c : c && typeof c === "object" ? (c as JsonLdNode).name?.toString() : undefined;
    hit.address = [g("streetAddress"), hit.city, hit.state, g("postalCode")].filter(Boolean).join(", ") || undefined;
  } else if (typeof addr === "string") {
    hit.address = decode(addr);
  }
  const agg = node.aggregateRating as JsonLdNode | undefined;
  if (agg && typeof agg === "object") {
    const rv = Number(agg.ratingValue);
    const rc = Number(agg.reviewCount ?? agg.ratingCount);
    if (!Number.isNaN(rv)) hit.rating = rv;
    if (!Number.isNaN(rc)) hit.reviewCount = rc;
  }
  return hit;
}

const US_STATES = "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC";
const CA_PROVINCES = "AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT";
const AU_STATES = "NSW|VIC|QLD|WA|SA|TAS|ACT|NT";
const CITY = "([A-Z][A-Za-z.'\\-]+(?:\\s[A-Z][A-Za-z.'\\-]+){0,3})";

/** "Toronto, ON M5V 2T6" / "Austin, TX 78701" / "Sydney NSW 2000" / "London SW1A 1AA" */
function addressFromText(text: string): { city: string; state?: string; country: string } | null {
  const ca = text.match(new RegExp(`${CITY},?\\s+(${CA_PROVINCES})\\.?\\s+[A-Z]\\d[A-Z]\\s?\\d[A-Z]\\d\\b`));
  const caCity = ca ? cleanCity(ca[1]) : null;
  if (ca && caCity) return { city: caCity, state: ca[2], country: "CA" };
  const us = text.match(new RegExp(`${CITY},?\\s+(${US_STATES})\\.?\\s+\\d{5}(?:-\\d{4})?\\b`));
  const usCity = us ? cleanCity(us[1]) : null;
  if (us && usCity) return { city: usCity, state: us[2], country: "US" };
  const au = text.match(new RegExp(`${CITY},?\\s+(${AU_STATES})\\.?\\s+\\d{4}\\b`));
  const auCity = au ? cleanCity(au[1]) : null;
  if (au && auCity) return { city: auCity, state: au[2], country: "AU" };
  const uk = text.match(new RegExp(`${CITY},?\\s+([A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2})\\b`));
  const ukCity = uk ? cleanCity(uk[1]) : null;
  if (uk && ukCity) return { city: ukCity, country: "GB" };
  return null;
}

const REGION_NAMES: Record<string, { code: string; country: string }> = {
  // Canada
  ontario: { code: "ON", country: "CA" }, quebec: { code: "QC", country: "CA" }, québec: { code: "QC", country: "CA" },
  "british columbia": { code: "BC", country: "CA" }, alberta: { code: "AB", country: "CA" }, manitoba: { code: "MB", country: "CA" },
  saskatchewan: { code: "SK", country: "CA" }, "nova scotia": { code: "NS", country: "CA" }, "new brunswick": { code: "NB", country: "CA" },
  "newfoundland and labrador": { code: "NL", country: "CA" }, "prince edward island": { code: "PE", country: "CA" },
  // US (most common in footers)
  california: { code: "CA", country: "US" }, texas: { code: "TX", country: "US" }, florida: { code: "FL", country: "US" }, "new york": { code: "NY", country: "US" },
  illinois: { code: "IL", country: "US" }, pennsylvania: { code: "PA", country: "US" }, ohio: { code: "OH", country: "US" }, georgia: { code: "GA", country: "US" },
  "north carolina": { code: "NC", country: "US" }, michigan: { code: "MI", country: "US" }, "new jersey": { code: "NJ", country: "US" }, virginia: { code: "VA", country: "US" },
  washington: { code: "WA", country: "US" }, arizona: { code: "AZ", country: "US" }, massachusetts: { code: "MA", country: "US" }, tennessee: { code: "TN", country: "US" },
  indiana: { code: "IN", country: "US" }, missouri: { code: "MO", country: "US" }, maryland: { code: "MD", country: "US" }, wisconsin: { code: "WI", country: "US" },
  colorado: { code: "CO", country: "US" }, minnesota: { code: "MN", country: "US" }, "south carolina": { code: "SC", country: "US" }, alabama: { code: "AL", country: "US" },
  louisiana: { code: "LA", country: "US" }, kentucky: { code: "KY", country: "US" }, oregon: { code: "OR", country: "US" }, oklahoma: { code: "OK", country: "US" },
  connecticut: { code: "CT", country: "US" }, utah: { code: "UT", country: "US" }, nevada: { code: "NV", country: "US" }, iowa: { code: "IA", country: "US" },
  arkansas: { code: "AR", country: "US" }, mississippi: { code: "MS", country: "US" }, kansas: { code: "KS", country: "US" }, "new mexico": { code: "NM", country: "US" },
  nebraska: { code: "NE", country: "US" }, idaho: { code: "ID", country: "US" }, hawaii: { code: "HI", country: "US" }, maine: { code: "ME", country: "US" },
  "new hampshire": { code: "NH", country: "US" }, montana: { code: "MT", country: "US" }, delaware: { code: "DE", country: "US" }, "rhode island": { code: "RI", country: "US" },
  // Australia
  "new south wales": { code: "NSW", country: "AU" }, victoria: { code: "VIC", country: "AU" }, queensland: { code: "QLD", country: "AU" },
  "western australia": { code: "WA", country: "AU" }, "south australia": { code: "SA", country: "AU" }, tasmania: { code: "TAS", country: "AU" },
};

const REGION_CODE_COUNTRY: Record<string, string> = Object.fromEntries([
  ...CA_PROVINCES.split("|").map((c) => [c, "CA"]),
  ...US_STATES.split("|").map((c) => [c, "US"]),
  ...AU_STATES.split("|").map((c) => [c, "AU"]),
]);

/**
 * Weaker patterns for pages that print a location without a postal code:
 * "Toronto, Ontario", "Austin, TX", "Greater Toronto Area", "serving Calgary".
 */
/** True for "Ontario", "Florida", "British Columbia" — a region printed where a city should be. */
function isRegionName(s: string): boolean {
  return s.toLowerCase() in REGION_NAMES;
}

const NOT_A_CITY = /^(Dr|Mr|Mrs|Ms|St|Suite|Unit|Contact|Email|Phone|Call|Open|Address|City|Province|State|Country|Canada|USA|Home|Our|The|You|Your|Clients|Customers|Patients|Families|Homeowners|Businesses|Greater|Serving|Area)$/i;

/**
 * The CITY pattern grabs up to four capitalised words, so page labels leak in:
 * "Address Greater Toronto Area" → "Toronto". Returns null when nothing city-like is left.
 */
function cleanCity(raw: string): string | null {
  let c = raw.trim();
  for (let i = 0; i < 3; i++) {
    c = c
      .replace(/^(Address|Location|Locations|Office|Offices|City|Greater|Serving|Visit|Find|Us|Contact|Map|Directions|Downtown|Metro)\s+/i, "")
      .replace(/\s+(Area|Region|Office|Location|Clinic|Branch)$/i, "");
  }
  if (!c || c.split(/\s+/).length > 3 || NOT_A_CITY.test(c) || isRegionName(c)) return null;
  return c;
}

function looseLocationFromText(text: string): { city: string; state?: string; country?: string; source: SiteProfile["locationSource"] } | null {
  // "Toronto, Ontario" / "Toronto Ontario, Canada" — city must be capitalised, region checked case-insensitively.
  const fullRe = new RegExp(`${CITY},?\\s+([A-Za-zé]+(?:\\s[A-Za-z]+){0,2})\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = fullRe.exec(text))) {
    // Try the 1–3 word region candidate from longest to shortest.
    const words = m[2].split(/\\s+/);
    for (let n = words.length; n >= 1; n--) {
      const r = REGION_NAMES[words.slice(0, n).join(" ").toLowerCase()];
      const city = r ? cleanCity(m[1]) : null;
      if (r && city) return { city, state: r.code, country: r.country, source: "html_address" };
    }
  }
  // "Toronto, ON" (2-letter, no postal code) — require the comma to avoid "Dr. ON call"
  const short = text.match(new RegExp(`${CITY},\\s+(${CA_PROVINCES}|${US_STATES}|${AU_STATES})\\b(?![a-z])`));
  const shortCity = short ? cleanCity(short[1]) : null;
  if (short && shortCity) {
    return { city: shortCity, state: short[2], country: REGION_CODE_COUNTRY[short[2]], source: "html_address" };
  }
  // "Greater Toronto Area", "serving Calgary and area", "located in Ottawa", "based in Halifax"
  const area =
    text.match(/\bGreater\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+Area\b/) ||
    text.match(/\b(?:proudly\s+)?(?:serving|located in|based in|serving the)\s+(?:the\s+)?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b(?:\s+(?:area|region|and surrounding))?/);
  const areaCity = area ? cleanCity(area[1]) : null;
  if (area && areaCity) return { city: areaCity, source: "service_area" };
  return null;
}

/** Decodes the address a Google Maps iframe/link was built from, if the page embeds one. */
function addressFromMapEmbed(html: string): string | null {
  const m =
    html.match(/maps\.google\.[a-z.]+\/maps\?[^"']*?q=([^&"']+)/i) ||
    html.match(/google\.[a-z.]+\/maps\/embed[^"']*?[?&]q=([^&"']+)/i) ||
    html.match(/google\.[a-z.]+\/maps\/place\/([^/"']+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1].replace(/\+/g, " "));
  } catch {
    return null;
  }
}

// Major cities whose name in a domain or page title is a strong hint (e.g. torontoplumber.com).
const KNOWN_CITIES: Array<[string, string, string]> = [
  ["toronto", "ON", "CA"], ["mississauga", "ON", "CA"], ["brampton", "ON", "CA"], ["hamilton", "ON", "CA"], ["ottawa", "ON", "CA"], ["london", "ON", "CA"],
  ["markham", "ON", "CA"], ["vaughan", "ON", "CA"], ["kitchener", "ON", "CA"], ["waterloo", "ON", "CA"], ["windsor", "ON", "CA"], ["oakville", "ON", "CA"],
  ["burlington", "ON", "CA"], ["oshawa", "ON", "CA"], ["barrie", "ON", "CA"], ["guelph", "ON", "CA"], ["kingston", "ON", "CA"], ["richmond hill", "ON", "CA"],
  ["scarborough", "ON", "CA"], ["etobicoke", "ON", "CA"], ["north york", "ON", "CA"], ["ajax", "ON", "CA"], ["pickering", "ON", "CA"], ["whitby", "ON", "CA"],
  ["vancouver", "BC", "CA"], ["surrey", "BC", "CA"], ["burnaby", "BC", "CA"], ["richmond", "BC", "CA"], ["victoria", "BC", "CA"], ["kelowna", "BC", "CA"], ["langley", "BC", "CA"], ["abbotsford", "BC", "CA"],
  ["calgary", "AB", "CA"], ["edmonton", "AB", "CA"], ["red deer", "AB", "CA"], ["winnipeg", "MB", "CA"], ["saskatoon", "SK", "CA"], ["regina", "SK", "CA"],
  ["montreal", "QC", "CA"], ["laval", "QC", "CA"], ["gatineau", "QC", "CA"], ["halifax", "NS", "CA"], ["moncton", "NB", "CA"], ["st. john's", "NL", "CA"],
  ["new york", "NY", "US"], ["brooklyn", "NY", "US"], ["los angeles", "CA", "US"], ["chicago", "IL", "US"], ["houston", "TX", "US"], ["phoenix", "AZ", "US"],
  ["philadelphia", "PA", "US"], ["san antonio", "TX", "US"], ["san diego", "CA", "US"], ["dallas", "TX", "US"], ["austin", "TX", "US"], ["san jose", "CA", "US"],
  ["jacksonville", "FL", "US"], ["columbus", "OH", "US"], ["charlotte", "NC", "US"], ["indianapolis", "IN", "US"], ["san francisco", "CA", "US"], ["seattle", "WA", "US"],
  ["denver", "CO", "US"], ["nashville", "TN", "US"], ["boston", "MA", "US"], ["las vegas", "NV", "US"], ["portland", "OR", "US"], ["detroit", "MI", "US"],
  ["memphis", "TN", "US"], ["louisville", "KY", "US"], ["baltimore", "MD", "US"], ["milwaukee", "WI", "US"], ["albuquerque", "NM", "US"], ["tucson", "AZ", "US"],
  ["fresno", "CA", "US"], ["sacramento", "CA", "US"], ["atlanta", "GA", "US"], ["kansas city", "MO", "US"], ["miami", "FL", "US"], ["orlando", "FL", "US"], ["tampa", "FL", "US"],
  ["raleigh", "NC", "US"], ["omaha", "NE", "US"], ["minneapolis", "MN", "US"], ["cleveland", "OH", "US"], ["pittsburgh", "PA", "US"], ["cincinnati", "OH", "US"],
  ["st. louis", "MO", "US"], ["salt lake city", "UT", "US"], ["scottsdale", "AZ", "US"], ["boise", "ID", "US"], ["oklahoma city", "OK", "US"], ["richmond", "VA", "US"],
  ["london", "", "GB"], ["manchester", "", "GB"], ["birmingham", "", "GB"], ["leeds", "", "GB"], ["glasgow", "", "GB"], ["edinburgh", "", "GB"], ["liverpool", "", "GB"], ["bristol", "", "GB"],
  ["sydney", "NSW", "AU"], ["melbourne", "VIC", "AU"], ["brisbane", "QLD", "AU"], ["perth", "WA", "AU"], ["adelaide", "SA", "AU"], ["gold coast", "QLD", "AU"], ["canberra", "ACT", "AU"],
];

function cityFromNameOrDomain(domain: string, name?: string, title?: string): { city: string; state?: string; country: string } | null {
  const haystacks = [domain.replace(/[^a-z]/g, ""), (name ?? "").toLowerCase().replace(/[^a-z ]/g, ""), (title ?? "").toLowerCase()];
  // Longest names first so "north york" beats "york".
  const cities = [...KNOWN_CITIES].sort((a, b) => b[0].length - a[0].length);
  for (const [city, state, country] of cities) {
    const compact = city.replace(/[^a-z]/g, "");
    if (haystacks[0].includes(compact) || haystacks[1].includes(city) || haystacks[2].includes(city)) {
      return { city: city.replace(/\b\w/g, (c) => c.toUpperCase()), state: state || undefined, country };
    }
  }
  return null;
}

// Area code → city for the phone-number fallback (Canada + largest US metros only; anything else stays undetected).
const AREA_CODES: Record<string, [string, string, string]> = {
  "416": ["Toronto", "ON", "CA"], "647": ["Toronto", "ON", "CA"], "437": ["Toronto", "ON", "CA"], "905": ["Mississauga", "ON", "CA"], "289": ["Mississauga", "ON", "CA"],
  "613": ["Ottawa", "ON", "CA"], "343": ["Ottawa", "ON", "CA"], "519": ["London", "ON", "CA"], "226": ["London", "ON", "CA"], "705": ["Barrie", "ON", "CA"],
  "604": ["Vancouver", "BC", "CA"], "778": ["Vancouver", "BC", "CA"], "236": ["Vancouver", "BC", "CA"], "250": ["Victoria", "BC", "CA"],
  "403": ["Calgary", "AB", "CA"], "587": ["Calgary", "AB", "CA"], "780": ["Edmonton", "AB", "CA"], "204": ["Winnipeg", "MB", "CA"], "306": ["Saskatoon", "SK", "CA"],
  "514": ["Montreal", "QC", "CA"], "438": ["Montreal", "QC", "CA"], "450": ["Laval", "QC", "CA"], "902": ["Halifax", "NS", "CA"],
  "212": ["New York", "NY", "US"], "646": ["New York", "NY", "US"], "718": ["New York", "NY", "US"], "917": ["New York", "NY", "US"], "213": ["Los Angeles", "CA", "US"], "310": ["Los Angeles", "CA", "US"], "323": ["Los Angeles", "CA", "US"],
  "312": ["Chicago", "IL", "US"], "773": ["Chicago", "IL", "US"], "713": ["Houston", "TX", "US"], "281": ["Houston", "TX", "US"], "602": ["Phoenix", "AZ", "US"], "480": ["Phoenix", "AZ", "US"],
  "215": ["Philadelphia", "PA", "US"], "210": ["San Antonio", "TX", "US"], "619": ["San Diego", "CA", "US"], "858": ["San Diego", "CA", "US"], "214": ["Dallas", "TX", "US"], "972": ["Dallas", "TX", "US"],
  "512": ["Austin", "TX", "US"], "408": ["San Jose", "CA", "US"], "904": ["Jacksonville", "FL", "US"], "614": ["Columbus", "OH", "US"], "704": ["Charlotte", "NC", "US"], "317": ["Indianapolis", "IN", "US"],
  "415": ["San Francisco", "CA", "US"], "206": ["Seattle", "WA", "US"], "303": ["Denver", "CO", "US"], "720": ["Denver", "CO", "US"], "615": ["Nashville", "TN", "US"], "617": ["Boston", "MA", "US"],
  "702": ["Las Vegas", "NV", "US"], "503": ["Portland", "OR", "US"], "313": ["Detroit", "MI", "US"], "404": ["Atlanta", "GA", "US"], "305": ["Miami", "FL", "US"], "407": ["Orlando", "FL", "US"], "813": ["Tampa", "FL", "US"],
  "919": ["Raleigh", "NC", "US"], "612": ["Minneapolis", "MN", "US"], "216": ["Cleveland", "OH", "US"], "412": ["Pittsburgh", "PA", "US"], "513": ["Cincinnati", "OH", "US"], "314": ["St. Louis", "MO", "US"], "801": ["Salt Lake City", "UT", "US"],
};

function cityFromPhone(phone?: string): { city: string; state: string; country: string } | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const hit = digits.length === 10 ? AREA_CODES[digits.slice(0, 3)] : undefined;
  return hit ? { city: hit[0], state: hit[1], country: hit[2] } : null;
}

const GENERIC_TITLES = /^(home|homepage|welcome|index|main|untitled|official site|official website)$/i;

/** "Plumbing Company", "Dental Clinic" — a category, not a name. */
function looksLikeCategory(name: string): boolean {
  const n = name.trim().toLowerCase();
  return INDUSTRIES.some((i) => i.label.toLowerCase() === n) || /^(plumbing|dental|law|landscaping|roofing|cleaning|moving)\s+(company|clinic|firm|services?)$/i.test(n);
}

function logoAlt(html: string): string | undefined {
  const m =
    html.match(/<img[^>]+(?:class|id)=["'][^"']*logo[^"']*["'][^>]*\salt=["']([^"']{3,80})["']/i) ||
    html.match(/<img[^>]+\salt=["']([^"']{3,80})["'][^>]*(?:class|id)=["'][^"']*logo[^"']*["']/i) ||
    html.match(/<a[^>]+(?:class|id|aria-label)=["'][^"']*logo[^"']*["'][^>]*>\s*<img[^>]+\salt=["']([^"']{3,80})["']/i);
  const alt = m ? decode(m[1]).replace(/\s*(logo|home|homepage)\s*$/i, "").trim() : undefined;
  return alt && !GENERIC_TITLES.test(alt) && !/^(image|img|photo|icon)$/i.test(alt) ? alt : undefined;
}

function nameFromHtml(html: string): string | undefined {
  const site = metaContent(html, "property", "og:site_name");
  if (site && !GENERIC_TITLES.test(site) && !looksLikeCategory(site)) return site;
  const t = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  // "Bright Smiles Dental | Dentist in Toronto" → "Bright Smiles Dental";
  // "Home | Bright Smiles Dental" → "Bright Smiles Dental".
  const parts = t ? decode(t[1]).split(/\s+[|–—\-:•]\s+/).map((p) => p.trim()).filter(Boolean) : [];
  const fromTitle = parts.find((p) => !GENERIC_TITLES.test(p) && !looksLikeCategory(p));
  if (fromTitle && fromTitle.length > 2 && fromTitle.length < 80) return fromTitle;
  const alt = logoAlt(html);
  if (alt) return alt;
  const any = parts[0];
  return any && any.length > 2 && any.length < 80 ? any : undefined;
}

async function profileFromHtml(base: string): Promise<Omit<SiteProfile, "website" | "domain" | "industry" | "industryConfidence"> & { industry?: IndustryProfile; industryConfidence?: "high" | "medium" | "low" }> {
  const home = await fetchHtml(base);
  if (!home) return { reachable: false };

  const nodes = collectJsonLd(home);
  const schema = schemaBusiness(nodes);
  const title = home.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const description = metaContent(home, "name", "description") ?? metaContent(home, "property", "og:description");
  const bodyText = stripTags(home);

  const out: ReturnType<typeof profileFromHtml> extends Promise<infer T> ? T : never = {
    reachable: true,
    name: schema?.name ?? nameFromHtml(home),
    phone: schema?.phone ?? home.match(/href=["']tel:([^"']+)["']/i)?.[1]?.trim(),
    rating: schema?.rating,
    reviewCount: schema?.reviewCount,
  };

  if (schema?.city) {
    out.city = schema.city;
    out.state = schema.state;
    out.country = normalizeCountry(schema.country);
    out.address = schema.address;
    out.locationSource = "schema_org";
    out.locationConfidence = "high";
  } else {
    // Walk the homepage, then the usual contact/about pages, strongest signal first.
    const pages: string[] = [home];
    for (const path of ["/contact", "/contact-us", "/about", "/about-us", "/locations"]) {
      const page = await fetchHtml(`${base}${path}`);
      if (page) pages.push(page);
      if (pages.length >= 3) break;
    }

    let found: { city: string; state?: string; country?: string; source: SiteProfile["locationSource"]; confidence: SiteProfile["locationConfidence"] } | null = null;

    for (const page of pages) {
      const text = stripTags(page);
      const full = addressFromText(text);
      if (full) { found = { ...full, source: "html_address", confidence: "high" }; break; }
      const embed = addressFromMapEmbed(page);
      const fromEmbed = embed ? addressFromText(embed) ?? looseLocationFromText(embed) : null;
      if (fromEmbed) { found = { ...fromEmbed, source: "map_embed", confidence: "high" }; break; }
    }
    if (!found) {
      for (const page of pages) {
        const loose = looseLocationFromText(stripTags(page));
        if (loose) { found = { ...loose, confidence: loose.source === "service_area" ? "medium" : "high" }; break; }
      }
    }
    if (!found) {
      const guess = cityFromNameOrDomain(new URL(base).hostname.replace(/^www\./, ""), out.name, title ? decode(title) : undefined);
      if (guess) found = { ...guess, source: "name_or_domain", confidence: "medium" };
    }
    if (!found) {
      const guess = cityFromPhone(out.phone);
      if (guess) found = { ...guess, source: "phone_area_code", confidence: "low" };
    }

    if (found) {
      out.city = found.city;
      out.state = found.state;
      out.country = found.country ?? (found.state ? REGION_CODE_COUNTRY[found.state] : undefined);
      out.locationSource = found.source;
      out.locationConfidence = found.confidence;
    }
  }

  const cls = classifyIndustry({ title: title ? decode(title) : undefined, description, schemaTypes: schema?.types, body: bodyText });
  out.industry = cls.industry;
  out.industryConfidence = cls.confidence;
  return out;
}

const COUNTRY_ALIASES: Record<string, string> = {
  canada: "CA", ca: "CA", can: "CA",
  "united states": "US", usa: "US", us: "US", "united states of america": "US",
  "united kingdom": "GB", uk: "GB", gb: "GB", england: "GB", scotland: "GB", wales: "GB",
  australia: "AU", au: "AU",
};
function normalizeCountry(c?: string): string | undefined {
  if (!c) return undefined;
  const k = c.trim().toLowerCase();
  return COUNTRY_ALIASES[k] ?? (k.length === 2 ? k.toUpperCase() : undefined);
}

// ---------- Google Places ----------

interface PlaceHit {
  placeId: string;
  name: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  types: string[];
}

/**
 * Places API (New) Text Search on the bare domain — Google matches listings
 * whose website is that domain remarkably well. Falls back to the legacy
 * Find Place endpoint for keys that only have the classic Places API enabled.
 */
async function lookupPlace(query: string, apiKey: string): Promise<PlaceHit[]> {
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.websiteUri",
    "places.formattedAddress",
    "places.addressComponents",
    "places.nationalPhoneNumber",
    "places.rating",
    "places.userRatingCount",
    "places.types",
  ].join(",");

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": fieldMask },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5, languageCode: "en" }),
  });

  if (res.ok) {
    const data = (await res.json()) as { places?: Array<Record<string, unknown>> };
    return (data.places ?? []).map((p) => {
      const comps = (p.addressComponents as Array<{ longText?: string; shortText?: string; types?: string[] }>) ?? [];
      const comp = (t: string, short = false) => comps.find((c) => c.types?.includes(t))?.[short ? "shortText" : "longText"];
      return {
        placeId: String(p.id ?? ""),
        name: String((p.displayName as { text?: string })?.text ?? ""),
        website: typeof p.websiteUri === "string" ? p.websiteUri : undefined,
        address: typeof p.formattedAddress === "string" ? p.formattedAddress : undefined,
        city: comp("locality") ?? comp("postal_town") ?? comp("sublocality_level_1") ?? comp("administrative_area_level_2"),
        state: comp("administrative_area_level_1", true),
        country: comp("country", true),
        phone: typeof p.nationalPhoneNumber === "string" ? p.nationalPhoneNumber : undefined,
        rating: typeof p.rating === "number" ? p.rating : undefined,
        reviewCount: typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
        types: Array.isArray(p.types) ? (p.types as string[]) : [],
      };
    });
  }

  // 403 = "Places API (New)" not enabled on this key → try the legacy endpoint.
  if (res.status !== 403 && res.status !== 404) {
    throw new Error(`Google Places (new) HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const fields = "place_id,name,formatted_address,rating,user_ratings_total,types";
  const legacy = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=${fields}&key=${apiKey}`
  );
  const data = (await legacy.json()) as { status: string; error_message?: string; candidates?: Array<Record<string, unknown>> };
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places (legacy) ${data.status}: ${data.error_message ?? ""}`);
  }

  const hits: PlaceHit[] = [];
  for (const c of data.candidates ?? []) {
    const placeId = String(c.place_id ?? "");
    if (!placeId) continue;
    // Website + address components need a Details call on the legacy API.
    const det = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=website,address_component,formatted_phone_number&key=${apiKey}`
    );
    const dj = (await det.json()) as { result?: { website?: string; formatted_phone_number?: string; address_components?: Array<{ long_name: string; short_name: string; types: string[] }> } };
    const comps = dj.result?.address_components ?? [];
    const comp = (t: string, short = false) => comps.find((x) => x.types.includes(t))?.[short ? "short_name" : "long_name"];
    hits.push({
      placeId,
      name: String(c.name ?? ""),
      website: dj.result?.website,
      address: typeof c.formatted_address === "string" ? c.formatted_address : undefined,
      city: comp("locality") ?? comp("postal_town") ?? comp("sublocality_level_1") ?? comp("administrative_area_level_2"),
      state: comp("administrative_area_level_1", true),
      country: comp("country", true),
      phone: dj.result?.formatted_phone_number,
      rating: typeof c.rating === "number" ? c.rating : undefined,
      reviewCount: typeof c.user_ratings_total === "number" ? c.user_ratings_total : undefined,
      types: Array.isArray(c.types) ? (c.types as string[]) : [],
    });
  }
  return hits;
}

/**
 * Finds the Google listing for a domain. A hit only counts when its website
 * resolves to the same domain — a name-only match could be a different
 * business with a similar name in another city.
 */
async function placeForDomain(domain: string, hints: { name?: string; city?: string }): Promise<PlaceHit | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  const queries = [domain];
  if (hints.name) queries.push([hints.name, hints.city].filter(Boolean).join(" "));

  for (const q of queries) {
    try {
      const hits = await lookupPlace(q, apiKey);
      const match = hits.find((h) => h.website && normalizeDomain(h.website) === domain);
      if (match) return match;
    } catch (err) {
      console.warn("[siteProfile] Google Places lookup failed:", err instanceof Error ? err.message : err);
      return null;
    }
  }
  return null;
}

// ---------- Public API ----------

const cache = new Map<string, { at: number; value: SiteProfile }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function detectSiteProfile(rawUrl: string): Promise<SiteProfile> {
  let base = rawUrl.trim();
  if (!/^https?:\/\//i.test(base)) base = `https://${base}`;
  base = base.replace(/\/+$/, "");
  const domain = normalizeDomain(base) || base;

  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  const html = await profileFromHtml(base);
  const place = await placeForDomain(domain, { name: html.name, city: html.city });

  const placeIndustry = industryFromPlaceTypes(place?.types);
  const industry = placeIndustry ?? html.industry ?? GENERIC_INDUSTRY;
  const industryConfidence: SiteProfile["industryConfidence"] = placeIndustry ? "high" : (html.industryConfidence ?? "low");

  const profile: SiteProfile = {
    website: base,
    domain,
    reachable: html.reachable || Boolean(place),
    name: place?.name || html.name,
    city: place?.city || html.city,
    state: place?.state || html.state,
    country: normalizeCountry(place?.country) || html.country,
    address: place?.address || html.address,
    phone: place?.phone || html.phone,
    industry,
    industryConfidence,
    rating: place?.rating ?? html.rating,
    reviewCount: place?.reviewCount ?? html.reviewCount,
    googlePlaceId: place?.placeId,
    locationSource: place?.city ? "google_places" : html.locationSource,
    locationConfidence: place?.city ? "high" : html.locationConfidence,
  };

  cache.set(domain, { at: Date.now(), value: profile });
  return profile;
}
