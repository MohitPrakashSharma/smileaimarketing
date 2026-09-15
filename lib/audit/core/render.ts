import type { FetchResult, PageFacts } from "./types";

/**
 * Hook for a future JS-rendering fallback (Phase 4). The crawler never
 * renders by default; when a fallback is supplied it is consulted per page
 * and only invoked for pages that genuinely look client-rendered. No
 * implementation ships in Phase 1 — `noRenderFallback` is the default.
 */
export interface RenderFallback {
  /** Decide from the static parse whether rendering is worth it. */
  shouldRender(facts: PageFacts, fetched: FetchResult): boolean;
  /** Return rendered HTML, or null to keep the static result. */
  render(url: string): Promise<string | null>;
}

/** Heuristic shared with the `tech.render.js_only` check: almost no text, lots of script. */
export function looksClientRendered(facts: PageFacts): boolean {
  if (facts.spaRootEmpty) return true;
  // Whole body nearly empty of text, links AND images — a real page with a
  // gallery, a form or a nav is not "client-rendered", it's just terse.
  return facts.bodyWordCount < 30 && facts.links.filter((l) => l.internal).length < 3 && facts.images.length < 3 && facts.externalScriptCount >= 2;
}

export const noRenderFallback: RenderFallback | undefined = undefined;
