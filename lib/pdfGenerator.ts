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

    // Color definitions
    const primaryBlue = rgb(0.09, 0.42, 0.88);
    const darkGray = rgb(0.12, 0.16, 0.22);
    const mutedGray = rgb(0.4, 0.45, 0.55);
    const bgLight = rgb(0.96, 0.97, 0.99);

    // Page 1: Overview & Scorecard
    const page1 = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
    const { height: pageHeight, width: pageWidth } = page1.getSize();

    // Top banner / Brand Header
    page1.drawRectangle({
      x: 0,
      y: pageHeight - 90,
      width: pageWidth,
      height: 90,
      color: primaryBlue,
    });

    page1.drawText("SMILE AI MARKETING", {
      x: 40,
      y: pageHeight - 45,
      size: 16,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page1.drawText("EXECUTIVE DENTAL AUDIT & GROWTH REPORT", {
      x: 40,
      y: pageHeight - 65,
      size: 10,
      font: fontRegular,
      color: rgb(0.85, 0.92, 1),
    });

    // Practice Header Info
    let yPos = pageHeight - 130;
    page1.drawText(data.businessName.toUpperCase(), {
      x: 40,
      y: yPos,
      size: 20,
      font: fontBold,
      color: darkGray,
    });

    yPos -= 20;
    page1.drawText(`Target Market: ${data.city}  |  Website: ${data.website}`, {
      x: 40,
      y: yPos,
      size: 10,
      font: fontRegular,
      color: mutedGray,
    });

    // Score Card Box
    yPos -= 110;
    page1.drawRectangle({
      x: 40,
      y: yPos,
      width: pageWidth - 80,
      height: 95,
      color: bgLight,
      borderColor: rgb(0.85, 0.88, 0.94),
      borderWidth: 1,
    });

    page1.drawText("OPPORTUNITY SCORE", {
      x: 60,
      y: yPos + 65,
      size: 10,
      font: fontBold,
      color: primaryBlue,
    });

    page1.drawText(`${data.opportunityScore} / 100`, {
      x: 60,
      y: yPos + 25,
      size: 32,
      font: fontBold,
      color: darkGray,
    });

    page1.drawText("Higher score indicates larger growth potential in local patient acquisition.", {
      x: 230,
      y: yPos + 40,
      size: 9,
      font: fontRegular,
      color: darkGray,
    });

    // Findings section
    yPos -= 40;
    page1.drawText("KEY AUDIT FINDINGS", {
      x: 40,
      y: yPos,
      size: 14,
      font: fontBold,
      color: darkGray,
    });

    yPos -= 15;
    for (const item of data.findings.slice(0, 3)) {
      yPos -= 50;
      page1.drawRectangle({
        x: 40,
        y: yPos,
        width: pageWidth - 80,
        height: 44,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.92, 0.96),
        borderWidth: 1,
      });

      page1.drawText(item.title, {
        x: 55,
        y: yPos + 26,
        size: 11,
        font: fontBold,
        color: darkGray,
      });

      const truncatedDetail = item.detail.length > 85 ? `${item.detail.slice(0, 85)}...` : item.detail;
      page1.drawText(truncatedDetail, {
        x: 55,
        y: yPos + 10,
        size: 9,
        font: fontRegular,
        color: mutedGray,
      });
    }

    // Page 2: Recommendations & Action Plan
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    let yPos2 = pageHeight - 60;

    page2.drawText("ACTIONABLE RECOMMENDATIONS & NEXT STEPS", {
      x: 40,
      y: yPos2,
      size: 16,
      font: fontBold,
      color: darkGray,
    });

    yPos2 -= 30;
    const recommendations = [
      {
        step: "1. Optimize Mobile Conversion Flow",
        text: "Embed direct tap-to-call buttons and 2-click online appointment forms on the primary mobile landing view.",
      },
      {
        step: "2. Claim Local Maps Dominance",
        text: "Synchronize local citations across Google, Apple Maps, and Bing to enter the local top 3 map pack.",
      },
      {
        step: "3. Review Acceleration Campaign",
        text: "Automate SMS review dispatch post-treatment to achieve 100+ 5-star Google reviews.",
      },
    ];

    for (const rec of recommendations) {
      yPos2 -= 70;
      page2.drawRectangle({
        x: 40,
        y: yPos2,
        width: pageWidth - 80,
        height: 60,
        color: bgLight,
        borderColor: rgb(0.85, 0.88, 0.94),
        borderWidth: 1,
      });

      page2.drawText(rec.step, {
        x: 55,
        y: yPos2 + 38,
        size: 12,
        font: fontBold,
        color: primaryBlue,
      });

      page2.drawText(rec.text, {
        x: 55,
        y: yPos2 + 18,
        size: 9.5,
        font: fontRegular,
        color: darkGray,
      });
    }

    // CTA Box
    yPos2 -= 130;
    page2.drawRectangle({
      x: 40,
      y: yPos2,
      width: pageWidth - 80,
      height: 100,
      color: primaryBlue,
    });

    page2.drawText("BOOK YOUR 15-MINUTE STRATEGY REVIEW", {
      x: 60,
      y: yPos2 + 65,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    page2.drawText("Schedule a complimentary strategy call or request an in-person clinic visit.", {
      x: 60,
      y: yPos2 + 45,
      size: 10,
      font: fontRegular,
      color: rgb(0.9, 0.95, 1),
    });

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/audit/${data.publicToken}`;
    page2.drawText(`Interactive Report: ${reportUrl}`, {
      x: 60,
      y: yPos2 + 20,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1),
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
