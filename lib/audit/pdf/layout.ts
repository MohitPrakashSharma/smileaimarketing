import { PDFDocument, PDFName, PDFString, StandardFonts, clip, closePath, endPath, lineTo, moveTo, popGraphicsState, pushGraphicsState, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

/**
 * Shared PDF plumbing for the audit reports (customer and technical):
 * the brand palette, WinAnsi-safe text, and a small flow layout on top of
 * pdf-lib — text wraps and pages break automatically, blocks can be measured
 * and kept together, every page gets the branded header/footer with page
 * numbers, and every drawn string lands in a plain-text transcript so tests
 * can check content parity with the web report.
 */

// ---------- brand palette (mirrors the tokens in app/globals.css) ----------
const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const C = {
  ink: hex("#1e3560"),
  secondary: hex("#485d66"),
  muted: hex("#4f636b"),
  faint: hex("#7e9299"),
  accent: hex("#3b67b2"),
  accentInk: hex("#2f5391"),
  accentSoft: hex("#e8eff9"),
  secondaryAccent: hex("#26707e"),   // teal ink — measurement captions
  growth: hex("#1f6b52"),            // growth green — positive figures
  dark: hex("#1e3560"),
  border: hex("#dce4e6"),
  surface: hex("#f7fafb"),
  track: hex("#e9eff1"),
  white: rgb(1, 1, 1),
  // Severity keeps its own hues: a critical finding must never read as brand blue.
  healthy: hex("#1f6b52"),
  healthyBg: hex("#e4f4ee"),
  opportunity: hex("#8d5309"),
  opportunityBg: hex("#fbf2e4"),
  attention: hex("#b3382a"),
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
  /** Serif faces: the editorial deck and the figure labels are set in them, as the reference layout does. */
  serif: PDFFont;
  serifItalic: PDFFont;
  serifBold: PDFFont;
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
  /** Masthead labels per page: left (issue/section) and right (area). Set with `label()`. */
  labels: Array<{ left: string; right: string }> = [];
  /** The label a page break inherits, so a section that runs long keeps its masthead. */
  private currentLabel: { left: string; right: string } | null = null;
  page!: PDFPage;
  y = 0;
  dryRun = false;
  transcript: string[] = [];
  constructor(
    readonly doc: PDFDocument,
    readonly f: Fonts,
    readonly meta: { business: string; date: string; url: string; kind: string },
    /** Page margin; the editorial customer report runs tighter than the technical one. */
    readonly margin: number = MARGIN
  ) {
    this.newPage();
  }
  get width() {
    return PAGE[0];
  }
  get left() {
    return this.margin;
  }
  get right() {
    return PAGE[0] - this.margin;
  }
  get usable() {
    return PAGE[0] - this.margin * 2;
  }
  get bottom() {
    return this.margin + FOOTER_H;
  }
  get top() {
    return PAGE[1] - this.margin - HEADER_H;
  }
  get remaining() {
    return this.y - this.bottom;
  }

  newPage() {
    if (this.dryRun) return; // measuring: keep flowing downwards so the total height is known
    this.page = this.doc.addPage(PAGE);
    this.pages.push(this.page);
    this.labels.push(this.currentLabel ?? { left: `${this.meta.kind} · ${this.meta.business.toUpperCase()}`, right: "" });
    this.y = this.top;
  }

  /** Masthead text for the page being written (left = what this page is, right = its area). */
  label(left: string, right = "") {
    if (this.dryRun) return;
    this.currentLabel = { left, right };
    if (this.labels.length) this.labels[this.labels.length - 1] = { left, right };
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

  /**
   * Masthead bar and footer rule on every page, drawn last so page counts and
   * per-page labels are known. Editorial format: a solid bar carrying what the
   * page is on the left and its subject on the right, and a footer naming who
   * the report was prepared for.
   */
  finish() {
    const total = this.pages.length;
    this.pages.forEach((page, i) => {
      const { width, height } = page.getSize();
      const lab = this.labels[i] ?? { left: `${this.meta.kind} · ${this.meta.business.toUpperCase()}`, right: "" };
      page.drawRectangle({ x: 0, y: height - 28, width, height: 28, color: C.dark });
      page.drawText(pdfSafe(lab.left.toUpperCase()), { x: this.margin, y: height - 18, size: 7.5, font: this.f.bold, color: C.white });
      if (lab.right) {
        const r = pdfSafe(lab.right.toUpperCase());
        page.drawText(r, { x: width - this.margin - this.f.bold.widthOfTextAtSize(r, 7.5), y: height - 18, size: 7.5, font: this.f.bold, color: hex("#a9c8f2") });
      }
      page.drawLine({ start: { x: this.margin, y: this.margin + 18 }, end: { x: width - this.margin, y: this.margin + 18 }, thickness: 0.8, color: C.dark });
      const foot = pdfSafe(`PREPARED FOR ${this.meta.business.toUpperCase()}`);
      page.drawText(foot, { x: this.margin, y: this.margin + 6, size: 7, font: this.f.bold, color: C.ink });
      const mid = pdfSafe(this.meta.date.toUpperCase());
      page.drawText(mid, { x: width / 2 - this.f.regular.widthOfTextAtSize(mid, 7) / 2, y: this.margin + 6, size: 7, font: this.f.regular, color: C.muted });
      const pn = `PAGE ${i + 1} OF ${total}`;
      page.drawText(pn, { x: width - this.margin - this.f.bold.widthOfTextAtSize(pn, 7), y: this.margin + 6, size: 7, font: this.f.bold, color: C.ink });
    });
  }

  /**
   * Draws an image from a base64 data URI at (x, y-top) scaled to `w`, cropped
   * to `maxH` from the top when it is taller (a page screenshot is long; the
   * report shows the part a visitor sees first). Returns the height drawn, or
   * 0 when the image could not be embedded — a bad image never breaks a report.
   */
  async image(dataUri: string, x: number, yTop: number, w: number, maxH: number, o: { caption?: string } = {}): Promise<number> {
    if (this.dryRun) return 0;
    const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(dataUri.trim());
    if (!m) return 0;
    try {
      const bytes = Uint8Array.from(Buffer.from(m[2], "base64"));
      const img = m[1] === "image/png" ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes);
      const fullH = (img.height * w) / img.width;
      const h = Math.min(fullH, maxH);
      // Real clipping: a page screenshot is long, and the report shows the part a
      // visitor sees first rather than squashing the whole page into a thumbnail.
      this.page.pushOperators(pushGraphicsState(), moveTo(x, yTop - h), lineTo(x + w, yTop - h), lineTo(x + w, yTop), lineTo(x, yTop), closePath(), clip(), endPath());
      this.page.drawImage(img, { x, y: yTop - fullH, width: w, height: fullH });
      this.page.pushOperators(popGraphicsState());
      this.page.drawRectangle({ x, y: yTop - h, width: w, height: h, borderColor: C.border, borderWidth: 0.8 });
      if (o.caption) this.page.drawText(pdfSafe(o.caption.toUpperCase()), { x, y: yTop + 5, size: 6.5, font: this.f.bold, color: C.muted });
      this.transcript.push(`[screenshot] ${o.caption ?? ""}`.trim());
      return h;
    } catch {
      return 0;
    }
  }

  /** A highlight block behind a run of display text, painted before the glyphs. */
  highlight(x: number, yTop: number, w: number, h: number, color = C.accentSoft) {
    if (this.dryRun) return;
    this.page.drawRectangle({ x: x - 3, y: yTop - h, width: w + 6, height: h, color });
  }

  /**
   * Display headline in the editorial style: very large and tight, with an
   * optional phrase set on a highlight block. The phrase is matched word by
   * word across the wrapped lines, so a highlight that spans a line break is
   * painted on both lines.
   */
  display(text: string, highlightPhrase: string, o: { size?: number; lineHeight?: number; color?: RGB } = {}) {
    const size = o.size ?? 30;
    const lh = o.lineHeight ?? size * 1.06;
    const color = o.color ?? C.dark;
    const lines = this.wrap(text, this.f.bold, size, this.usable);
    const phrase = highlightPhrase.trim();
    const phraseWords = phrase ? phrase.toLowerCase().split(/\s+/) : [];
    let taken = 0; // how many phrase words have been matched so far
    for (const line of lines) {
      this.ensure(lh + 6);
      if (!this.dryRun) {
        const y = this.y - size;
        if (phraseWords.length && taken < phraseWords.length) {
          const words = line.split(" ");
          const startIdx = words.findIndex((w, k) => {
            const clean = w.toLowerCase().replace(/[^a-z0-9'’.%/-]/g, "");
            return clean === phraseWords[taken] && words.slice(k).length >= 1;
          });
          if (startIdx >= 0) {
            let end = startIdx;
            let t = taken;
            while (end < words.length && t < phraseWords.length && words[end].toLowerCase().replace(/[^a-z0-9'’.%/-]/g, "") === phraseWords[t]) {
              end++;
              t++;
            }
            const before = words.slice(0, startIdx).join(" ");
            const run = words.slice(startIdx, end).join(" ");
            const x0 = this.left + (before ? this.f.bold.widthOfTextAtSize(`${before} `, size) : 0);
            // Sized to the line box: from just under the baseline to the cap height, so a
            // highlighted line never paints over the line above it.
            this.highlight(x0, this.y - size * 0.22, this.f.bold.widthOfTextAtSize(run, size), size * 1.02);
            taken = t;
          }
        }
        this.page.drawText(line, { x: this.left, y, size, font: this.f.bold, color });
      }
      this.y -= lh;
    }
    if (!this.dryRun && text.trim()) this.transcript.push(pdfSafe(text));
  }

}


export async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    mono: await doc.embedFont(StandardFonts.Courier),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
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
