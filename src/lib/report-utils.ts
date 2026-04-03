import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportToPDF = (title: string, columns: string[], data: any[], fileName: string) => {
  const doc: any = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 14, 30);
  
  // Table
  autoTable(doc, {
    startY: 35,
    head: [columns],
    body: data.map(row => columns.map(col => row[col] || row[col.toLowerCase()] || '-')),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
    styles: { fontSize: 8 },
  });
  
  doc.save(`${fileName}.pdf`);
};

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportToPivot = (data: any[], fileName: string) => {
  // Pivot mode: usually just a clean flat JSON to sheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data_Pivot");
  XLSX.writeFile(workbook, `${fileName}_Pivot.xlsx`);
};
