/** All clinic amounts are stored as integer cents. */

export function formatMoney(cents: number | null | undefined, currency = "CAD") {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

/** Parses user input like "1,234.5" or "$12" into cents; null if it isn't a number. */
export function toCents(input: string | number): number | null {
  const n = typeof input === "number" ? input : Number(String(input).replace(/[$,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function centsToInput(cents: number | null | undefined) {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

/** Tax on a cents amount at a basis-point rate (1300 = 13%), rounded to the cent. */
export function taxOn(cents: number, rateBps: number) {
  return Math.round((cents * rateBps) / 10_000);
}
