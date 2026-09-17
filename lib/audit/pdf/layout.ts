import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

/**
 * Shared PDF plumbing for the audit reports (customer and technical):
 * the brand palette, WinAnsi-safe text, and a small flow layout on top of
 * pdf-lib — text wraps and pages break automatically, blocks can be measured
 * and kept together, every page gets the branded header/footer with page
 * numbers, and every drawn string lands in a plain-text transcript so tests
 * can check content parity with the web report.
 */

// ---------- brand palette (app/globals.css) ----------
const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const C = {
  ink: hex("#2d2c2b"),
  secondary: hex("#4a4948"),
  muted: hex("#6b6a70"),
  faint: hex("#8e8c94"),
  accent: hex("#d81b6a"),
  accentSoft: hex("#fde9f1"),
  dark: hex("#1e1b47"),
  border: hex("#e6e4e1"),
  surface: hex("#f7f6f4"),
  track: hex("#f3f1ee"),
  white: rgb(1, 1, 1),
  healthy: hex("#1f7a45"),
  healthyBg: hex("#eaf6ee"),
  opportunity: hex("#a85f06"),
  opportunityBg: hex("#fbf2e4"),
  attention: hex("#c23b2e"),
  attentionBg: hex("#fcefec"),
};
export type Level = "healthy" | "opportunity" | "attention";
export const LEVEL_COLOR: Record<Level, RGB> = { healthy: C.healthy, opportunity: C.opportunity, attention: C.attention };
export const LEVEL_BG: Record<Level, RGB> = { healthy: C.healthyBg, opportunity: C.opportunityBg, attention: C.attentionBg };
export const LEVEL_LABEL: Record<Level, string> = { healthy: "Good", opportunity: "Needs work", attention: "Poor" };

/** Google's PageSpeed bands. */
export const googleLevel = (s: number): Level => (s >= 90 ? "healthy" : s >= 50 ? "opportunity" : "attention");
/** Our status bands (components/ui/StatusBadge#statusFromScore). */
export const auditLevel = (s: number): Level => (s >= 70 ? "healthy" : s >= 50 ? "opportunity" : "attention");
export const AUDIT_LEVEL_LABEL: Record<Level, string> = { healthy: "Healthy", opportunity: "Opportunity", attention: "Needs attention" };
export const SEVERITY_COLOR: Record<string, RGB> = { CRITICAL: C.attention, HIGH: C.attention, MEDIUM: C.opportunity, LOW: C.muted, OPPORTUNITY: C.accent };

// ---------- text safety ----------
// pdf-lib's standard fonts are WinAnsi: anything outside Latin-1 plus a few
// typographic extras throws at draw time. Map the symbols the report uses and
// drop the rest rather than crash.
const REPLACEMENTS: Record<string, string> = { "≤": "<=", "≥": ">=", "→": "->", "←": "<-", "↓": "", "↑": "", "✓": "OK", "✔": "OK", "★": "*", "☆": "*", "✗": "x", "✕": "x", "⏎": " ", " ": " " };
const WINANSI_EXTRA = new Set(["€", "‚", "ƒ", "„", "…", "†", "‡", "ˆ", "‰", "Š", "‹", "Œ", "Ž", "‘", "’", "“", "”", "•", "–", "—", "˜", "™", "š", "›", "œ", "ž", "Ÿ"]);
export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch in REPLACEMENTS) out += REPLACEMENTS[ch];
    else if (ch.charCodeAt(0) < 256 || WINANSI_EXTRA.has(ch)) out += ch;
    // else: dropped (emoji, CJK, …)
  }
  return out.replace(/[\t\r]/g, " ");
}

export const PAGE: [number, number] = [595.28, 841.89]; // A4
export const MARGIN = 42;
const HEADER_H = 34;
const FOOTER_H = 34;

export interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  mono: PDFFont;
}

export interface TextOpts {
  font?: PDFFont;
  size?: number;
  color?: RGB;
  x?: number;
  maxWidth?: number;
  lineHeight?: number;
  align?: "left" | "right";
}

