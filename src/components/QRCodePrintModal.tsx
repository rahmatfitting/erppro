"use client";

import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { X, Printer, Loader2, QrCode as QrCodeIcon, Barcode as BarcodeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRCodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: {
    kode_barang: string;
    nama_barang: string;
    jumlah: number;
    satuan?: string;
  }[];
  title?: string;
}

const BarcodeRenderer = ({ code }: { code: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          width: 2,
          height: 60,
          displayValue: false,
          margin: 0,
        });
      } catch (e) {
        console.error("Barcode Error", e);
      }
    }
  }, [code]);
  return <svg ref={svgRef} className="w-full h-12 object-contain" />;
};

export const QRCodePrintModal: React.FC<QRCodePrintModalProps> = ({ 
    isOpen, 
    onClose, 
    items, 
    title = "Cetak Label Barang" 
}) => {
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [printMode, setPrintMode] = useState<"qr" | "barcode">("qr");
  const [paperSize, setPaperSize] = useState<"a4" | "4x6" | "label">("a4");

  useEffect(() => {
    if (isOpen) {
      generateQRs();
    }
  }, [isOpen, items]);

  const generateQRs = async () => {
    setLoading(true);
    const codes: { [key: string]: string } = {};
    for (const item of items) {
      if (!item.kode_barang) continue;
      if (!codes[item.kode_barang]) {
        try {
          const url = await QRCode.toDataURL(item.kode_barang, {
            width: 300,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" }
          });
          codes[item.kode_barang] = url;
        } catch (err) {
          console.error("QR Error", err);
        }
      }
    }
    setQrCodes(codes);
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 print:p-0 print:static print:inset-auto">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print:hidden" onClick={onClose} />
      
      <div className="print-area relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:w-full print:h-auto print:max-h-none print:static print:overflow-visible">
        
        {/* Header - Hidden on Print */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 print:hidden">
            <div className="flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    {printMode === 'qr' ? <QrCodeIcon className="h-5 w-5 text-indigo-600" /> : <BarcodeIcon className="h-5 w-5 text-indigo-600" />}
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-tight">{title}</h3>
                    <p className="text-xs text-slate-500 font-medium">Total Label: {items.reduce((acc, item) => acc + (Math.ceil(item.jumlah) || 0), 0)} pcs</p>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Mode Toggle */}
                <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                        onClick={() => setPrintMode('qr')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${printMode === 'qr' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        QR Code
                    </button>
                    <button 
                        onClick={() => setPrintMode('barcode')}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${printMode === 'barcode' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Barcode
                    </button>
                </div>

                {/* Size Selector */}
                <select 
                    value={paperSize}
                    onChange={(e) => setPaperSize(e.target.value as any)}
                    className="bg-slate-200 dark:bg-slate-800 rounded-lg px-2 py-1.5 text-xs font-bold outline-none border-none text-slate-700 dark:text-slate-200"
                >
                    <option value="a4">A4 Standard</option>
                    <option value="4x6">10x15cm (4x6")</option>
                    <option value="label">Label (4-6cm)</option>
                </select>

                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

                <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95"
                >
                    <Printer className="h-4 w-4" />
                    Cetak Sekarang
                </button>
                <button
                    onClick={onClose}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30 dark:bg-slate-900 print:overflow-visible print:p-0 print:bg-white print:block">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                    <p className="text-slate-500 font-medium animate-pulse">Menyiapkan Label...</p>
                </div>
            ) : (
                <div className={cn(
                    "grid gap-4 print:gap-1",
                    paperSize === 'a4' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 print:grid-cols-5" : 
                    paperSize === '4x6' ? "grid-cols-2 sm:grid-cols-3 print:grid-cols-3" : 
                    "grid-cols-1 sm:grid-cols-2 print:grid-cols-1" // narrow label: 1 column on print
                )}>
                    {items.map((item, idx) => (
                        Array.from({ length: Math.ceil(item.jumlah || 0) }).map((_, i) => (
                            <div 
                                key={`${item.kode_barang}-${idx}-${i}`} 
                                className={cn(
                                    "bg-white p-3 border border-slate-200 rounded-lg flex flex-col items-center shadow-sm print:inline-flex print:w-full print:break-inside-avoid print:border-none print:shadow-none",
                                    paperSize === 'label' ? "h-32" : printMode === 'barcode' ? "h-36" : "h-48"
                                )}
                            >
                                <div className="w-full text-center border-b border-slate-100 pb-1 mb-1 print:border-slate-200">
                                    <p className="text-[9px] font-black text-slate-950 uppercase truncate leading-tight">{item.nama_barang}</p>
                                </div>
                                
                                <div className="flex-1 flex items-center justify-center w-full min-h-0 overflow-hidden py-1">
                                    {printMode === 'qr' ? (
                                        <img src={qrCodes[item.kode_barang]} alt="QR" className="h-[90%] aspect-square object-contain" />
                                    ) : (
                                        <BarcodeRenderer code={item.kode_barang} />
                                    )}
                                </div>

                                <div className="mt-auto w-full text-center pt-1 border-t border-slate-100 print:border-slate-200 flex flex-col items-center">
                                    <p className="text-[9px] font-bold text-slate-500 font-mono tracking-tighter">{item.kode_barang}</p>
                                    <p className="text-[8px] font-medium text-slate-400 -mt-0.5 uppercase">{item.satuan || 'Pcs'}</p>
                                </div>
                            </div>
                        ))
                    ))}
                </div>
            )}
        </div>

        {/* Global Print Overrides */}
        <style jsx global>{`
            @media print {
                /* Aggressively hide everything */
                body * {
                    visibility: hidden !important;
                }
                /* Show ONLY the print area and its deep contents */
                .print-area, .print-area * {
                    visibility: visible !important;
                }
                /* Reset print-area position to top-left */
                .print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    background: white !important;
                    box-shadow: none !important;
                }
                /* Ensure parents of print-area are visible but their other children are hidden */
                /* This is handled by visibility: hidden on body * and visibility: visible on .print-area */

                @page {
                    size: ${paperSize === 'a4' ? 'A4' : paperSize === '4x6' ? '10cm 15cm' : '6cm 4cm'};
                    margin: ${paperSize === 'a4' ? '10mm' : '2mm'};
                }
                .print-area > div:last-child {
                    padding: ${paperSize === 'a4' ? '10mm' : '2mm'} !important;
                }
            }
        `}</style>
      </div>
    </div>
  );
};
