import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClinic } from "@/lib/clinicAuth";

const SETTINGS_SELECT = {
  name: true,
  email: true,
  phone: true,
  address: true,
  city: true,
  province: true,
  website: true,
  currency: true,
  taxLabel: true,
  taxRateBps: true,
  invoicePrefix: true,
  nextInvoiceNumber: true,
} as const;

export async function GET(request: Request) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  const clinic = await prisma.clinic.findUnique({ where: { id: auth.clinicId }, select: SETTINGS_SELECT });
  return NextResponse.json({ settings: clinic });
}

const optional = z.string().trim().max(200).nullable().optional().transform((v) => (v === undefined ? undefined : v || null));

const patchSchema = z.object({
  name: z.string().trim().min(1, "Clinic name is required.").max(160).optional(),
  email: z.union([z.string().trim().email("Clinic email isn't valid."), z.literal(""), z.null()]).optional().transform((v) => (v === undefined ? undefined : v || null)),
  phone: optional,
  address: optional,
  city: optional,
  province: optional,
  website: optional,
  currency: z.enum(["CAD", "USD"]).optional(),
  taxLabel: z.string().trim().min(1, "Tax label is required.").max(20).optional(),
  taxRateBps: z.number().int().min(0, "Tax rate can't be negative.").max(5000, "Tax rate looks too high.").optional(),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Invoice prefix is required.")
    .max(12)
    .regex(/^[A-Za-z0-9-]+$/, "Invoice prefix can only use letters, numbers and dashes.")
    .optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireClinic(request, "OWNER");
  if (auth instanceof NextResponse) return auth;
  try {
    const result = patchSchema.safeParse(await request.json());
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const settings = await prisma.clinic.update({ where: { id: auth.clinicId }, data: result.data, select: SETTINGS_SELECT });
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Clinic settings PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
