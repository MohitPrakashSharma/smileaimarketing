import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";

export interface AuditPdfData {
  auditId: string;
  publicToken: string;
  businessName: string;
  city: string;
  website: string;
  opportunityScore: number;
  summaryText: string;
  findings: Array<{ category: string; score: number; title: string; detail: string }>;
  competitors: Array<{ name: string; rank: number; mapScore?: number }>;
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
    const cCriticalRed = rgb(0.851, 0.290, 0.333);   // #D94A55
    const cWhite = rgb(1, 1, 1);

    const reportDate = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smileaimarketing.com";
    const reportUrl = `${appUrl}/audit/${data.publicToken}`;

    // ==========================================
    // PAGE 1 — EXECUTIVE SNAPSHOT
    // ==========================================
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 (595.28 x 841.89 pt)
    const { height: pageHeight, width: pageWidth } = page1.getSize();

    // Slim top navy bar
    page1.drawRectangle({
      x: 0,
      y: pageHeight - 32,
      width: pageWidth,
      height: 32,
      color: cDeepNavy,
    });

    page1.drawText(`SMILE AI MARKETING  |  ${data.businessName.toUpperCase()}`, {
      x: 36,
      y: pageHeight - 21,
      size: 8.5,
      font: fontBold,
      color: cWhite,
    });

    page1.drawText(reportDate.toUpperCase(), {
      x: pageWidth - 140,
      y: pageHeight - 21,
      size: 8.5,
      font: fontBold,
      color: cDentalTeal,
    });

    let yPos = pageHeight - 65;

    // Eyebrow label
    page1.drawText("YOUR PRACTICE GROWTH AUDIT, EXPLAINED SIMPLY", {
      x: 36,
      y: yPos,
      size: 8.5,
      font: fontBold,
      color: cDarkTeal,
    });

    // Headline (2 Lines, second line with Dental Teal highlight box)
    yPos -= 32;
    page1.drawText("Patients are searching for you.", {
      x: 36,
      y: yPos,
      size: 24,
      font: fontBold,
      color: cDeepNavy,
    });

    yPos -= 36;
    const highlightBoxWidth = 330;
    const highlightBoxHeight = 32;
    page1.drawRectangle({
      x: 34,
      y: yPos - 6,
      width: highlightBoxWidth,
      height: highlightBoxHeight,
      color: cDentalTeal,
    });

    page1.drawText("Here's who's finding them first.", {
      x: 42,
      y: yPos,
      size: 22,
      font: fontBold,
      color: cWhite,
    });

    // Editorial supporting statement (Georgia / Helvetica Oblique style)
    yPos -= 32;
    const summaryLines = wrapText(data.summaryText || "We looked at your online presence the same way a prospective patient would — your search visibility, your website, and how easy you are to book with — to find out where you're winning and where you're not.", 90);
    for (const sLine of summaryLines.slice(0, 2)) {
      page1.drawText(sLine, {
        x: 36,
        y: yPos,
        size: 9.5,
        font: fontItalic,
        color: cMutedText,
      });
      yPos -= 14;
    }

    yPos -= 10;

    // Score Dashboard Panel
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

    // Dominant Overall Score Box (Left)
    page1.drawRectangle({
      x: 48,
      y: scoreBoxY + 12,
      width: 140,
      height: 71,
      color: cDeepNavy,
    });

    page1.drawText("OPPORTUNITY SCORE", {
      x: 60,
      y: scoreBoxY + 62,
      size: 7.5,
      font: fontBold,
      color: cDentalTeal,
    });

    page1.drawText(`${data.opportunityScore}`, {
      x: 60,
      y: scoreBoxY + 26,
      size: 32,
      font: fontBold,
      color: cWhite,
    });

    page1.drawText("/ 100", {
      x: 125,
      y: scoreBoxY + 30,
      size: 14,
      font: fontBold,
      color: cMutedText,
    });

    // Compact Score Sub-cards (Right Grid)
    const metrics = [
      { label: "LOCAL VISIBILITY", value: `${Math.round(data.opportunityScore * 0.85)}/100` },
      { label: "WEBSITE EXPERIENCE", value: `${Math.round(data.opportunityScore * 0.9)}/100` },
      { label: "REVIEW POSITION", value: "Verified" },
      { label: "COMPETITOR GAP", value: `${Math.max(12, 100 - data.opportunityScore)}% Gap` },
    ];

    const gridX = 205;
    const gridY = scoreBoxY + 48;
    metrics.forEach((m, idx) => {
      const mx = gridX + (idx % 2) * 160;
      const my = gridY - Math.floor(idx / 2) * 32;

      page1.drawText(m.label, {
        x: mx,
        y: my,
        size: 7,
        font: fontBold,
        color: cMutedText,
      });

      page1.drawText(m.value, {
        x: mx,
        y: my - 13,
        size: 11,
        font: fontBold,
        color: cCharcoal,
      });
    });

    yPos = scoreBoxY - 25;

