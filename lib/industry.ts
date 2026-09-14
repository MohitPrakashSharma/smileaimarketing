/**
 * Industry vocabulary for audits. The scorer, narrative, AI prompt, PDF and
 * report page all read their nouns from here so a plumber, a law firm and a
 * dental clinic each get copy that makes sense for them — nothing downstream
 * should hardcode "patients" or "dentist" anymore.
 *
 * Isomorphic: no server-only imports, it's used by the client report page too.
 */

export interface IndustryProfile {
  /** Stable key stored in Business.category via `label`; used for lookups. */
  key: string;
  /** Human label saved as Business.category, e.g. "Dental Clinic". */
  label: string;
  /** What a customer would type into Google, e.g. "dentist" → "dentist in Toronto". */
  searchKeyword: string;
  /** Plural noun for the people the business serves. */
  customers: string;
  /** Singular of `customers`. */
  customer: string;
  /** What the business calls itself. */
  business: string;
  /** Plural of `business`. */
  businesses: string;
  /** The conversion moment — "appointment", "quote", "reservation"… */
  booking: string;
  /** Lowercase keywords found in a site's title/description/body/schema type. */
  matchers: string[];
  /** Google Places `types` values that map to this industry. */
  placeTypes: string[];
}

const P = (
  key: string,
  label: string,
  searchKeyword: string,
  nouns: { customers: string; customer: string; business: string; businesses: string; booking: string },
  matchers: string[],
  placeTypes: string[] = []
): IndustryProfile => ({ key, label, searchKeyword, ...nouns, matchers, placeTypes });

const HEALTH = { customers: "patients", customer: "patient", business: "practice", businesses: "practices", booking: "appointment" };
const CLIENT_FIRM = { customers: "clients", customer: "client", business: "firm", businesses: "firms", booking: "consultation" };
const TRADE = { customers: "customers", customer: "customer", business: "business", businesses: "businesses", booking: "quote" };
const HOSPITALITY = { customers: "guests", customer: "guest", business: "business", businesses: "businesses", booking: "reservation" };
const RETAIL = { customers: "customers", customer: "customer", business: "business", businesses: "businesses", booking: "order" };
const SERVICE = { customers: "clients", customer: "client", business: "business", businesses: "businesses", booking: "booking" };

export const INDUSTRIES: IndustryProfile[] = [
  P("dental", "Dental Clinic", "dentist", HEALTH, ["dentist", "dental", "orthodont", "dentistry", "invisalign", "teeth whitening", "endodont", "periodont"], ["dentist", "dental_clinic"]),
  P("medical", "Medical Clinic", "doctor", HEALTH, ["medical clinic", "family doctor", "physician", "walk-in clinic", "urgent care", "family medicine", "pediatric", "medical centre", "medical center", "dermatolog", "naturopath"], ["doctor", "hospital", "medical_lab"]),
  P("chiropractic", "Chiropractor", "chiropractor", HEALTH, ["chiropract"], ["chiropractor"]),
  P("physiotherapy", "Physiotherapy Clinic", "physiotherapist", HEALTH, ["physiotherap", "physical therap", "rehab clinic", "massage therap"], ["physiotherapist"]),
  P("optometry", "Optometrist", "optometrist", HEALTH, ["optometr", "eye care", "eye exam", "eyewear", "optical"], ["optician", "eye_care"]),
  P("veterinary", "Veterinary Clinic", "vet", { customers: "pet owners", customer: "pet owner", business: "clinic", businesses: "clinics", booking: "appointment" }, ["veterinar", "animal hospital", "pet clinic"], ["veterinary_care"]),
  P("mental-health", "Therapy Practice", "therapist", { customers: "clients", customer: "client", business: "practice", businesses: "practices", booking: "session" }, ["psycholog", "counsell", "counseling", "psychotherap", "mental health"], []),
  P("legal", "Law Firm", "lawyer", CLIENT_FIRM, ["law firm", "lawyer", "attorney", "legal services", "barrister", "solicitor", "paralegal"], ["lawyer"]),
  P("accounting", "Accounting Firm", "accountant", CLIENT_FIRM, ["accountant", "accounting", "bookkeep", "tax preparation", "tax services", "cpa firm", "chartered professional accountant"], ["accounting"]),
  P("financial", "Financial Advisor", "financial advisor", CLIENT_FIRM, ["financial advisor", "financial planning", "wealth management", "mortgage broker", "insurance broker", "insurance agency"], ["insurance_agency", "finance"]),
  P("real-estate", "Real Estate Agency", "real estate agent", { customers: "clients", customer: "client", business: "brokerage", businesses: "brokerages", booking: "consultation" }, ["real estate", "realtor", "realty", "homes for sale", "property management"], ["real_estate_agency"]),
  P("plumbing", "Plumbing Company", "plumber", TRADE, ["plumber", "plumbing", "drain cleaning", "water heater"], ["plumber"]),
  P("hvac", "HVAC Company", "hvac contractor", TRADE, ["hvac", "heating and cooling", "furnace", "air conditioning", "heating & cooling", "heat pump"], []),
  P("electrical", "Electrical Contractor", "electrician", TRADE, ["electrician", "electrical contractor", "electrical services"], ["electrician"]),
  P("roofing", "Roofing Company", "roofer", TRADE, ["roofing", "roofer", "roof repair", "roof replacement"], ["roofing_contractor"]),
  P("landscaping", "Landscaping Company", "landscaper", TRADE, ["landscap", "lawn care", "tree service", "snow removal", "hardscap"], []),
  P("cleaning", "Cleaning Service", "cleaning service", TRADE, ["cleaning service", "house cleaning", "maid service", "janitorial", "carpet cleaning"], []),
  P("contractor", "General Contractor", "contractor", TRADE, ["general contractor", "renovation", "remodeling", "home improvement", "kitchen and bath", "construction company", "painting contractor", "painters"], ["general_contractor", "painter"]),
  P("moving", "Moving Company", "movers", TRADE, ["moving company", "movers", "relocation services"], ["moving_company"]),
  P("pest-control", "Pest Control Company", "pest control", TRADE, ["pest control", "exterminator"], []),
  P("auto", "Auto Repair Shop", "auto repair", TRADE, ["auto repair", "mechanic", "auto body", "collision repair", "tire shop", "oil change", "car repair"], ["car_repair", "car_dealer", "car_wash"]),
  P("restaurant", "Restaurant", "restaurant", HOSPITALITY, ["restaurant", "menu", "dine-in", "takeout", "take-out", "bistro", "pizzeria", "pizza", "sushi", "grill", "diner", "cafe", "café", "coffee shop", "bakery", "catering", "bar & grill"], ["restaurant", "cafe", "bakery", "bar", "meal_takeaway", "meal_delivery"]),
  P("hotel", "Hotel", "hotel", HOSPITALITY, ["hotel", "bed and breakfast", "inn ", "motel", "resort", "vacation rental"], ["lodging"]),
  P("salon", "Salon & Spa", "hair salon", SERVICE, ["hair salon", "barber", "spa", "nail salon", "beauty salon", "esthetic", "aesthetic", "med spa", "medspa", "lash", "waxing"], ["hair_care", "beauty_salon", "spa", "hair_salon", "nail_salon"]),
  P("fitness", "Fitness Studio", "gym", { customers: "members", customer: "member", business: "studio", businesses: "studios", booking: "trial class" }, ["gym", "fitness", "yoga studio", "pilates", "crossfit", "personal training", "martial arts"], ["gym"]),
  P("education", "Tutoring & Education", "tutor", { customers: "students", customer: "student", business: "school", businesses: "schools", booking: "enrollment" }, ["tutoring", "tutor", "driving school", "daycare", "preschool", "learning centre", "learning center", "music lessons", "academy"], ["school", "primary_school", "university"]),
  P("photography", "Photography Studio", "photographer", SERVICE, ["photograph", "videograph", "wedding photo"], []),
  P("events", "Event Services", "event planner", SERVICE, ["wedding planner", "event planning", "dj services", "florist", "party rental"], ["florist"]),
  P("retail", "Retail Store", "store", RETAIL, ["shop online", "add to cart", "free shipping", "our products", "boutique", "storefront", "checkout"], ["store", "clothing_store", "furniture_store", "jewelry_store", "shopping_mall"]),
  P("software", "Software Company", "software company", { customers: "customers", customer: "customer", business: "company", businesses: "companies", booking: "demo" }, ["saas", "software", "platform", "start free trial", "request a demo", "api", "developers"], []),
  P("agency", "Marketing Agency", "marketing agency", CLIENT_FIRM, ["marketing agency", "digital agency", "seo agency", "web design", "branding agency", "creative agency"], []),
];

