export interface WebsiteSignals {
  reachable: boolean;
  httpStatus?: number;
  isHttps: boolean;
  responseTimeMs: number;
  hasViewportMeta: boolean;
  pageTitle?: string;
  metaDescription?: string;
  hasClickToCall: boolean;
  hasBookingCta: boolean;
  hasContactForm: boolean;
  hasSchemaMarkup: boolean;
  hasVisibleAddress: boolean;
  hasVisiblePhone: boolean;
  checkedAt: string;
}

export async function analyzeWebsite(targetUrl: string): Promise<WebsiteSignals> {
  const startTime = Date.now();
  let rawUrl = targetUrl.trim();
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = `https://${rawUrl}`;
  }

  const isHttps = rawUrl.startsWith("https://");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const res = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1 SmileAIAudit/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const reachable = res.status >= 200 && res.status < 400;

    if (!reachable) {
      return {
        reachable: false,
        httpStatus: res.status,
        isHttps,
        responseTimeMs,
        hasViewportMeta: false,
        hasClickToCall: false,
        hasBookingCta: false,
        hasContactForm: false,
        hasSchemaMarkup: false,
        hasVisibleAddress: false,
        hasVisiblePhone: false,
        checkedAt: new Date().toISOString(),
      };
    }

    const html = await res.text();
    const lowerHtml = html.toLowerCase();

    // Signal extractions
    const hasViewportMeta = /<meta[^>]+name=["']viewport["']/i.test(html);
    
    // Page Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : undefined;

    // Meta Description
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : undefined;

    // Click to Call
    const hasClickToCall = /href=["']tel:[^"']+["']/i.test(html);

    // Booking CTA
    const hasBookingCta = /\b(book|schedule|appointment|request consultation|online booking)\b/i.test(lowerHtml);

    // Contact Form
    const hasContactForm = /<form[^>]*>/i.test(html) || /type=["']submit["']/i.test(html);

    // Schema Markup
    const hasSchemaMarkup = /application\/ld\+json/i.test(html) || /itemscope/i.test(html);

    // Phone / Address regex heuristics
    const hasVisiblePhone = /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(html);
    const hasVisibleAddress = /\b(street|st|avenue|ave|road|rd|suite|ste|blvd|boulevard|drive|dr|way|lane|ln)\b/i.test(lowerHtml);

    return {
      reachable: true,
      httpStatus: res.status,
      isHttps,
      responseTimeMs,
      hasViewportMeta,
      pageTitle,
      metaDescription,
      hasClickToCall,
      hasBookingCta,
      hasContactForm,
      hasSchemaMarkup,
      hasVisibleAddress,
      hasVisiblePhone,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    return {
      reachable: false,
      isHttps,
      responseTimeMs,
      hasViewportMeta: false,
      hasClickToCall: false,
      hasBookingCta: false,
      hasContactForm: false,
      hasSchemaMarkup: false,
      hasVisibleAddress: false,
      hasVisiblePhone: false,
      checkedAt: new Date().toISOString(),
    };
  }
}
