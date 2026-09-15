import { describe, it, expect } from "vitest";
import { Fetcher, isPrivateAddress, checkHostAllowed } from "@/lib/audit/core/fetch";
import { makeFetch, testResolver, ALL_SITES } from "../fixtures/sites";

describe("SSRF protection", () => {
  it("classifies private, loopback, link-local and CGNAT ranges", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"]) expect(isPrivateAddress(ip), ip).toBe(true);
    for (const ip of ["93.184.216.34", "8.8.8.8", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });

  it("blocks literal private IPs, localhost names and hosts resolving to private addresses", async () => {
    expect(await checkHostAllowed("http://127.0.0.1/", testResolver)).toMatch(/private/);
    expect(await checkHostAllowed("http://localhost:3000/", testResolver)).toMatch(/blocked/);
    expect(await checkHostAllowed("http://metadata.google.internal/", testResolver)).toMatch(/blocked/);
    expect(await checkHostAllowed("https://internal.corp/", testResolver)).toMatch(/private address 10\.0\.0\.5/);
    expect(await checkHostAllowed("https://evil.test/", testResolver)).toMatch(/169\.254\.169\.254/); // any private answer blocks
    expect(await checkHostAllowed("https://v6local.test/", testResolver)).toMatch(/fe80/);
    expect(await checkHostAllowed("https://nxdomain.test/", testResolver)).toMatch(/dns/);
    expect(await checkHostAllowed("ftp://healthy.test/", testResolver)).toMatch(/protocol/);
    expect(await checkHostAllowed("https://healthy.test/", testResolver)).toBeNull();
  });

  it("re-validates every redirect hop", async () => {
    const site = { ...ALL_SITES, "https://healthy.test/bounce": { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } } };
    const { fetchImpl, log } = makeFetch(site);
    const f = new Fetcher(fetchImpl, testResolver);
    const res = await f.fetch("https://healthy.test/bounce");
    expect(res.ok).toBe(false);
    expect(res.errorCode).toBe("blocked_host");
    expect(res.redirectChain).toEqual(["https://healthy.test/bounce", "http://169.254.169.254/latest/meta-data"]);
    expect(log.some((l) => l.includes("169.254"))).toBe(false); // never actually requested
  });
});

describe("Fetcher", () => {
  it("follows redirects manually and records the chain", async () => {
    const f = new Fetcher(makeFetch().fetchImpl, testResolver);
    const res = await f.fetch("https://broken.test/chain-start");
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe("https://broken.test/chain-end");
    expect(res.redirectChain).toEqual(["https://broken.test/chain-start", "https://broken.test/chain-middle", "https://broken.test/chain-end"]);
  });

  it("stops on redirect loops / too many redirects", async () => {
    const site = { "https://loop.test/a": { status: 301, headers: { location: "/b" } }, "https://loop.test/b": { status: 301, headers: { location: "/a" } } };
    const f = new Fetcher(makeFetch(site).fetchImpl, testResolver);
    const res = await f.fetch("https://loop.test/a");
    expect(res.errorCode).toBe("too_many_redirects");
  });

  it("caps body size and flags truncation", async () => {
    const site = { "https://big.test/": { headers: { "content-type": "text/html" }, body: "<html>" + "x".repeat(50_000) + "</html>" } };
    const f = new Fetcher(makeFetch(site).fetchImpl, testResolver);
    const res = await f.fetch("https://big.test/", { maxBytes: 10_000 });
    expect(res.errorCode).toBe("too_large");
    expect(res.bytes).toBe(10_000);
    expect(res.body?.length).toBe(10_000);
  });

  it("refuses to read non-text bodies but still returns headers", async () => {
    const f = new Fetcher(makeFetch().fetchImpl, testResolver);
    const res = await f.fetch("https://healthy.test/img/van.jpg");
    expect(res.body).toBeNull();
    expect(res.errorCode).toBe("unsupported_type");
    expect(res.headers["content-length"]).toBe("120000");
  });

  it("times out hung responses", async () => {
    const site = { "https://slow.test/": { hang: true } };
    const f = new Fetcher(makeFetch(site).fetchImpl, testResolver);
    const res = await f.fetch("https://slow.test/", { timeoutMs: 100 });
    expect(res.errorCode).toBe("timeout");
  });

  it("caches identical requests", async () => {
    const { fetchImpl, log } = makeFetch();
    const f = new Fetcher(fetchImpl, testResolver);
    await f.fetch("https://healthy.test/");
    await f.fetch("https://healthy.test/");
    expect(log.filter((l) => l === "GET https://healthy.test/")).toHaveLength(1);
    expect(f.requestCount).toBe(1);
  });
});
