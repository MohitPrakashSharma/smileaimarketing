"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DetectedSite {
  website: string;
  reachable: boolean;
  name: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: { key: string; label: string; searchKeyword: string };
  industryConfidence: "high" | "medium" | "low";
  locationSource: "google_places" | "schema_org" | "html_address" | "map_embed" | "service_area" | "name_or_domain" | "phone_area_code" | null;
  locationConfidence: "high" | "medium" | "low" | null;
  rating: number | null;
  reviewCount: number | null;
}

export type DetectStatus = "idle" | "loading" | "found" | "partial" | "failed";

const DOMAIN_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

export function looksLikeWebsite(value: string): boolean {
  return DOMAIN_RE.test(value.trim());
}

/**
 * Debounced lookup of a website's business profile. Call `detect(url)` on
 * every change of the website input; it fires once typing pauses (or
 * immediately with `{ immediate: true }` on paste/blur) and only for values
 * that already look like a domain, so a half-typed URL never hits the API.
 */
export function useSiteDetect(onResult?: (site: DetectedSite) => void, delayMs = 700) {
  const [status, setStatus] = useState<DetectStatus>("idle");
  const [result, setResult] = useState<DetectedSite | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQuery = useRef("");
  const abort = useRef<AbortController | null>(null);
  // Latest callback without re-creating `run` on every render.
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const run = useCallback(async (website: string) => {
    const key = website.trim().toLowerCase().replace(/\/+$/, "");
    if (key === lastQuery.current) return;
    lastQuery.current = key;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setStatus("loading");

    try {
      const res = await fetch("/api/audit/detect-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as DetectedSite;
      if (controller.signal.aborted) return;
      setResult(data);
      setStatus(data.city ? "found" : data.reachable ? "partial" : "failed");
      onResultRef.current?.(data);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setResult(null);
      setStatus("failed");
    }
  }, []);

  const detect = useCallback(
    (website: string, opts: { immediate?: boolean } = {}) => {
      if (timer.current) clearTimeout(timer.current);
      if (!looksLikeWebsite(website)) {
        abort.current?.abort();
        lastQuery.current = "";
        setStatus("idle");
        setResult(null);
        return;
      }
      if (opts.immediate) void run(website);
      else timer.current = setTimeout(() => void run(website), delayMs);
    },
    [delayMs, run]
  );

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
    lastQuery.current = "";
    setStatus("idle");
    setResult(null);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    abort.current?.abort();
  }, []);

  return { status, result, detect, reset };
}

/** One-line human summary for the hint under the website field. */
export function describeDetection(status: DetectStatus, r: DetectedSite | null): string {
  if (status === "loading") return "Looking up your business…";
  if (status === "found" && r) {
    const where = [r.city, r.state].filter(Boolean).join(", ");
    const what = r.industry.key !== "local-business" ? ` · ${r.industry.label}` : "";
    if (r.locationConfidence === "low") return `Looks like ${r.name ?? "your business"} is in ${where} — please confirm the city.`;
    return `Found ${r.name ?? "your business"} · ${where}${what}`;
  }
  if (status === "partial") return "Couldn't detect the city from this site — please add it below.";
  if (status === "failed") return "We couldn't reach that website. Double-check the address, or fill in the city manually.";
  return "";
}