/** Flow layout: a cursor that moves down the page and breaks to a new page when needed. */
export class Flow {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  dryRun = false;
  transcript: string[] = [];
  constructor(
    readonly doc: PDFDocument,
    readonly f: Fonts,
    readonly meta: { business: string; date: string; url: string; kind: string }
  ) {
    this.newPage();
  }
  get width() {
    return PAGE[0];
  }
  get left() {
    return MARGIN;
  }
  get right() {
    return PAGE[0] - MARGIN;
  }
  get usable() {
    return PAGE[0] - MARGIN * 2;
  }
  get bottom() {
    return MARGIN + FOOTER_H;
  }
  get top() {
    return PAGE[1] - MARGIN - HEADER_H;
  }
  get remaining() {
    return this.y - this.bottom;
  }

  newPage() {
    if (this.dryRun) return; // measuring: keep flowing downwards so the total height is known
    this.page = this.doc.addPage(PAGE);
    this.pages.push(this.page);
    this.y = this.top;
  }

  ensure(h: number) {
    if (!this.dryRun && this.y - h < this.bottom) this.newPage();
  }

  /** Measure what `fn` would draw (no output, no page allocation). */
  measure(fn: () => void): number {
    const saved = { page: this.page, y: this.y, dry: this.dryRun, t: this.transcript.length };
    this.dryRun = true;
    this.y = this.top;
    let height = 0;
    try {
      fn();
      height = this.top - this.y;
    } finally {
      this.dryRun = saved.dry;
      this.page = saved.page;
      this.y = saved.y;
      this.transcript.length = saved.t;
    }
    return height;
  }

  /**
   * Draw `fn` without a page break when it fits in the remaining space, or on a
   * fresh page when it is at most ~60% of a page tall. Taller blocks flow across
   * pages (never started in the last 120pt of a page, so a heading is not orphaned).
   */
  keepTogether(fn: () => void) {
    const h = this.measure(fn);
    const pageHeight = this.top - this.bottom;
    if (h <= this.remaining) {
      // fits
    } else if (h <= pageHeight * 0.6) this.newPage();
    else if (this.remaining < 120) this.newPage();
    fn();
  }

