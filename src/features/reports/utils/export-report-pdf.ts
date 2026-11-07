import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";

import {
  drawAccentBar,
  drawDocumentFooter,
  drawDocumentHeader,
  drawMetaStrip,
  getLastAutoTableFinalY,
  getPdfPageMetrics,
} from "@/lib/pdf-document-layout";
import { loadLogoForPdf, loadPdfBrandingContext } from "@/lib/pdf-branding";
import type {
  ReportChartModel,
  ReportKpi,
} from "@/features/reports/types/report-visual.types";
import { formatReportChartValue } from "@/features/reports/utils/report-chart-options";

type ReportPdfImage = {
  title: string;
  dataUrl: string;
};

type DownloadReportPdfInput = {
  title: string;
  description: string;
  periodLabel: string;
  kpis: ReportKpi[];
  charts: ReportChartModel[];
  images: ReportPdfImage[];
};

function slugFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "report";
}

/** Download a branded PDF of the report currently on screen. */
export async function downloadReportPdf(input: DownloadReportPdfInput): Promise<void> {
  const branding = await loadPdfBrandingContext();
  const logo = await loadLogoForPdf(branding.branding_logo_url);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawAccentBar(doc, branding.colors);

  let cursorY = drawDocumentHeader(doc, {
    colors: branding.colors,
    logo,
    organizationName: branding.organizationName || "Clinic",
    title: input.title,
    documentNumber: input.periodLabel,
    statusLabel: "Report",
    statusColors: {
      fill: branding.colors.primary,
      text: branding.colors.onPrimary,
    },
  });

  const { margin, contentWidth } = getPdfPageMetrics(doc);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...branding.colors.mutedText);
  const descriptionLines = doc.splitTextToSize(input.description, contentWidth);
  doc.text(descriptionLines, margin, cursorY);
  cursorY += descriptionLines.length * 4 + 4;

  cursorY = drawMetaStrip(doc, {
    colors: branding.colors,
    y: cursorY,
    fields: input.kpis.slice(0, 4).map((kpi) => ({
      label: kpi.label,
      value: kpi.value,
    })),
  });

  for (const image of input.images) {
    if (cursorY > 200) {
      doc.addPage();
      drawAccentBar(doc, branding.colors);
      cursorY = 16;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...branding.colors.bodyText);
    doc.text(image.title, margin, cursorY);
    cursorY += 3;
    const imageHeight = 62;
    doc.addImage(image.dataUrl, "PNG", margin, cursorY, contentWidth, imageHeight);
    cursorY += imageHeight + 8;
  }

  for (const chart of input.charts) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      head: [["", ...chart.series.map((series) => series.name)]],
      body: chart.categories.map((category, index) => [
        category,
        ...chart.series.map((series) =>
          formatReportChartValue(series.values[index] ?? 0, chart.valueFormat),
        ),
      ]),
      styles: { fontSize: 8, textColor: branding.colors.bodyText },
      headStyles: {
        fillColor: branding.colors.primary,
        textColor: [255, 255, 255],
      },
    });
    cursorY = getLastAutoTableFinalY(doc, cursorY) + 8;
  }

  drawDocumentFooter(doc, {
    colors: branding.colors,
    organizationName: branding.organizationName || "Clinic",
    documentLabel: input.title,
  });

  doc.save(`${slugFileName(input.title)}.pdf`);
}
