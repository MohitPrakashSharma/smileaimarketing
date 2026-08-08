import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { env } from "./env.server";
import { buildAuditNarrative } from "./auditNarrative";

export interface AuditPdfData {
  auditId: string;
  publicToken: string;
  businessName: string;
  city: string;
  category: string;
  website: string;
  opportunityScore: number;
  summaryText: string;
  findings: Array<{ category: string; score: number; title: string; detail: string; findingsJson: Record<string, unknown> }>;
  competitors: Array<{ name: string; rank: number; mapScore?: number }>;
}

// pdf-lib's built-in WinAnsi-encoded standard fonts can't render "★" (or other
// non-Latin1 glyphs) and throw at draw time — sanitize before it ever reaches drawText.
function sanitizeForPdf(text: string): string {
  return text.replace(/★/g, "*");
}

function wrapText(text: string, maxChars: number): string[] {
  if (!text) return [];
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length <= maxChars) {
      currentLine = (currentLine + " " + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/** Like wrapText, but caps at maxLines and marks truncation with "…" instead of silently cutting a sentence mid-word. */
function wrapTextTruncated(text: string, maxChars: number, maxLines: number): string[] {
  const lines = wrapText(text, maxChars);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = last.length > maxChars - 1 ? `${last.slice(0, maxChars - 1)}…` : `${last}…`;
  return kept;
}

export async function generateLightAuditPdf(data: AuditPdfData): Promise<string> {
  // Update PDF status to GENERATING
  await prisma.audit.update({
    where: { id: data.auditId },
    data: { pdfStatus: "GENERATING" },
  });

  try {
    const pdfDoc = await PDFDocument.create();
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    // Color definitions per specification
    const cDeepNavy = rgb(0.043, 0.141, 0.188);      // #0B2430
    const cDentalTeal = rgb(0.094, 0.718, 0.647);    // #18B7A5
    const cDarkTeal = rgb(0.055, 0.561, 0.510);      // #0E8F82
    const cSoftMint = rgb(0.910, 0.969, 0.957);      // #E8F7F4
    const cOffWhite = rgb(0.973, 0.980, 0.976);      // #F8FAF9
    const cCharcoal = rgb(0.078, 0.145, 0.176);      // #14252D
    const cMutedText = rgb(0.380, 0.447, 0.478);     // #61727A
    const cBorder = rgb(0.863, 0.910, 0.898);        // #DCE8E5
    const cWarningAmber = rgb(0.949, 0.722, 0.294);  // #F2B84B
    const cWhite = rgb(1, 1, 1);

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const reportUrl = `${env.APP_BASE_URL}/audit/${data.publicToken}`;

    // Same real, deterministic narrative the web report uses — one source of
    // truth for both, built only from real findingsJson, never fabricated.
    const rawNarrative = buildAuditNarrative({
      businessName: data.businessName,
      city: data.city,
      category: data.category,
      findings: data.findings.map((f) => ({ category: f.category, score: f.score, findingsJson: f.findingsJson })),
      competitors: data.competitors.map((c) => ({ name: c.name, rank: c.rank, mapScore: c.mapScore ?? null })),
    });
    const narrative = {
      headline: { line1: sanitizeForPdf(rawNarrative.headline.line1), line2: sanitizeForPdf(rawNarrative.headline.line2) },
      dek: sanitizeForPdf(rawNarrative.dek),
      stats: rawNarrative.stats.map((s) => ({ value: sanitizeForPdf(s.value), label: sanitizeForPdf(s.label), caption: sanitizeForPdf(s.caption) })),
      fixCards: rawNarrative.fixCards.map((f) => ({ title: sanitizeForPdf(f.title), detail: sanitizeForPdf(f.detail), impact: sanitizeForPdf(f.impact) })),
      quietLeaks: rawNarrative.quietLeaks.map((q) => ({ title: sanitizeForPdf(q.title), detail: sanitizeForPdf(q.detail) })),
    };

    const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4

    function drawTopBar(page: ReturnType<typeof pdfDoc.addPage>, rightLabel: string) {
      const { width, height } = page.getSize();
      page.drawRectangle({ x: 0, y: height - 32, width, height: 32, color: cDeepNavy });
      page.drawText(`SMILE AI MARKETING  |  ${data.businessName.toUpperCase()}`, {
        x: 36,
        y: height - 21,
        size: 8.5,
        font: fontBold,
        color: cWhite,
      });
      page.drawText(rightLabel, {
        x: width - 10 - fontBold.widthOfTextAtSize(rightLabel, 8.5),
        y: height - 21,
        size: 8.5,
        font: fontBold,
        color: cDentalTeal,
      });
    }

    function drawFooter(page: ReturnType<typeof pdfDoc.addPage>, pageNum: number, totalPages: number) {
      const { width } = page.getSize();
      page.drawRectangle({ x: 36, y: 35, width: width - 72, height: 0.5, color: cBorder });
      page.drawText("STRICTLY CONFIDENTIAL  ·  PREPARED BY SMILE AI MARKETING", {
        x: 36,
        y: 20,
        size: 7.5,
        font: fontBold,
        color: cMutedText,
      });
      const label = `PAGE ${pageNum} OF ${totalPages}`;
      page.drawText(label, {
        x: width - 36 - fontBold.widthOfTextAtSize(label, 7.5),
        y: 20,
        size: 7.5,
        font: fontBold,
        color: cDarkTeal,
      });
    }

    /** Draws a two-line headline: navy first line, teal-highlighted second line sized to fit its text. */
    function drawHeadline(page: ReturnType<typeof pdfDoc.addPage>, x: number, yTop: number, line1: string, line2: string): number {
      let y = yTop;
      page.drawText(line1, { x, y, size: 22, font: fontBold, color: cDeepNavy });
      y -= 32;
      const size2 = 20;
      const textWidth = fontBold.widthOfTextAtSize(line2, size2);
      page.drawRectangle({ x: x - 2, y: y - 6, width: textWidth + 16, height: 30, color: cDentalTeal });
      page.drawText(line2, { x: x + 6, y, size: size2, font: fontBold, color: cWhite });
      return y - 30;
    }

    const totalPages = 2;

    // ==========================================
    // PAGE 1 — THE HEADLINE + THE NUMBERS
    // ==========================================
    const page1 = pdfDoc.addPage(PAGE_SIZE);
    const { height: pageHeight, width: pageWidth } = page1.getSize();
    drawTopBar(page1, reportDate.toUpperCase());

    let yPos = pageHeight - 65;
    page1.drawText("YOUR PRACTICE GROWTH AUDIT, EXPLAINED SIMPLY", {
      x: 36,
      y: yPos,
      size: 8.5,
      font: fontBold,
      color: cDarkTeal,
    });

    yPos -= 32;
    yPos = drawHeadline(page1, 36, yPos, narrative.headline.line1, narrative.headline.line2);

    yPos -= 22;
    const dekLines = wrapTextTruncated(narrative.dek, 92, 3);
    for (const dLine of dekLines) {
      page1.drawText(dLine, { x: 36, y: yPos, size: 9.5, font: fontItalic, color: cMutedText });
      yPos -= 14;
    }

    yPos -= 10;

    // Score Dashboard Panel — dominant Opportunity Score (left) + real, verified stat grid (right)
    const scoreBoxY = yPos - 95;
    page1.drawRectangle({
      x: 36,
      y: scoreBoxY,
      width: pageWidth - 72,
      height: 95,
      color: cSoftMint,
      borderColor: cBorder,
      borderWidth: 1,
    });

    page1.drawRectangle({ x: 48, y: scoreBoxY + 12, width: 140, height: 71, color: cDeepNavy });
    page1.drawText("OPPORTUNITY SCORE", { x: 60, y: scoreBoxY + 62, size: 7.5, font: fontBold, color: cDentalTeal });
    page1.drawText(`${data.opportunityScore}`, { x: 60, y: scoreBoxY + 26, size: 32, font: fontBold, color: cWhite });
    page1.drawText("/ 100", { x: 125, y: scoreBoxY + 30, size: 14, font: fontBold, color: cMutedText });

    const gridX = 205;
    const gridY = scoreBoxY + 48;
    narrative.stats.slice(0, 4).forEach((s, idx) => {
      const mx = gridX + (idx % 2) * 160;
      const my = gridY - Math.floor(idx / 2) * 32;
      page1.drawText(s.label.toUpperCase(), { x: mx, y: my, size: 7, font: fontBold, color: cMutedText });
      page1.drawText(s.value, { x: mx, y: my - 13, size: 11, font: fontBold, color: cCharcoal });
    });

    yPos = scoreBoxY - 25;

    // Compact Dark Comparison Panel
    page1.drawRectangle({ x: 36, y: yPos - 95, width: pageWidth - 72, height: 95, color: cDeepNavy });
    page1.drawText("HOW YOU COMPARE TO A NEARBY PRACTICE", { x: 48, y: yPos - 20, size: 8.5, font: fontBold, color: cDentalTeal });

    const compLeader = data.competitors[0]?.name || "No verified competitor data this run";
    const compRank = data.competitors[0]?.rank ? `#${data.competitors[0].rank}` : "—";
    const compRating = data.competitors[0]?.mapScore ? `${data.competitors[0].mapScore} / 5.0` : "—";

    page1.drawText("PRACTICE NAME", { x: 48, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });
    page1.drawText("STATUS / POSITION", { x: 280, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });
    page1.drawText("RATING / REVIEWS", { x: 420, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });

    page1.drawText(`${data.businessName} (YOU)`, { x: 48, y: yPos - 58, size: 9.5, font: fontBold, color: cWhite });
    page1.drawText("Your practice", { x: 280, y: yPos - 58, size: 9, font: fontRegular, color: cDentalTeal });
    page1.drawText("Verified Signals", { x: 420, y: yPos - 58, size: 9, font: fontRegular, color: cWhite });

    page1.drawText(compLeader, { x: 48, y: yPos - 76, size: 9.5, font: fontBold, color: cOffWhite });
    page1.drawText(compRank, { x: 280, y: yPos - 76, size: 9, font: fontRegular, color: cWarningAmber });
    page1.drawText(compRating, { x: 420, y: yPos - 76, size: 9, font: fontRegular, color: cOffWhite });

    yPos -= 115;
    page1.drawText("Where this comes from: Google Places, DataForSEO, and a direct check of your live website.", {
      x: 36,
      y: yPos,
      size: 7.5,
      font: fontItalic,
      color: cMutedText,
    });

    drawFooter(page1, 1, totalPages);

    // ==========================================
    // PAGE 2 — FIXES, IN ORDER OF IMPACT
    // ==========================================
    const page2 = pdfDoc.addPage(PAGE_SIZE);
    drawTopBar(page2, "YOUR NEXT STEPS");

    let y2 = pageHeight - 65;
    page2.drawText("Your fixes, in order of impact", { x: 36, y: y2, size: 20, font: fontBold, color: cDeepNavy });
    y2 -= 15;

    const fixCards = narrative.fixCards.slice(0, 3);
    for (let i = 0; i < fixCards.length; i++) {
      const r = fixCards[i];
      y2 -= 80;

      page2.drawRectangle({ x: 36, y: y2, width: pageWidth - 72, height: 72, color: cSoftMint, borderColor: cBorder, borderWidth: 1 });
      page2.drawRectangle({ x: 36, y: y2, width: 4, height: 72, color: cDentalTeal });

      page2.drawText(String(i + 1).padStart(2, "0"), { x: 48, y: y2 + 42, size: 20, font: fontBold, color: cDarkTeal });
      page2.drawText(r.title, { x: 82, y: y2 + 50, size: 11, font: fontBold, color: cDeepNavy });

      const recLines = wrapTextTruncated(r.detail, 75, 2);
      let ry = y2 + 35;
      for (const rl of recLines) {
        page2.drawText(rl, { x: 82, y: ry, size: 8.5, font: fontRegular, color: cCharcoal });
        ry -= 12;
      }

      page2.drawText(r.impact, { x: 82, y: y2 + 10, size: 7.5, font: fontBold, color: cDarkTeal });
    }

    if (fixCards.length === 0) {
      y2 -= 40;
      page2.drawText("Nothing here scored low enough to call a real weak point — every category is holding up well.", {
        x: 36,
        y: y2,
        size: 9.5,
        font: fontRegular,
        color: cMutedText,
      });
    }

    y2 -= 30;

    // Quiet leaks — secondary real findings, kept short
    if (narrative.quietLeaks.length > 0) {
      page2.drawText("A COUPLE MORE THINGS WE NOTICED", { x: 36, y: y2, size: 10, font: fontBold, color: cDeepNavy });
      y2 -= 16;
      for (const leak of narrative.quietLeaks.slice(0, 2)) {
        page2.drawText(`•  ${leak.title}`, { x: 36, y: y2, size: 8.5, font: fontBold, color: cCharcoal });
        y2 -= 12;
        const leakLines = wrapTextTruncated(leak.detail, 95, 2);
        for (const ll of leakLines) {
          page2.drawText(ll, { x: 48, y: y2, size: 8, font: fontRegular, color: cMutedText });
          y2 -= 11;
        }
        y2 -= 6;
      }
    }

    y2 -= 20;

    // Prominent Consultation CTA Panel
    const ctaHeight = 110;
    page2.drawRectangle({ x: 36, y: y2 - ctaHeight, width: pageWidth - 72, height: ctaHeight, color: cDeepNavy });
    page2.drawText("Let's walk through it together", { x: 52, y: y2 - 25, size: 14, font: fontBold, color: cWhite });
    page2.drawText("No pressure, no sales pitch — just a straight conversation about what's fixable and what it's worth.", {
      x: 52,
      y: y2 - 42,
      size: 9,
      font: fontRegular,
      color: cSoftMint,
    });
    page2.drawText("• 15 minutes on video: we'll screen-share and show you exactly what patients see", {
      x: 52,
      y: y2 - 60,
      size: 8.5,
      font: fontRegular,
      color: cWhite,
    });
    page2.drawText("• Or in person: we'll come to the practice and walk your team through it", {
      x: 52,
      y: y2 - 74,
      size: 8.5,
      font: fontRegular,
      color: cWhite,
    });
    page2.drawText(`See your full report online: ${reportUrl}`, {
      x: 52,
      y: y2 - 96,
      size: 8.5,
      font: fontBold,
      color: cDentalTeal,
    });

    drawFooter(page2, 2, totalPages);

    // Save PDF to public reports storage directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const fileName = `audit-${data.publicToken}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    const pdfBytes = await pdfDoc.save();

    await fs.writeFile(filePath, pdfBytes);

    const relativeUrl = `/reports/${fileName}`;

    await prisma.audit.update({
      where: { id: data.auditId },
      data: {
        pdfStatus: "READY",
        pdfUrl: relativeUrl,
        pdfGeneratedAt: new Date(),
      },
    });

    return relativeUrl;
  } catch (error) {
    console.error("PDF generation failed:", error);
    await prisma.audit.update({
      where: { id: data.auditId },
      data: { pdfStatus: "FAILED" },
    });
    throw error;
  }
}
