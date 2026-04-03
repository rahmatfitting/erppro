import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export type ExportColumn = {
  header: string;
  key: string;
  width?: number;
  format?: (val: any, row: any) => string;
};

export type ExportConfig = {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: ExportColumn[];
  data: any[];
};

export const exportToPDF = (config: ExportConfig) => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(config.title, 14, 18);

  if (config.subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(config.subtitle, 14, 25);
  }

  const tableStartY = config.subtitle ? 32 : 25;

  autoTable(doc, {
    startY: tableStartY,
    head: [config.columns.map((c) => c.header)],
    body: config.data.map((row, idx) =>
      config.columns.map((col) => {
        if (col.key === "_no") return idx + 1;
        const val = row[col.key] ?? "";
        return col.format ? col.format(val, row) : val;
      })
    ),
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${config.fileName}.pdf`);
};

export const exportToExcel = async (config: ExportConfig, isPivot = false) => {
  const CHUNK_SIZE = 5000;

  if (config.data.length <= CHUNK_SIZE) {
    const sheetData: any[][] = [];

    // Title rows
    sheetData.push([config.title]);
    if (config.subtitle) sheetData.push([config.subtitle]);
    sheetData.push([]); // spacing

    // Header row
    sheetData.push(config.columns.map((c) => c.header));

    // Data rows
    config.data.forEach((row, idx) => {
      sheetData.push(
        config.columns.map((col) => {
          if (col.key === "_no") return idx + 1;
          const val = row[col.key] ?? "";
          return col.format ? col.format(val, row) : val;
        })
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isPivot ? "Pivot Data" : "Data");

    XLSX.writeFile(wb, `${config.fileName}.xlsx`);
    return;
  }

  // Large data export -> ZIP chunks
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  const totalChunks = Math.ceil(config.data.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const chunkData = config.data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    
    const sheetData: any[][] = [];
    sheetData.push([config.title + ` (Part ${i + 1}/${totalChunks})`]);
    if (config.subtitle) sheetData.push([config.subtitle]);
    sheetData.push([]); // spacing
    sheetData.push(config.columns.map((c) => c.header));

    chunkData.forEach((row, idx) => {
      sheetData.push(
        config.columns.map((col) => {
          if (col.key === "_no") return (i * CHUNK_SIZE) + idx + 1;
          const val = row[col.key] ?? "";
          return col.format ? col.format(val, row) : val;
        })
      );
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Data Part ${i + 1}`);

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    zip.file(`${config.fileName}_Part${i + 1}.xlsx`, excelBuffer);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${config.fileName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
