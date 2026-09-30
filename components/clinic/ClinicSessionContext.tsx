"use client";

import { createContext, useContext } from "react";

export type ClinicRole = "OWNER" | "MANAGER" | "STAFF";

export type ClinicSessionUser = {
  userId: string;
  clinicId: string;
  role: ClinicRole;
  name: string;
  email: string;
  clinicName: string;
};

const RANK: Record<ClinicRole, number> = { STAFF: 0, MANAGER: 1, OWNER: 2 };

export function roleAtLeast(role: ClinicRole | undefined, min: ClinicRole) {
  return !!role && RANK[role] >= RANK[min];
}

export const ClinicSessionContext = createContext<ClinicSessionUser | null>(null);

/** The signed-in clinic user. Only rendered inside the clinic layout once the session has loaded. */
export function useClinicSession() {
  const ctx = useContext(ClinicSessionContext);
  if (!ctx) throw new Error("useClinicSession must be used inside the clinic layout");
  return ctx;
}