export const GENERIC_INDUSTRY: IndustryProfile = P(
  "local-business",
  "Local Business",
  "business",
  { customers: "customers", customer: "customer", business: "business", businesses: "businesses", booking: "inquiry" },
  [],
  []
);

/** Resolve a stored Business.category (e.g. "Dental Clinic") back to a profile. */
export function industryFromCategory(category?: string | null): IndustryProfile {
  if (!category) return GENERIC_INDUSTRY;
  const c = category.trim().toLowerCase();
  const exact = INDUSTRIES.find((i) => i.label.toLowerCase() === c || i.key === c);
  if (exact) return exact;
  const fuzzy = INDUSTRIES.find((i) => i.matchers.some((m) => c.includes(m.trim())));
  return fuzzy ?? { ...GENERIC_INDUSTRY, label: category, searchKeyword: c };
}

/** Map a Google Places `types` array to a profile, or null if none match. */
export function industryFromPlaceTypes(types?: string[] | null): IndustryProfile | null {
  if (!types?.length) return null;
  for (const t of types) {
    const hit = INDUSTRIES.find((i) => i.placeTypes.includes(t));
    if (hit) return hit;
  }
  return null;
}

/**
 * Keyword classifier over page text. `weighted` fields (title, schema type,
 * meta description) count more than the body so a plumber whose footer
 * mentions "dental plan benefits" doesn't get misfiled.
 */
export function classifyIndustry(input: { title?: string; description?: string; schemaTypes?: string[]; body?: string }): {
  industry: IndustryProfile;
  confidence: "high" | "medium" | "low";
} {
  const strong = [input.title, input.description, ...(input.schemaTypes ?? [])].filter(Boolean).join(" ").toLowerCase();
  const weak = (input.body ?? "").toLowerCase().slice(0, 60_000);

  let best: { profile: IndustryProfile; score: number } | null = null;
  for (const profile of INDUSTRIES) {
    let score = 0;
    for (const m of profile.matchers) {
      if (strong.includes(m)) score += 5;
      const bodyHits = weak.split(m).length - 1;
      score += Math.min(bodyHits, 6);
    }
    if (score > 0 && (!best || score > best.score)) best = { profile, score };
  }

  if (!best) return { industry: GENERIC_INDUSTRY, confidence: "low" };
  return { industry: best.profile, confidence: best.score >= 8 ? "high" : best.score >= 3 ? "medium" : "low" };
}

/** "an appointment" / "a quote" — indefinite article for a noun. */
export function article(noun: string): string {
  return `${/^[aeiou]/i.test(noun) ? "an" : "a"} ${noun}`;
}

/** Capitalise the first letter — for sentence starts like "Patients nearby…". */
export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
