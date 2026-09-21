import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { normaliseStoredInput, STORED_INPUTS_KEY, opportunityScenarioFor } from "@/lib/audit/opportunity";
import type { OpportunityInputKey } from "@/lib/audit/opportunity/types";
import type { Prisma } from "@prisma/client";

/**
 * Records the financial inputs a practice has authorised us to use (figures
 * they gave us, or exports they shared), each with its source and period.
 * Admin only; stored on the audit's summaryJson, never exposed raw — the
 * public report only receives the derived scenario. Saving marks the customer
 * PDF for regeneration. PUT replaces the set; DELETE clears it.
 *
 * Body: { monthlyVisitors?: { value, source, label?, period?, measure? }, currentRate?, targetRate?, patientRate?, contribution? }
 * Rates are fractions (0–1). Sources: ga4 | gsc | crm | finance | practice_provided.
 */
const KEYS: OpportunityInputKey[] = ["monthlyVisitors", "currentRate", "targetRate", "patientRate", "contribution"];

type Loaded = { error: NextResponse; audit?: undefined } | { error?: undefined; audit: { id: string; engine: string; status: string; summaryJson: Prisma.JsonValue } };

async function load(request: Request, params: Promise<{ id: string }>): Promise<Loaded> {
  const admin = await getAdminSession(request);
  if (!admin) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { id } = await params;
  const audit = await prisma.audit.findUnique({ where: { id }, select: { id: true, engine: true, status: true, summaryJson: true } });
  if (!audit) return { error: NextResponse.json({ error: "Audit not found" }, { status: 404 }) };
  if (audit.engine !== "CRAWL_V2") return { error: NextResponse.json({ error: "Only v2 audits carry a financial scenario" }, { status: 409 }) };
  return { audit };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const r = await load(request, params);
  if (r.error) return r.error;
  const summary = (r.audit.summaryJson ?? {}) as Record<string, unknown>;
  return NextResponse.json({ inputs: summary[STORED_INPUTS_KEY] ?? null, scenario: opportunityScenarioFor(r.audit) });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const r = await load(request, params);
  if (r.error) return r.error;
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const stored: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const key of KEYS) {
    if (body[key] === undefined || body[key] === null) continue;
    const v = normaliseStoredInput(key, body[key]);
    if (!v) rejected.push(key);
    else stored[key] = v;
  }
  if (rejected.length) return NextResponse.json({ error: `Invalid inputs: ${rejected.join(", ")} (rates are fractions 0–1; sources: ga4, gsc, crm, finance, practice_provided)` }, { status: 400 });
  const summary = ((r.audit.summaryJson ?? {}) as Record<string, unknown>);
  const next = { ...summary, [STORED_INPUTS_KEY]: stored } as Prisma.InputJsonValue;
  const updated = await prisma.audit.update({ where: { id: r.audit.id }, data: { summaryJson: next, pdfStatus: "NOT_REQUESTED" }, select: { summaryJson: true } });
  return NextResponse.json({ inputs: stored, scenario: opportunityScenarioFor(updated) });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const r = await load(request, params);
  if (r.error) return r.error;
  const summary = { ...((r.audit.summaryJson ?? {}) as Record<string, unknown>) };
  delete summary[STORED_INPUTS_KEY];
  const updated = await prisma.audit.update({ where: { id: r.audit.id }, data: { summaryJson: summary as Prisma.InputJsonValue, pdfStatus: "NOT_REQUESTED" }, select: { summaryJson: true } });
  return NextResponse.json({ inputs: null, scenario: opportunityScenarioFor(updated) });
}