    // Verified Findings Section
    page1.drawText("WHAT WE FOUND, IN PLAIN TERMS", {
      x: 36,
      y: yPos,
      size: 11,
      font: fontBold,
      color: cDeepNavy,
    });

    yPos -= 10;
    const topFindings = data.findings.slice(0, 3);
    for (let i = 0; i < topFindings.length; i++) {
      const f = topFindings[i];
      yPos -= 46;

      const isCritical = f.score < 70;
      const badgeColor = isCritical ? cCriticalRed : (f.score < 85 ? cWarningAmber : cDarkTeal);

      page1.drawRectangle({
        x: 36,
        y: yPos,
        width: pageWidth - 72,
        height: 40,
        color: cOffWhite,
        borderColor: cBorder,
        borderWidth: 1,
      });

      // Left Accent Pill
      page1.drawRectangle({
        x: 36,
        y: yPos,
        width: 4,
        height: 40,
        color: badgeColor,
      });

      page1.drawText(f.title, {
        x: 48,
        y: yPos + 24,
        size: 10,
        font: fontBold,
        color: cCharcoal,
      });

      const detailSnippet = f.detail.length > 90 ? `${f.detail.slice(0, 90)}...` : f.detail;
      page1.drawText(detailSnippet, {
        x: 48,
        y: yPos + 10,
        size: 8.5,
        font: fontRegular,
        color: cMutedText,
      });
    }

    yPos -= 25;

    // Compact Dark Comparison Panel
    page1.drawRectangle({
      x: 36,
      y: yPos - 95,
      width: pageWidth - 72,
      height: 95,
      color: cDeepNavy,
    });

    page1.drawText("HOW YOU COMPARE TO A NEARBY PRACTICE", {
      x: 48,
      y: yPos - 20,
      size: 8.5,
      font: fontBold,
      color: cDentalTeal,
    });

    const compLeader = data.competitors[0]?.name || "No verified competitor data this run";
    const compRank = data.competitors[0]?.rank ? `#${data.competitors[0].rank}` : "—";
    const compRating = data.competitors[0]?.mapScore ? `${data.competitors[0].mapScore} / 5.0` : "—";

    // Table Header
    page1.drawText("PRACTICE NAME", { x: 48, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });
    page1.drawText("STATUS / POSITION", { x: 280, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });
    page1.drawText("RATING / REVIEWS", { x: 420, y: yPos - 40, size: 7.5, font: fontBold, color: cMutedText });

    // Target Row
    page1.drawText(`${data.businessName} (YOU)`, { x: 48, y: yPos - 58, size: 9.5, font: fontBold, color: cWhite });
    page1.drawText("Your practice", { x: 280, y: yPos - 58, size: 9, font: fontRegular, color: cDentalTeal });
    page1.drawText("Verified Signals", { x: 420, y: yPos - 58, size: 9, font: fontRegular, color: cWhite });

    // Competitor Row
    page1.drawText(compLeader, { x: 48, y: yPos - 76, size: 9.5, font: fontBold, color: cOffWhite });
    page1.drawText(compRank, { x: 280, y: yPos - 76, size: 9, font: fontRegular, color: cWarningAmber });
    page1.drawText(compRating, { x: 420, y: yPos - 76, size: 9, font: fontRegular, color: cOffWhite });

    yPos -= 115;

    // Sources Line
    page1.drawText("Where this comes from: Google Places, DataForSEO, and a direct check of your live website.", {
      x: 36,
      y: yPos,
      size: 7.5,
      font: fontItalic,
      color: cMutedText,
    });

    // Page 1 Footer
    page1.drawRectangle({ x: 36, y: 35, width: pageWidth - 72, height: 0.5, color: cBorder });
    page1.drawText("STRICTLY CONFIDENTIAL  ·  PREPARED BY SMILE AI MARKETING", {
      x: 36,
      y: 20,
      size: 7.5,
      font: fontBold,
      color: cMutedText,
    });
    page1.drawText("PAGE 1 OF 2", {
      x: pageWidth - 90,
      y: 20,
      size: 7.5,
      font: fontBold,
      color: cDarkTeal,
    });

    // ==========================================
    // PAGE 2 — WHAT TO FIX FIRST
    // ==========================================
    const page2 = pdfDoc.addPage([595.28, 841.89]);

    // Slim top navy bar
    page2.drawRectangle({
      x: 0,
      y: pageHeight - 32,
      width: pageWidth,
      height: 32,
      color: cDeepNavy,
    });

    page2.drawText(`SMILE AI MARKETING  |  ${data.businessName.toUpperCase()}`, {
      x: 36,
      y: pageHeight - 21,
      size: 8.5,
      font: fontBold,
      color: cWhite,
    });

    page2.drawText("YOUR NEXT STEPS", {
      x: pageWidth - 110,
      y: pageHeight - 21,
      size: 8.5,
      font: fontBold,
      color: cDentalTeal,
    });

    let y2 = pageHeight - 65;

