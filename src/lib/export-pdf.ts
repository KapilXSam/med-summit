import { jsPDF } from "jspdf";
import type {
  Conference,
  Insight,
  Poster,
  Endpoint,
  Hypothesis,
} from "@/data/types";

export interface ExportSections {
  executiveSummary: boolean;
  insights: boolean;
  posters: boolean;
  endpoints: boolean;
  hypotheses: boolean;
  sourceAttribution: boolean;
}

export const defaultExportSections: ExportSections = {
  executiveSummary: true,
  insights: true,
  posters: true,
  endpoints: true,
  hypotheses: true,
  sourceAttribution: true,
};

interface ExportOptions {
  conference: Conference;
  tierName: string;
  tierDescription: string;
  insights: Insight[];
  posters?: Poster[];
  endpoints?: Endpoint[];
  hypotheses?: Hypothesis[];
  sections?: ExportSections;
}

/** Map common Unicode punctuation/symbols to ASCII so standard PDF fonts render them. */
function ascii(input: string): string {
  return (input ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2265/g, ">=")
    .replace(/\u2264/g, "<=")
    .replace(/\u2022/g, "-")
    .replace(/\u00b7/g, "-")
    .replace(/[^\x00-\x7F]/g, "");
}

/**
 * Generates and downloads an executive summary PDF for the selected conference.
 * Sections are configurable via `sections`. When `sourceAttribution` is on,
 * every claim carries page-level source attribution (quote, page, confidence).
 */