  gap(h: number) {
    this.y -= h;
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) {
        lines.push("");
        continue;
      }
      let line = "";
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
        else {
          if (line) lines.push(line);
          // a single word wider than the column is hard-broken
          let chunk = w;
          while (font.widthOfTextAtSize(chunk, size) > maxWidth && chunk.length > 1) {
            let cut = chunk.length - 1;
            while (cut > 1 && font.widthOfTextAtSize(chunk.slice(0, cut), size) > maxWidth) cut--;
            lines.push(chunk.slice(0, cut));
            chunk = chunk.slice(cut);
          }
          line = chunk;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  text(str: string, o: TextOpts = {}): number {
    const font = o.font ?? this.f.regular;
    const size = o.size ?? 9.5;
    const color = o.color ?? C.ink;
    const x = o.x ?? this.left;
    const maxWidth = o.maxWidth ?? this.right - x;
    const lh = o.lineHeight ?? size * 1.38;
    const lines = this.wrap(str, font, size, maxWidth);
    const startY = this.y;
    for (const line of lines) {
      this.ensure(lh);
      if (!this.dryRun && line) {
        const w = font.widthOfTextAtSize(line, size);
        const lx = o.align === "right" ? x + maxWidth - w : x;
        this.page.drawText(line, { x: lx, y: this.y - size, size, font, color });
      }
      this.y -= lh;
    }
    if (!this.dryRun && str.trim()) this.transcript.push(pdfSafe(str));
    return startY - this.y;
  }

  /**
   * A clickable line: the text is drawn as usual and a URI link annotation is
   * placed over every wrapped line, so a tap in any PDF reader opens `url` in
   * the browser (the reader decides whether that is a new tab). The URL is
   * also recorded in the transcript so tests can assert where a CTA points.
   */
  link(str: string, url: string, o: TextOpts = {}): number {
    const font = o.font ?? this.f.bold;
    const size = o.size ?? 9.5;
    const color = o.color ?? C.accent;
    const x = o.x ?? this.left;
    const maxWidth = o.maxWidth ?? this.right - x;
    const lh = o.lineHeight ?? size * 1.38;
    const lines = this.wrap(str, font, size, maxWidth);
    const startY = this.y;
    for (const line of lines) {
      this.ensure(lh);
      if (!this.dryRun && line) {
        const w = font.widthOfTextAtSize(line, size);
        const lx = o.align === "right" ? x + maxWidth - w : x;
        this.page.drawText(line, { x: lx, y: this.y - size, size, font, color });
        this.page.drawLine({ start: { x: lx, y: this.y - size - 1.5 }, end: { x: lx + w, y: this.y - size - 1.5 }, thickness: 0.6, color });
        this.addLinkAnnotation(this.page, lx, this.y - lh, w, lh, url);
      }
      this.y -= lh;
    }
    if (!this.dryRun && str.trim()) this.transcript.push(`${pdfSafe(str)} -> ${url}`);
    return startY - this.y;
  }

  /** Makes the rectangle a clickable URI link (PDF /Link annotation with a /URI action). */
  addLinkAnnotation(page: PDFPage, x: number, y: number, w: number, h: number, url: string) {
    const ctx = this.doc.context;
    const annot = ctx.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x, y, x + w, y + h],
      Border: [0, 0, 0],
      A: { Type: "Action", S: "URI", URI: PDFString.of(url) },
    });
    const ref = ctx.register(annot);
    const existing = page.node.lookup(PDFName.of("Annots"));
    if (existing && "push" in existing && typeof (existing as { push: unknown }).push === "function") (existing as unknown as { push: (r: unknown) => void }).push(ref);
    else page.node.set(PDFName.of("Annots"), ctx.obj([ref]));
  }

  /** Label/value pair on one line (value wraps under the label column). */
  kv(label: string, value: string, o: { labelWidth?: number; size?: number; valueColor?: RGB; x?: number } = {}) {
    const size = o.size ?? 9;
    const x = o.x ?? this.left;
    const lw = o.labelWidth ?? 64;
    const lines = this.wrap(value, this.f.regular, size, this.right - x - lw);
    const lh = size * 1.38;
    this.ensure(lh);
    if (!this.dryRun) {
      this.page.drawText(pdfSafe(label), { x, y: this.y - size, size: size - 1.5, font: this.f.bold, color: C.muted });
      this.transcript.push(`${label}: ${pdfSafe(value)}`);
    }
    for (const line of lines) {
      this.ensure(lh);
      if (!this.dryRun && line) this.page.drawText(line, { x: x + lw, y: this.y - size, size, font: this.f.regular, color: o.valueColor ?? C.ink });
      this.y -= lh;
    }
  }

  rule(color: RGB = C.border) {
    this.ensure(6);
    if (!this.dryRun) this.page.drawLine({ start: { x: this.left, y: this.y - 3 }, end: { x: this.right, y: this.y - 3 }, thickness: 0.6, color });
    this.y -= 6;
  }

  pill(label: string, level: Level | null, x: number, yTop: number, size = 7): number {
    const w = this.f.bold.widthOfTextAtSize(label.toUpperCase(), size) + 10;
    if (!this.dryRun) {
      this.page.drawRectangle({ x, y: yTop - 11, width: w, height: 11, color: level ? LEVEL_BG[level] : C.track, borderColor: level ? LEVEL_COLOR[level] : C.border, borderWidth: 0.5, opacity: 1 });
      this.page.drawText(pdfSafe(label.toUpperCase()), { x: x + 5, y: yTop - 8.4, size, font: this.f.bold, color: level ? LEVEL_COLOR[level] : C.muted });
    }
    return w;
  }

  /** Section heading with a rule; keeps the heading with at least ~80pt of following content. */
  section(title: string, subtitle?: string) {
    this.ensure(130);
    this.gap(4);
    this.text(title, { font: this.f.bold, size: 15, color: C.dark });
    if (subtitle) this.text(subtitle, { size: 9, color: C.muted });
    this.gap(2);
    this.rule(C.accent);
    this.gap(6);
  }

  /** Score ring: real arc length, Google or audit bands; null → empty ring with a dash. */
  ring(cx: number, cy: number, r: number, score: number | null, level: Level | null, o: { stroke?: number; numberSize?: number; caption?: string } = {}) {
    const stroke = o.stroke ?? Math.max(4, r * 0.16);
    if (this.dryRun) return;
    this.page.drawCircle({ x: cx, y: cy, size: r, borderColor: C.track, borderWidth: stroke });
    if (score !== null && level) {
      const frac = Math.max(0, Math.min(1, score / 100));
      if (frac >= 0.999) this.page.drawCircle({ x: cx, y: cy, size: r, borderColor: LEVEL_COLOR[level], borderWidth: stroke });
      else if (frac > 0) {
        // SVG path in pdf-lib's flipped space (y grows downwards from the given origin).
        const a = -Math.PI / 2 + frac * 2 * Math.PI;
        const ex = r * Math.cos(a);
        const ey = r * Math.sin(a);
        const path = `M 0 ${-r} A ${r} ${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
        this.page.drawSvgPath(path, { x: cx, y: cy, borderColor: LEVEL_COLOR[level], borderWidth: stroke });
      }
    }
    const label = score === null ? "-" : String(Math.round(score));
    const ns = o.numberSize ?? r * 0.9;
    const w = this.f.bold.widthOfTextAtSize(label, ns);
    this.page.drawText(label, { x: cx - w / 2, y: cy - ns * 0.36, size: ns, font: this.f.bold, color: score === null ? C.faint : C.ink });
    if (o.caption) {
      const cs = 6.5;
      const cw = this.f.bold.widthOfTextAtSize(o.caption.toUpperCase(), cs);
      this.page.drawText(pdfSafe(o.caption.toUpperCase()), { x: cx - cw / 2, y: cy - r - stroke - 9, size: cs, font: this.f.bold, color: C.muted });
    }
  }

  /** Header + footer on every page, drawn last so page counts are known. */
  finish() {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      page.drawRectangle({ x: 0, y: height - 26, width, height: 26, color: C.dark });
      page.drawText("SMILE AI MARKETING", { x: MARGIN, y: height - 17, size: 8, font: this.f.bold, color: C.white });
      const right = pdfSafe(`${this.meta.kind} · ${this.meta.business.toUpperCase()}`);
      page.drawText(right, { x: width - MARGIN - this.f.bold.widthOfTextAtSize(right, 8), y: height - 17, size: 8, font: this.f.bold, color: hex("#ff7a8c") });
      page.drawLine({ start: { x: MARGIN, y: MARGIN + 18 }, end: { x: width - MARGIN, y: MARGIN + 18 }, thickness: 0.5, color: C.border });
      const foot = pdfSafe(`Report date ${this.meta.date} · ${this.meta.url}`);
      page.drawText(foot, { x: MARGIN, y: MARGIN + 6, size: 7.5, font: this.f.regular, color: C.muted });
      const pn = `Page ${i + 1} of ${total}`;
      page.drawText(pn, { x: width - MARGIN - this.f.bold.widthOfTextAtSize(pn, 7.5), y: MARGIN + 6, size: 7.5, font: this.f.bold, color: C.accent });
    });
  }
}


export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
}

export const dateLabel = (d: Date) => d.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
export const shortPath = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? `${u.host}/` : `${u.host}${u.pathname}`;
  } catch {
    return url;
  }
};

export interface PdfOutput {
  bytes: Uint8Array;
  pageCount: number;
  /** Everything drawn, in order — for tests and content parity checks. */
  transcript: string;
}