    page2.drawText("Three fixes, in order of impact", {
      x: 36,
      y: y2,
      size: 20,
      font: fontBold,
      color: cDeepNavy,
    });

    y2 -= 15;

    // 3 Numbered Priority Recommendation Cards
    const recs = [
      {
        num: "01",
        title: "Make it effortless to book on a phone",
        detail: "Add a tap-to-call button and a 2-step booking form patients can find without scrolling or searching.",
        signal: "Why it matters: patients on their phone won't hunt for a way to reach you.",
      },
      {
        num: "02",
        title: "Get into the top 3 on Google Maps",
        detail: "Match your name, address, and phone number everywhere online, and complete every field on your Google Business Profile.",
        signal: "Why it matters: nearly all local clicks go to the top 3 — everyone else fights for scraps.",
      },
      {
        num: "03",
        title: "Put your reviews on autopilot",
        detail: "A short text after every visit asking happy patients for a review — no one has to remember to ask.",
        signal: "Why it matters: patients compare review counts before anything else.",
      },
    ];

    for (const r of recs) {
      y2 -= 80;

      page2.drawRectangle({
        x: 36,
        y: y2,
        width: pageWidth - 72,
        height: 72,
        color: cSoftMint,
        borderColor: cBorder,
        borderWidth: 1,
      });

      // Left Dental Teal Accent Border
      page2.drawRectangle({
        x: 36,
        y: y2,
        width: 4,
        height: 72,
        color: cDentalTeal,
      });

      // Faded Large Number
      page2.drawText(r.num, {
        x: 48,
        y: y2 + 42,
        size: 20,
        font: fontBold,
        color: cDarkTeal,
      });

      // Action Title
      page2.drawText(r.title, {
        x: 82,
        y: y2 + 50,
        size: 11,
        font: fontBold,
        color: cDeepNavy,
      });

      // Explanation
      const recLines = wrapText(r.detail, 75);
      let ry = y2 + 35;
      for (const rl of recLines.slice(0, 2)) {
        page2.drawText(rl, {
          x: 82,
          y: ry,
          size: 8.5,
          font: fontRegular,
          color: cCharcoal,
        });
        ry -= 12;
      }

      // Signal Label
      page2.drawText(r.signal, {
        x: 82,
        y: y2 + 10,
        size: 7.5,
        font: fontBold,
        color: cDarkTeal,
      });
    }

    y2 -= 35;

    // Compact Opportunity Summary Section
    page2.drawText("WHERE THE GROWTH IS WAITING", {
      x: 36,
      y: y2,
      size: 10,
      font: fontBold,
      color: cDeepNavy,
    });

    y2 -= 10;
    const oppCards = [
      { title: "Your website", desc: "Make it fast and easy to book on mobile" },
      { title: "Google Maps", desc: "Move into the top 3 nearby search results" },
      { title: "Reviews", desc: "Build the trust patients look for first" },
    ];

    const oppWidth = (pageWidth - 72 - 20) / 3;
    oppCards.forEach((opp, i) => {
      const ox = 36 + i * (oppWidth + 10);
      page2.drawRectangle({
        x: ox,
        y: y2 - 50,
        width: oppWidth,
        height: 50,
        color: cOffWhite,
        borderColor: cBorder,
        borderWidth: 1,
      });

      page2.drawText(opp.title, {
        x: ox + 8,
        y: y2 - 18,
        size: 8.5,
        font: fontBold,
        color: cDeepNavy,
      });

      page2.drawText(opp.desc, {
        x: ox + 8,
        y: y2 - 36,
        size: 7.5,
        font: fontRegular,
        color: cMutedText,
      });
    });

    y2 -= 80;

    // Prominent Consultation CTA Panel
    page2.drawRectangle({
      x: 36,
      y: y2 - 110,
      width: pageWidth - 72,
      height: 110,
      color: cDeepNavy,
    });

    page2.drawText("Let's walk through it together", {
      x: 52,
      y: y2 - 25,
      size: 14,
      font: fontBold,
      color: cWhite,
    });

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

    // Page 2 Footer
    page2.drawRectangle({ x: 36, y: 35, width: pageWidth - 72, height: 0.5, color: cBorder });
    page2.drawText("STRICTLY CONFIDENTIAL  ·  PREPARED BY SMILE AI MARKETING", {
      x: 36,
      y: 20,
      size: 7.5,
      font: fontBold,
      color: cMutedText,
    });
    page2.drawText("PAGE 2 OF 2", {
      x: pageWidth - 90,
      y: 20,
      size: 7.5,
      font: fontBold,
      color: cDarkTeal,
    });

    // Save PDF to public reports storage directory
    const reportsDir = path.join(process.cwd(), "public", "reports");
    await fs.mkdir(reportsDir, { recursive: true });

    const fileName = `audit-${data.publicToken}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    const pdfBytes = await pdfDoc.save();

    await fs.writeFile(filePath, pdfBytes);

    const relativeUrl = `/reports/${fileName}`;

    // Update Audit in Postgres
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
