import jsPDF from "jspdf";
import "jspdf-autotable";

interface ActionItem {
  task: string;
  responsible: string;
  dueDate: string;
  status: string;
}

interface TranscriptEntry {
  speaker: string;
  content: string;
  timestamp: string;
}

interface MeetingData {
  title: string;
  date: string;
  time: string;
  duration: string | null;
  participantNames: string | null;
  speakers: number | null;
}

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface PDFGeneratorOptions {
  meeting: MeetingData;
  transcripts: TranscriptEntry[];
  summary: string | null;
  actionItems: ActionItem[] | null;
  companyProfile: CompanyProfile;
  attendees: string[];
}

export function generateMOMPdf(options: PDFGeneratorOptions): jsPDF {
  const { meeting, transcripts, summary, actionItems, companyProfile, attendees } = options;
  
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
      addHeader();
    }
  };

  // Add header with company info
  const addHeader = () => {
    doc.setFillColor(11, 60, 93); // Deep Corporate Blue
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(companyProfile.name, pageWidth / 2, 15, { align: "center" });
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(companyProfile.website, pageWidth / 2, 23, { align: "center" });
    doc.text(`${companyProfile.phone} | ${companyProfile.email}`, pageWidth / 2, 29, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    yPos = 45;
  };

  // Add footer
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 10;
    doc.setFillColor(107, 124, 133); // Steel Grey
    doc.rect(0, pageHeight - 15, pageWidth, 15, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("MINUTES OF MEETING - CONFIDENTIAL", margin, footerY);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, footerY, { align: "center" });
  };

  // Start first page
  addHeader();

  // Document Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 60, 93);
  doc.text("MINUTES OF MEETING", pageWidth / 2, yPos, { align: "center" });
  yPos += 12;

  // Meeting Title
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(meeting.title, pageWidth / 2, yPos, { align: "center" });
  yPos += 15;

  // Meeting Details Box
  doc.setDrawColor(31, 122, 140); // Muted Teal
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, "S");
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  const col1X = margin + 5;
  const col2X = pageWidth / 2;
  
  doc.text("Date:", col1X, yPos + 8);
  doc.text("Time:", col1X, yPos + 16);
  doc.text("Duration:", col1X, yPos + 24);
  doc.text("Location:", col2X, yPos + 8);
  doc.text("Meeting ID:", col2X, yPos + 16);
  
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(meeting.date), col1X + 25, yPos + 8);
  doc.text(formatTime(meeting.time), col1X + 25, yPos + 16);
  doc.text(meeting.duration || "N/A", col1X + 25, yPos + 24);
  doc.text("Online Meeting", col2X + 30, yPos + 8);
  doc.text(new Date().getTime().toString(36).toUpperCase(), col2X + 30, yPos + 16);
  
  yPos += 40;

  // Attendees Section
  checkPageBreak(40);
  doc.setFillColor(240, 245, 250);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8, 2, 2, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 60, 93);
  doc.text("ATTENDEES", margin + 5, yPos + 6);
  yPos += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  
  if (attendees.length > 0) {
    const attendeeText = attendees.map((a, i) => `${i + 1}. ${a}`).join("    ");
    const lines = doc.splitTextToSize(attendeeText, pageWidth - 2 * margin - 10);
    doc.text(lines, margin + 5, yPos + 4);
    yPos += lines.length * 5 + 10;
  } else {
    doc.text(`${meeting.speakers || 0} speaker(s) detected (unidentified)`, margin + 5, yPos + 4);
    yPos += 14;
  }

  // Discussion Summary Section
  if (summary) {
    checkPageBreak(50);
    doc.setFillColor(240, 245, 250);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("DISCUSSION SUMMARY", margin + 5, yPos + 6);
    yPos += 14;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    
    const summaryLines = doc.splitTextToSize(summary, pageWidth - 2 * margin - 10);
    for (const line of summaryLines) {
      checkPageBreak(6);
      doc.text(line, margin + 5, yPos);
      yPos += 5;
    }
    yPos += 10;
  }

  // Action Items Section
  if (actionItems && actionItems.length > 0) {
    checkPageBreak(50);
    doc.setFillColor(240, 245, 250);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("ACTION ITEMS", margin + 5, yPos + 6);
    yPos += 14;

    // Use autoTable for action items
    (doc as any).autoTable({
      startY: yPos,
      head: [["#", "Task", "Responsible", "Due Date", "Status"]],
      body: actionItems.map((item, idx) => [
        idx + 1,
        item.task,
        item.responsible,
        item.dueDate,
        item.status.charAt(0).toUpperCase() + item.status.slice(1),
      ]),
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: [11, 60, 93],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [0, 0, 0],
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20 },
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }

  // Transcript Section
  if (transcripts.length > 0) {
    checkPageBreak(40);
    doc.setFillColor(240, 245, 250);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 8, 2, 2, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(11, 60, 93);
    doc.text("MEETING TRANSCRIPT", margin + 5, yPos + 6);
    yPos += 14;

    doc.setFontSize(9);
    
    for (const entry of transcripts) {
      checkPageBreak(20);
      
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 122, 140);
      doc.text(entry.speaker + ":", margin + 5, yPos);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      
      const contentLines = doc.splitTextToSize(entry.content, pageWidth - 2 * margin - 40);
      let firstLine = true;
      for (const line of contentLines) {
        if (!firstLine) checkPageBreak(5);
        doc.text(line, margin + 35, yPos);
        yPos += 5;
        firstLine = false;
      }
      yPos += 3;
    }
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  return doc;
}

function formatDate(date: string): string {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

function formatTime(time: string): string {
  try {
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch {
    return time;
  }
}

export function downloadPdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}

export function getPdfBlob(doc: jsPDF): Blob {
  return doc.output("blob");
}

export function getPdfDataUri(doc: jsPDF): string {
  return doc.output("datauristring");
}
