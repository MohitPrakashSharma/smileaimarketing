export const PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

/**
 * Sales-tax presets by province (rates as of 2026). The invoice model holds a
 * single rate, so provinces with a separate provincial tax get a combined
 * preset where it's a whole number; Quebec's QST (9.975%) can't be combined at
 * basis-point precision, so its preset is GST only.
 */
export const TAX_PRESETS: { province: string; label: string; ratePercent: number; note?: string }[] = [
  { province: "ON", label: "HST", ratePercent: 13 },
  { province: "NB", label: "HST", ratePercent: 15 },
  { province: "NL", label: "HST", ratePercent: 15 },
  { province: "PE", label: "HST", ratePercent: 15 },
  { province: "NS", label: "HST", ratePercent: 14 },
  { province: "AB", label: "GST", ratePercent: 5 },
  { province: "NT", label: "GST", ratePercent: 5 },
  { province: "NU", label: "GST", ratePercent: 5 },
  { province: "YT", label: "GST", ratePercent: 5 },
  { province: "BC", label: "GST+PST", ratePercent: 12, note: "GST 5% + BC PST 7%. Use GST 5% alone if your taxable items are PST-exempt." },
  { province: "MB", label: "GST+RST", ratePercent: 12, note: "GST 5% + Manitoba RST 7%." },
  { province: "SK", label: "GST+PST", ratePercent: 11, note: "GST 5% + Saskatchewan PST 6%." },
  { province: "QC", label: "GST", ratePercent: 5, note: "QST (9.975%) is not included — add it as a separate line if you charge it." },
];

export function provinceName(code: string | null | undefined) {
  return PROVINCES.find((p) => p.code === code)?.name ?? code ?? "";
}
