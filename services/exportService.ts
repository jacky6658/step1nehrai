import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";

/**
 * Export a specific DOM element to PDF using html2canvas.
 * This ensures CJK characters, styling, and layout are preserved exactly as seen on screen.
 */
export const exportElementToPDF = async (filename: string, elementId: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  try {
    // 1. Capture the element as a canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Improve resolution
      useCORS: true, // Allow cross-origin images
      logging: false,
      backgroundColor: '#ffffff' 
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // 2. Create PDF with the exact size of the content
    // 'p' = portrait, 'px' = units, [width, height] = custom size
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'l' : 'p',
      unit: 'px',
      format: [imgWidth, imgHeight]
    });

    // 3. Add image to PDF
    pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

    // 4. Save
    pdf.save(`${filename}.pdf`);

  } catch (error) {
    console.error("PDF Export Failed:", error);
    alert("PDF 匯出失敗，請重試。");
  }
};

/**
 * Legacy text export - discouraged for CJK. 
 * Kept for simple use cases or fallback, but UI should prefer exportElementToPDF.
 */
export const exportToPDF = (filename: string, title: string, content: string) => {
   // Warning: This method does not support Chinese characters without custom font embedding.
   // Forwarding to a basic alert for now if used directly, but app logic should use exportElementToPDF
   console.warn("Using text-based PDF export which may not support CJK. Please use exportElementToPDF.");
   
   const doc = new jsPDF();
   doc.text("PDF Export (Text Mode)", 10, 10);
   doc.text("Note: For full Chinese support, please use the visual export button.", 10, 20);
   doc.save(`${filename}_text.pdf`);
};

export const exportToExcel = (filename: string, data: Record<string, any>[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToTxt = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
};