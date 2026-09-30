import { z } from "zod";
import type { Clinic, Invoice, InvoiceLine } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, taxOn } from "@/lib/money";

/*
 * Shared accounting helpers for the dentist panel: invoice totals, date
 * parsing, the email/print rendering of an invoice, and the clinic's
 * money settings that every accounting screen needs.
 */

export const EXPENSE_CATEGORIES = [
  "Dental supplies",
  "Lab fees",
  "Equipment",
  "Rent",
  "Utilities",
  "Payroll",
  "Insurance",
  "Marketing",
  "Software",
  "Professional fees",
  "Continuing education",
  "Repairs & maintenance",
  "Bank & card fees",
  "Office supplies",
  "Other",
];

export const INCOME_CATEGORIES = ["Patient payments", "Insurance claims", "Product sales", "Other income"];

/** Category of the income entry created when an invoice is marked paid. */
export const INVOICE_INCOME_CATEGORY = "Patient payments";

export const lineSchema = z.object({
  description: z.string().trim().min(1, "Every line needs a description.").max(300),
  quantity: z.number().int().min(1).max(10_000),
  unitPriceCents: z.number().int().min(0).max(100_000_000),
  taxable: z.boolean(),
});

export type LineInput = z.infer<typeof lineSchema>;

/** "YYYY-MM-DD" → a Date at UTC noon, so the calendar day never shifts across time zones. */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .transform((s) => new Date(`${s}T12:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid date.");

export const invoiceBodySchema = z.object({
  patientId: z.string().uuid().nullable().optional(),
  billToName: z.string().trim().min(1, "Who is this invoice for?").max(200),
  billToEmail: z.string().trim().email("That email address doesn't look right.").max(200).nullable().optional().or(z.literal("")),
  issueDate: dateString,
  dueDate: dateString.nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  lines: z.array(lineSchema).min(1, "Add at least one line item.").max(100),
});

export function computeTotals(lines: LineInput[], taxRateBps: number) {
  let subtotalCents = 0;
  let taxableCents = 0;
  for (const l of lines) {
    const amount = l.quantity * l.unitPriceCents;
    subtotalCents += amount;
    if (l.taxable) taxableCents += amount;
  }
  const taxCents = taxOn(taxableCents, taxRateBps);
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

export async function getClinicMoneySettings(clinicId: string) {
  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: clinicId },
    select: { name: true, currency: true, taxRateBps: true, taxLabel: true },
  });
  return clinic;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function fmtDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }) : "—";
}

type InvoiceWithLines = Invoice & { lines: InvoiceLine[] };
type ClinicInfo = Pick<Clinic, "name" | "email" | "phone" | "address" | "city" | "province" | "currency">;

/** Email body for a sent invoice — inline styles only, since mail clients ignore stylesheets. */
export function renderInvoiceEmail(invoice: InvoiceWithLines, clinic: ClinicInfo) {
  const money = (c: number) => formatMoney(c, clinic.currency);
  const rows = invoice.lines
    .map(
      (l) => `<tr>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(l.description)}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${l.quantity}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${money(l.unitPriceCents)}</td>
  <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${money(l.quantity * l.unitPriceCents)}</td>
</tr>`
    )
    .join("");
  const clinicLine = [clinic.address, clinic.city, clinic.province].filter(Boolean).map((s) => escapeHtml(s!)).join(", ");
  const contact = [clinic.phone, clinic.email].filter(Boolean).map((s) => escapeHtml(s!)).join(" · ");

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;max-width:600px">
<p>Hi ${escapeHtml(invoice.billToName)},</p>
<p>Here is your invoice from <strong>${escapeHtml(clinic.name)}</strong>.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
<tr><td><strong>Invoice</strong> ${escapeHtml(invoice.number)}</td><td style="text-align:right">Issued ${fmtDate(invoice.issueDate)}${invoice.dueDate ? ` · Due ${fmtDate(invoice.dueDate)}` : ""}</td></tr>
</table>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr style="color:#6b7280;text-align:left"><th style="padding:8px 0;border-bottom:1px solid #d1d5db">Description</th><th style="padding:8px 0;border-bottom:1px solid #d1d5db;text-align:right">Qty</th><th style="padding:8px 0;border-bottom:1px solid #d1d5db;text-align:right">Price</th><th style="padding:8px 0;border-bottom:1px solid #d1d5db;text-align:right">Amount</th></tr>
${rows}
<tr><td colspan="3" style="padding:8px 0;text-align:right">Subtotal</td><td style="padding:8px 0;text-align:right">${money(invoice.subtotalCents)}</td></tr>
<tr><td colspan="3" style="padding:4px 0;text-align:right">${escapeHtml(invoice.taxLabel)} (${(invoice.taxRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}%)</td><td style="padding:4px 0;text-align:right">${money(invoice.taxCents)}</td></tr>
<tr><td colspan="3" style="padding:8px 0;text-align:right;font-weight:bold">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold">${money(invoice.totalCents)}</td></tr>
</table>
${invoice.notes ? `<p style="white-space:pre-line">${escapeHtml(invoice.notes)}</p>` : ""}
<p style="color:#6b7280;font-size:12px">${escapeHtml(clinic.name)}${clinicLine ? `<br>${clinicLine}` : ""}${contact ? `<br>${contact}` : ""}</p>
</div>`;

  const text = [
    `Invoice ${invoice.number} from ${clinic.name}`,
    `Issued ${fmtDate(invoice.issueDate)}${invoice.dueDate ? ` · Due ${fmtDate(invoice.dueDate)}` : ""}`,
    "",
    ...invoice.lines.map((l) => `${l.description} — ${l.quantity} × ${money(l.unitPriceCents)} = ${money(l.quantity * l.unitPriceCents)}`),
    "",
    `Subtotal: ${money(invoice.subtotalCents)}`,
    `${invoice.taxLabel}: ${money(invoice.taxCents)}`,
    `Total: ${money(invoice.totalCents)}`,
    invoice.notes ? `\n${invoice.notes}` : "",
  ].join("\n");

  return { html, text };
}

/** Parses "YYYY-MM" into the UTC instant the month starts. */
export function monthStart(ym: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(Number(m[1]), month - 1, 1));
}

export function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export const ledgerBodySchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    category: z.string().trim().min(1, "Pick a category.").max(80),
    description: z.string().trim().max(300).nullable().optional().transform((s) => s || null),
    counterparty: z.string().trim().max(200).nullable().optional().transform((s) => s || null),
    amountCents: z.number().int().min(1, "Enter an amount above zero.").max(1_000_000_000),
    taxCents: z.number().int().min(0).max(1_000_000_000).default(0),
    date: dateString,
  })
  .refine((v) => v.taxCents <= v.amountCents, { message: "Tax can't be more than the total amount.", path: ["taxCents"] });
