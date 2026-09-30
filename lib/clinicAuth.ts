import crypto from "crypto";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { ClinicRole } from "@prisma/client";
import { env } from "@/lib/env.server";
import { prisma } from "@/lib/prisma";

/*
 * Dentist-panel auth. Deliberately separate from the superadmin session:
 * its own cookie, its own JWT audience and its own user table (ClinicUser),
 * so a clinic login can never reach /admin and vice versa.
 */

export const CLINIC_COOKIE = "clinic_session";
const AUDIENCE = "clinic";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

type ClinicTokenPayload = { sub: string; clinicId: string; role: ClinicRole };

export type ClinicSession = {
  userId: string;
  clinicId: string;
  role: ClinicRole;
  name: string;
  email: string;
  clinicName: string;
};

export function signClinicToken(payload: ClinicTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: MAX_AGE_SECONDS, audience: AUDIENCE });
}

function verifyClinicToken(token: string): ClinicTokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_SECRET, { audience: AUDIENCE }) as ClinicTokenPayload;
  } catch {
    return null;
  }
}

export function setClinicCookie(res: NextResponse, token: string) {
  res.cookies.set(CLINIC_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    sameSite: "lax",
  });
}

export function clearClinicCookie(res: NextResponse) {
  res.cookies.set(CLINIC_COOKIE, "", { httpOnly: true, path: "/", expires: new Date(0) });
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return undefined;
}

/**
 * Resolves the signed-in clinic user from the request. Re-reads the user on
 * every call so a deactivated user, a deactivated clinic or a role change
 * takes effect immediately rather than when the 7-day token expires.
 */
export async function getClinicSession(req: Request): Promise<ClinicSession | null> {
  const token = readCookie(req, CLINIC_COOKIE);
  if (!token) return null;
  const payload = verifyClinicToken(token);
  if (!payload) return null;

  const user = await prisma.clinicUser.findUnique({
    where: { id: payload.sub },
    include: { clinic: { select: { name: true, active: true } } },
  });
  if (!user || !user.active || !user.clinic.active || !user.passwordHash) return null;

  return {
    userId: user.id,
    clinicId: user.clinicId,
    role: user.role,
    name: user.name,
    email: user.email,
    clinicName: user.clinic.name,
  };
}

const RANK: Record<ClinicRole, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 };

export function hasRole(session: ClinicSession, min: ClinicRole) {
  return RANK[session.role] >= RANK[min];
}

/**
 * Route guard: `const auth = await requireClinic(req, "MANAGER"); if (auth instanceof NextResponse) return auth;`
 */
export async function requireClinic(req: Request, min: ClinicRole = "STAFF"): Promise<ClinicSession | NextResponse> {
  const session = await getClinicSession(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(session, min)) return NextResponse.json({ error: "You don't have access to this." }, { status: 403 });
  return session;
}

export function newInviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function inviteUrl(token: string) {
  return `${env.APP_BASE_URL.replace(/\/$/, "")}/clinic/accept-invite?token=${encodeURIComponent(token)}`;
}
