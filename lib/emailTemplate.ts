/**
 * Shared merge-tag rendering + branded HTML wrapper for every outbound
 * outreach email. This is the single place that turns an admin-authored
 * EmailStep template into the actual message a dentist receives — so the
 * report link, PDF link, and booking CTAs are always present, regardless
 * of what the admin's template text does or doesn't mention.
 */

export interface EmailMergeFields {
  contactName: string;
  clinicName: string;
  city: string;
  auditUrl: string;
}

/** Replaces {{tag}}, {{ tag }}, {{Tag}} etc. — tolerant of spacing/case admins actually type. */
function applyMergeTags(template: string, fields: EmailMergeFields): string {
  const map: Record<string, string> = {
    contactname: fields.contactName,
    clinicname: fields.clinicName,
    city: fields.city,
    auditurl: fields.auditUrl,
    // Legacy/alternate spellings seen in older templates — kept so nothing regresses.
    clinic_name: fields.clinicName,
    contact_name: fields.contactName,
    audit_url: fields.auditUrl,
  };

  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, tag: string) => {
    const key = tag.toLowerCase();
    return key in map ? map[key] : match;
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function textToParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 16px;">${escapeHtml(block).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

export interface RenderOutreachEmailParams {
  subjectTemplate: string;
  bodyTemplate: string;
  contactName: string;
  clinicName: string;
  city: string;
  reportUrl: string;
  pdfUrl?: string;
  unsubscribeUrl: string;
}

export interface RenderedOutreachEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Renders an admin-authored EmailStep into the real message that goes out:
 * merge tags applied, then wrapped in the branded layout with the report
 * link, PDF link (if ready), and both booking CTAs always present.
 */
export function renderOutreachEmail(params: RenderOutreachEmailParams): RenderedOutreachEmail {
  const fields: EmailMergeFields = {
    contactName: params.contactName,
    clinicName: params.clinicName,
    city: params.city,
    auditUrl: params.reportUrl,
  };

  const subject = applyMergeTags(params.subjectTemplate, fields);
  const bodyText = applyMergeTags(params.bodyTemplate, fields);
  const bodyHtml = textToParagraphs(bodyText);

  const navy = "#0B2430";
  const teal = "#18B7A5";
  const darkTeal = "#0E8F82";
  const mint = "#E8F7F4";
  const muted = "#61727A";
  const border = "#DCE8E5";

  const pdfLine = params.pdfUrl
    ? `<p style="margin:0 0 20px; font-size:13px; color:${muted};">Prefer a PDF? <a href="${params.pdfUrl}" style="color:${darkTeal}; font-weight:600;">Download the report</a>.</p>`
    : "";

  const html = `
<div style="background:#F4F7F6; padding:32px 16px; font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; border:1px solid ${border};">
    <div style="background:${navy}; padding:20px 28px;">
      <span style="color:#ffffff; font-size:15px; font-weight:700; letter-spacing:0.02em;">Smile AI Marketing</span>
    </div>
    <div style="padding:28px 28px 8px;">
      ${bodyHtml}

      <div style="text-align:center; margin:28px 0 20px;">
        <a href="${params.reportUrl}" style="display:inline-block; background:${teal}; color:${navy}; font-weight:700; font-size:15px; padding:14px 28px; border-radius:999px; text-decoration:none;">
          View Your Full Report
        </a>
      </div>
      ${pdfLine}

      <div style="border-top:1px solid ${border}; padding-top:20px; margin-top:4px;">
        <p style="margin:0 0 14px; font-size:13px; font-weight:700; color:${navy};">Want to go through it together?</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
          <tr>
            <td style="padding-right:6px; width:50%;">
              <a href="${params.reportUrl}" style="display:block; text-align:center; background:${mint}; color:${darkTeal}; font-weight:700; font-size:13px; padding:12px 8px; border-radius:10px; text-decoration:none;">
                Book a 15-min video review
              </a>
            </td>
            <td style="padding-left:6px; width:50%;">
              <a href="${params.reportUrl}" style="display:block; text-align:center; background:#ffffff; border:1px solid ${border}; color:${navy}; font-weight:700; font-size:13px; padding:12px 8px; border-radius:10px; text-decoration:none;">
                Request an in-person visit
              </a>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin:24px 0 0; font-size:12.5px; color:${muted}; line-height:1.6;">
        P.S. — this report is usually where our work with a practice starts, not the whole of it. Down the line, if it's useful, we also help practices with the broader marketing, website, and AI/automation decisions that come with growing — no obligation, just an offer if it's ever relevant.
      </p>
    </div>

    <div style="border-top:1px solid ${border}; padding:18px 28px; font-size:11px; color:${muted}; line-height:1.6;">
      Smile AI Marketing &middot; ${escapeHtml(params.clinicName)}'s audit was prepared for ${escapeHtml(params.city)}.<br />
      Don't want these emails? <a href="${params.unsubscribeUrl}" style="color:${muted}; text-decoration:underline;">Unsubscribe here</a>.
    </div>
  </div>
</div>`.trim();

  const text = `${bodyText}\n\nView your full report: ${params.reportUrl}${
    params.pdfUrl ? `\nDownload the PDF: ${params.pdfUrl}` : ""
  }\n\nBook a 15-minute video review or request an in-person visit here: ${params.reportUrl}\n\nUnsubscribe: ${params.unsubscribeUrl}`;

  return { subject, html, text };
}