export function exportExecutiveSummaryPdf({
  conference,
  tierName,
  tierDescription,
  insights,
  posters = [],
  endpoints = [],
  hypotheses = [],
  sections = defaultExportSections,
}: ExportOptions) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      y = 56;
    }
  };

  const sectionHeading = (label: string) => {
    ensureSpace(32);
    y += 6;
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(label, marginX, y);
    y += 8;
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(1.2);
    doc.line(marginX, y, marginX + 40, y);
    doc.setLineWidth(0.2);
    y += 16;
  };

  const emptyLine = (text: string) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(text, marginX, y);
    y += 16;
  };

  // ---- Header band ----
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 96, "F");
  doc.setTextColor(148, 163, 184);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("VERA 2.0 · EXECUTIVE SUMMARY", marginX, 38);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text(conference.acronym, marginX, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(ascii(`${conference.name} - ${conference.location}`), marginX, 80);
  y = 128;

  // ---- Meta line ----
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  const dateRange = `${conference.startDate} - ${conference.endDate}`;
  doc.text(
    `${tierName}   |   ${dateRange}   |   Generated ${new Date().toLocaleDateString()}`,
    marginX,
    y,
  );
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 24;

  // ---- Executive summary intro ----
  if (sections.executiveSummary) {
    sectionHeading("Executive Summary");
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const introLines = doc.splitTextToSize(ascii(tierDescription), contentWidth);
    doc.text(introLines, marginX, y);
    y += introLines.length * 13 + 12;
  }

  // ---- Insights ----
  if (sections.insights) {
    sectionHeading("Key Insights");
    if (insights.length === 0) {
      emptyLine("No insights are available for this conference yet.");
    }
    insights.forEach((insight, idx) => {
      const bodyLines = doc.splitTextToSize(ascii(insight.text), contentWidth - 24);
      const attribution = sections.sourceAttribution
        ? `Source: "${ascii(insight.sourceQuote)}" - p.${insight.page} | confidence ${insight.confidence}/10`
        : "";
      const attrLines = attribution
        ? doc.splitTextToSize(attribution, contentWidth - 24)
        : [];
      const blockHeight = bodyLines.length * 13 + attrLines.length * 11 + 22;
      ensureSpace(blockHeight);

      doc.setFillColor(37, 99, 235);
      doc.circle(marginX + 8, y - 3, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(String(idx + 1), marginX + 8, y, { align: "center" });

      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(bodyLines, marginX + 24, y);
      y += bodyLines.length * 13 + 4;

      if (attrLines.length) {
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.text(attrLines, marginX + 24, y);
        y += attrLines.length * 11 + 10;
      } else {
        y += 6;
      }
    });
  }

  // ---- Posters ----
  if (sections.posters) {
    sectionHeading("Poster Captures");
    if (posters.length === 0) {
      emptyLine("No posters have been captured for this conference.");
    }
    posters.forEach((p) => {
      const title = `- ${ascii(p.title)}`;
      const meta = `  ${ascii(p.presenter)} | ${ascii(p.therapyArea)}`;
      const summary = (p.summary ?? []).map((s) => `    - ${ascii(s)}`);
      const attr = sections.sourceAttribution
        ? `    Source: "${ascii(p.sourceQuote)}" - p.${p.page} | confidence ${p.confidence}/10`
        : "";
      const lines = [
        ...doc.splitTextToSize(title, contentWidth),
        ...doc.splitTextToSize(meta, contentWidth),
        ...summary.flatMap((s) => doc.splitTextToSize(s, contentWidth)),
        ...(attr ? doc.splitTextToSize(attr, contentWidth) : []),
      ];
      ensureSpace(lines.length * 12 + 8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(lines.slice(0, 2), marginX, y);
      y += 2 * 12;
      if (summary.length) {
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(9);
        const sumLines = summary.flatMap((s) => doc.splitTextToSize(s, contentWidth));
        doc.text(sumLines, marginX, y);
        y += sumLines.length * 12;
      }
      if (attr) {
        doc.setTextColor(100, 116, 139);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        const attrLines = doc.splitTextToSize(attr, contentWidth);
        doc.text(attrLines, marginX, y);
        y += attrLines.length * 11;
      }
      y += 6;
    });
  }

  // ---- Endpoints ----
  if (sections.endpoints) {
    sectionHeading("Trial Endpoints");
    if (endpoints.length === 0) {
      emptyLine("No endpoints recorded for this conference.");
    }
    endpoints.forEach((e) => {
      const line1 = `- ${ascii(e.trialId)} | ${ascii(e.trialName)} (${ascii(e.asset)})`;
      const line2 = `  ${ascii(e.endpointType)}: ${ascii(e.endpoint)} = ${ascii(e.value)}`;
      const stats = [e.pValue && `p=${ascii(e.pValue)}`, e.hr && `HR=${ascii(e.hr)}`, e.ci && `CI ${ascii(e.ci)}`]
        .filter(Boolean)
        .join(" | ");
      const line3 = stats ? `    ${stats}` : "";
      const lines = [
        ...doc.splitTextToSize(line1, contentWidth),
        ...doc.splitTextToSize(line2, contentWidth),
        ...(line3 ? doc.splitTextToSize(line3, contentWidth) : []),
      ];
      ensureSpace(lines.length * 12 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, marginX, y);
      y += lines.length * 12 + 4;
    });
  }

  // ---- Hypotheses ----
  if (sections.hypotheses) {
    sectionHeading("Hypotheses");
    if (hypotheses.length === 0) {
      emptyLine("No hypotheses captured for this conference.");
    }
    hypotheses.forEach((h) => {
      const line1 = `- ${ascii(h.statement)}`;
      const line2 = `  Impact: ${h.impact} | Likelihood: ${h.likelihood}${h.gap ? " | Evidence gap" : ""}`;
      const evidence =
        h.evidence && h.evidence.length
          ? `    Evidence: ${h.evidence.map((ev) => `${ascii(ev.label)} (${ev.source})`).join("; ")}`
          : "";
      const lines = [
        ...doc.splitTextToSize(line1, contentWidth),
        ...doc.splitTextToSize(line2, contentWidth),
        ...(evidence ? doc.splitTextToSize(evidence, contentWidth) : []),
      ];
      ensureSpace(lines.length * 12 + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.text(lines, marginX, y);
      y += lines.length * 12 + 4;
    });
  }

  // ---- Footer on every page ----
  const footerText = sections.sourceAttribution
    ? "Generated by VERA - every claim carries direct-extraction source attribution."
    : "Generated by VERA.";
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 40, pageWidth - marginX, pageHeight - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(footerText, marginX, pageHeight - 26);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 26, {
      align: "right",
    });
  }

  const safeName = conference.acronym.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`${safeName}-executive-summary.pdf`);
}
