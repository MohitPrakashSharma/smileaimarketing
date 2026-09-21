import type { Audit } from "@prisma/client";
import { env } from "@/lib/env.server";
import { collectOpportunityInputs } from "./sources";
import { buildOpportunityScenario, type ScenarioOptions } from "./scenario";
import type { OpportunityScenario } from "./types";

/** Scenario options from the environment (kept here so report.ts stays env-free for tests and scripts). */
export function opportunityOptionsFromEnv(): ScenarioOptions {
  return { upliftPoints: env.AUDIT_OPPORTUNITY_UPLIFT_POINTS, illustrativeAllowed: env.AUDIT_OPPORTUNITY_ILLUSTRATIVE };
}

/** The scenario for an audit, from whatever authorised data exists and the configured options. */
export function opportunityScenarioFor(audit: Pick<Audit, "summaryJson">): OpportunityScenario {
  return buildOpportunityScenario(collectOpportunityInputs(audit), opportunityOptionsFromEnv());
}

export * from "./types";
export { buildOpportunityScenario, figuresConsistent, HEADING as OPPORTUNITY_HEADING } from "./scenario";
export { collectOpportunityInputs, normaliseStoredInput, STORED_INPUTS_KEY } from "./sources";
