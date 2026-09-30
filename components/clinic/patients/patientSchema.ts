import { z } from "zod";

/** "" / null / undefined → null; otherwise a valid date string → Date. */
export const optionalDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v == null || v.trim() === "") return v === undefined ? undefined : null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid date" });
      return z.NEVER;
    }
    return d;
  });

const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null));

export const patientInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z
    .union([z.string().trim().toLowerCase().email("Enter a valid email").max(200), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v ? v : null)),
  phone: optionalText(40),
  dateOfBirth: optionalDate,
  address: optionalText(300),
  notes: optionalText(5000),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .optional()
    .transform((t) => (t ? Array.from(new Set(t)) : t)),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  lastVisitAt: optionalDate,
  nextVisitAt: optionalDate,
});

export const patientUpdateSchema = patientInputSchema.partial();
