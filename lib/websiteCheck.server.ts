import "server-only";

/**
 * A real, credential-free website check: fetches the practice's own site
 * directly (no third-party API) and verifies SSL, response time, and mobile
 * viewport configuration. This is the one MVP audit category that can be
 * made genuinely real without any provider integration — see
 * docs/mvp-readiness.md #15-18. The other categories (local visibility,
 * conversion, reputation, competitor gap) still need DataForSEO/Places and
 * remain deterministic placeholders until those integrations land.
 */

export type WebsiteCheckResult = {
  ok: boolean;
  sslValid: boolean;
  responseTimeMs: number | null;
  mobileViewport: boolean;
  statusCode: number | null;
  error?: string;
};

const TIMEOUT_MS = 8000;
const SPEED_FAST_MS = 1200;
const SPEED_SLOW_MS = 3500;
const MAX_SCORE = 20;

export async function checkWebsite(rawUrl: string): Promise<WebsiteCheckResult> {
  const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const requestedSsl = url.startsWith("https://");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const start = Date.now();

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "SmileAIMarketingAuditBot/1.0 (+https://smileaimarketing.com)" },
    });
    const responseTimeMs = Date.now() - start;
    const html = res.ok ? await res.text() : "";
    const mobileViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

    return {
      ok: true,
      sslValid: res.url.startsWith("https://") || requestedSsl,
      responseTimeMs,
      mobileViewport,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      ok: false,
      sslValid: requestedSsl,
      responseTimeMs: null,
      mobileViewport: false,
      statusCode: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function scoreWebsiteQuality(result: WebsiteCheckResult): {
  score: number;
  findings: Record<string, string | number | boolean | null>;
  title: string;
  description: string;
} {
  if (!result.ok) {
    return {
      score: 4,
      findings: { reachable: false, error: result.error ?? "unreachable" },
      title: "Website Unreachable",
      description:
        "We couldn't reach this website during the audit — it may be down, blocking automated requests, or the URL may be incorrect. This significantly limits what a prospective patient (and Google) can see too.",
    };
  }

  let score = MAX_SCORE;
  const notes: string[] = [];

  if (!result.sslValid) {
    score -= 8;
    notes.push("isn't using a secure (HTTPS) connection");
  }
  if (result.responseTimeMs !== null && result.responseTimeMs > SPEED_SLOW_MS) {
    score -= 6;
    notes.push("loads slowly");
  } else if (result.responseTimeMs !== null && result.responseTimeMs > SPEED_FAST_MS) {
    score -= 3;
    notes.push("loads slower than ideal");
  }
  if (!result.mobileViewport) {
    score -= 6;
    notes.push("is missing a mobile-responsive viewport tag");
  }

  score = Math.max(2, Math.min(MAX_SCORE, score));

  const description =
    notes.length === 0
      ? "Your website is secure, responds quickly, and is configured for mobile devices."
      : `Your website ${notes.join(" and ")}. Fixing this can improve both patient trust and mobile conversion.`;

  return {
    score,
    findings: {
      reachable: true,
      ssl: result.sslValid,
      responseTimeMs: result.responseTimeMs,
      mobileViewport: result.mobileViewport,
      statusCode: result.statusCode,
    },
    title: "Website Speed & Structure",
    description,
  };
}
