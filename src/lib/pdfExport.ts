import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { EvaluationReport } from "./types";

export async function generatePDF(report: EvaluationReport): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Helper to add new page if needed
  const checkPageBreak = (neededSpace: number) => {
    if (yPos + neededSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Evaluation Report", margin, yPos);
  yPos += 15;

  // Flow name
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(report.flowName, margin, yPos);
  yPos += 10;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date(report.runDate).toLocaleString()}`, margin, yPos);
  yPos += 15;

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    completed: [34, 197, 94],
    partial: [234, 179, 8],
    failed: [239, 68, 68],
    blocked: [249, 115, 22],
  };
  const statusColor = statusColors[report.status] || [100, 100, 100];
  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, yPos - 5, 60, 10, 2, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(report.status.toUpperCase(), margin + 30, yPos + 2, { align: "center" });
  yPos += 15;

  // Reset text color
  doc.setTextColor(0);

  // Summary table
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, yPos);
  yPos += 8;

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: [
      ["Website", report.websiteName || "N/A"],
      ["Total Steps", report.totalSteps.toString()],
      ["Completed", report.completedSteps.toString()],
      ["Failed", report.failedSteps.toString()],
      ["Duration", report.totalDuration],
      ["Viewport", report.viewport],
    ],
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { cellWidth: 100 },
    },
    margin: { left: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 15;

  // Steps section
  checkPageBreak(30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Steps Detail", margin, yPos);
  yPos += 10;

  // Steps table
  const stepsData = report.steps.map((step) => [
    step.stepNumber.toString(),
    step.name.substring(0, 40) + (step.name.length > 40 ? "..." : ""),
    step.loadTime,
    step.errors.length > 0 ? "❌ " + step.errors[0].substring(0, 30) : "✓",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["#", "Step Name", "Load Time", "Status"]],
    body: stepsData,
    theme: "striped",
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 80 },
      2: { cellWidth: 25 },
      3: { cellWidth: 50 },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Individual step details with screenshots
  for (const step of report.steps) {
    checkPageBreak(100);
    
    // Step header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Step ${step.stepNumber}: ${step.name}`, margin, yPos);
    yPos += 8;

    // Step details
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    
    if (step.url) {
      const urlText = step.url.length > 80 ? step.url.substring(0, 80) + "..." : step.url;
      doc.text(`URL: ${urlText}`, margin, yPos);
      yPos += 5;
    }
    
    doc.text(`Page Title: ${step.pageTitle || "N/A"}`, margin, yPos);
    yPos += 5;
    
    doc.text(`Load Time: ${step.loadTime}`, margin, yPos);
    yPos += 5;

    if (step.errors.length > 0) {
      doc.setTextColor(239, 68, 68);
      doc.text(`Errors: ${step.errors.join(", ")}`, margin, yPos);
      yPos += 5;
    }

    doc.setTextColor(0);

    // Screenshot
    if (step.screenshot) {
      try {
        let imageData = step.screenshot;
        
        // If it's a path, we need to fetch the actual data
        if (step.screenshot.startsWith("/screenshots/") || step.screenshot.startsWith("data:image")) {
          // If it's already a data URL, use it directly
          if (step.screenshot.startsWith("data:image")) {
            imageData = step.screenshot;
          }
        }

        // Only add if we have a valid data URL
        if (imageData.startsWith("data:image")) {
          checkPageBreak(80);
          
          // Calculate image dimensions to fit page
          const maxWidth = pageWidth - (margin * 2);
          const maxHeight = 70;
          
          doc.addImage(imageData, "PNG", margin, yPos, maxWidth, maxHeight);
          yPos += maxHeight + 10;
        }
      } catch (error) {
        console.error("Failed to add screenshot:", error);
        doc.setTextColor(150);
        doc.setFontSize(8);
        doc.text("[Screenshot not available]", margin, yPos);
        yPos += 10;
        doc.setTextColor(0);
      }
    }

    yPos += 10;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount} | Flow Evaluator Report | ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc.output("blob");
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

