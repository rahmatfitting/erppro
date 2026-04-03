"use client";

import { useState, useCallback } from "react";
import { X, FileText, FileSpreadsheet, Printer, Loader2 } from "lucide-react";

export type PrintColumn = {
  header: string;
  key: string;
  width?: number;
  align?: "left" | "right" | "center";
  format?: (val: any) => string;
};

export type PrintData = {
  title: string;
  subtitle?: string;
  kode: string;
  tanggal: string;
  keterangan?: string;
  extraHeaders?: { label: string; value: string }[];
  columns: PrintColumn[];
  rows: any[];
  footerRows?: { label: string; value: string }[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: PrintData;
};

export default function PrintModal({ isOpen, onClose, data }: Props) {
  const [loading, setLoading] = useState<"pdf" | "excel" | null>(null);

  const handlePDF = useCallback(async () => {
    setLoading("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      // Use A5 landscape (210 x 148 mm) - half of A4 portrait
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5" });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;

      // --- HEADER DESIGN ---
      // Decorative bar at the top
      doc.setFillColor(79, 70, 229); // Indigo-600
      doc.rect(0, 0, pageWidth, 12, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(data.title.toUpperCase(), margin, 8);

      // Company info / Status placeholder (optional, just for aesthetics)
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("DOKUMEN INTERNAL ERP", pageWidth - margin, 8, { align: "right" });

      // Reset text color for body
      doc.setTextColor(30, 41, 59); // Slate-800

      // Transaction Info Box
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(data.kode, margin, 22);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139); // Slate-500
      doc.text(`Tgl: ${data.tanggal}`, margin, 27);

      // Extra headers on the right
      if (data.extraHeaders && data.extraHeaders.length > 0) {
        let ehY = 22;
        data.extraHeaders.forEach((h) => {
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text(`${h.label}:`, pageWidth - 80, ehY);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 41, 59);
          doc.text(h.value, pageWidth - margin, ehY, { align: "right" });
          ehY += 5;
        });
      }

      // Divider line
      doc.setDrawColor(226, 232, 240); // Slate-200
      doc.line(margin, 35, pageWidth - margin, 35);

      if (data.keterangan) {
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 116, 139);
        doc.text(`Keterangan: ${data.keterangan}`, margin, 39);
      }

      const tableStartY = data.keterangan ? 42 : 38;

      // --- TABLE DESIGN ---
      autoTable(doc, {
        startY: tableStartY,
        head: [data.columns.map((c) => c.header)],
        body: data.rows.map((row, idx) =>
          data.columns.map((col) => {
            if (col.key === "_no") return idx + 1;
            const val = row[col.key] ?? "";
            return col.format ? col.format(val) : val;
          })
        ),
        theme: "striped",
        headStyles: { 
          fillColor: [248, 250, 252], // Slate-50 
          textColor: [71, 85, 105], // Slate-600
          fontSize: 7, 
          fontStyle: "bold",
          lineWidth: 0.1,
          lineColor: [226, 232, 240]
        },
        bodyStyles: { 
          fontSize: 7, 
          textColor: [30, 41, 59], // Slate-800
          cellPadding: 2
        },
        columnStyles: data.columns.reduce((acc: any, col, i) => {
          acc[i] = { halign: col.align || "left", cellWidth: col.width ? (col.width * (pageWidth / 210)) : "auto" };
          return acc;
        }, {}),
        margin: { left: margin, right: margin },
        styles: { font: "helvetica", lineWidth: 0.05, lineColor: [241, 245, 249] }
      });

      // --- FOOTER DESIGN ---
      if (data.footerRows && data.footerRows.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY + 6;
        const footerWidth = 70;
        const footerX = pageWidth - margin - footerWidth;

        data.footerRows.forEach((f, i) => {
          const isGrandTotal = f.label.toUpperCase().includes("TOTAL") || i === data.footerRows!.length - 1;
          
          if (isGrandTotal) {
             doc.setFillColor(241, 245, 249); // Slate-100
             doc.rect(footerX - 2, finalY + (i * 6) - 4, footerWidth + 2, 7, "F");
             doc.setFontSize(9);
             doc.setFont("helvetica", "bold");
             doc.setTextColor(79, 70, 229); // Indigo-600
          } else {
             doc.setFontSize(8);
             doc.setFont("helvetica", "normal");
             doc.setTextColor(100, 116, 139); // Slate-500
          }

          doc.text(`${f.label}:`, footerX, finalY + i * 6);
          doc.text(f.value, pageWidth - margin, finalY + i * 6, { align: "right" });
        });
      }

      // Optional: Add a subtle footer line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, doc.internal.pageSize.height - 10, pageWidth - margin, doc.internal.pageSize.height - 10);
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184); // Slate-400
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, margin, doc.internal.pageSize.height - 7);

      doc.save(`${data.kode}.pdf`);
    } catch (e) {
      console.error("PDF error:", e);
      alert("Gagal membuat PDF");
    } finally {
      setLoading(null);
    }
  }, [data]);

  const handleExcel = useCallback(async () => {
    setLoading("excel");
    try {
      const XLSX = await import("xlsx");

      const sheetData: any[][] = [];

      // Title rows
      sheetData.push([data.title]);
      if (data.subtitle) sheetData.push([data.subtitle]);
      sheetData.push([`Kode: ${data.kode}`, "", `Tanggal: ${data.tanggal}`]);
      if (data.keterangan) sheetData.push([`Keterangan: ${data.keterangan}`]);
      
      data.extraHeaders?.forEach((h) => {
        sheetData.push([`${h.label}: ${h.value}`]);
      });

      sheetData.push([]); // spacing

      // Header row
      sheetData.push(data.columns.map((c) => c.header));

      // Data rows
      data.rows.forEach((row, idx) => {
        sheetData.push(
          data.columns.map((col) => {
            if (col.key === "_no") return idx + 1;
            const val = row[col.key] ?? "";
            return col.format ? col.format(val) : val;
          })
        );
      });

      sheetData.push([]); // spacing

      // Footer rows
      data.footerRows?.forEach((f) => {
        sheetData.push([f.label, f.value]);
      });

      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data");
      XLSX.writeFile(wb, `${data.kode}.xlsx`);
    } catch (e) {
      console.error("Excel error:", e);
      alert("Gagal membuat Excel");
    } finally {
      setLoading(null);
    }
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-2 text-white">
            <Printer className="h-5 w-5" />
            <h3 className="font-bold text-base">Cetak Dokumen</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white rounded-full p-1 hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pilih format output untuk dokumen{" "}
            <span className="font-bold text-slate-700 dark:text-slate-200">{data.kode}</span>
          </p>

          {/* PDF Button */}
          <button
            onClick={handlePDF}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-500/10 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all group disabled:opacity-50"
          >
            {loading === "pdf" ? (
              <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-red-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FileText className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="text-left">
              <p className="font-bold text-sm text-red-700 dark:text-red-400">
                {loading === "pdf" ? "Membuat PDF..." : "Cetak PDF"}
              </p>
              <p className="text-xs text-red-500/80 dark:text-red-400/60">
                Format dokumen portable (.pdf)
              </p>
            </div>
          </button>

          {/* Excel Button */}
          <button
            onClick={handleExcel}
            disabled={loading !== null}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-500/10 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all group disabled:opacity-50"
          >
            {loading === "excel" ? (
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-5 w-5 text-white" />
              </div>
            )}
            <div className="text-left">
              <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                {loading === "excel" ? "Membuat Excel..." : "Export Excel"}
              </p>
              <p className="text-xs text-emerald-500/80 dark:text-emerald-400/60">
                Format spreadsheet (.xlsx)
              </p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
