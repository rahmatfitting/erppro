"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Armchair, User } from "lucide-react";

interface SeatMapProps {
  layout: {
    rows: number;
    cols: number;
    seats: { num: number; row: number; col: number }[];
  };
  occupiedSeats: number[];
  selectedSeats: number[];
  onSeatToggle: (seatNum: number) => void;
}

export default function SeatMap({ layout, occupiedSeats, selectedSeats, onSeatToggle }: SeatMapProps) {
  const { rows, cols, seats } = layout;

  // Create a grid representation
  const grid = useMemo(() => {
    const matrix = Array(rows).fill(null).map(() => Array(cols).fill(null));
    seats.forEach(s => {
      if (s.row <= rows && s.col <= cols) {
        matrix[s.row - 1][s.col - 1] = s.num;
      }
    });
    return matrix;
  }, [layout]);

  return (
    <div className="flex flex-col items-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-inner">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-48 h-2 bg-slate-300 dark:bg-slate-700 rounded-full mb-2"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Windshield</span>
      </div>

      <div 
        className="grid gap-4"
        style={{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}
      >
        {/* Driver Seat (Mock for visual) */}
        <div className="flex items-center justify-center p-3 opacity-20">
          <User className="h-6 w-6" />
        </div>
        {/* Empty space for aisle if needed, but we follow the grid */}
        {Array(cols - 1).fill(0).map((_, i) => <div key={`empty-${i}`} />)}

        {grid.map((row, rowIndex) => (
          row.map((seatNum, colIndex) => {
            if (seatNum === null) return <div key={`gap-${rowIndex}-${colIndex}`} className="w-12 h-12" />;

            const isOccupied = occupiedSeats.includes(seatNum);
            const isSelected = selectedSeats.includes(seatNum);

            return (
              <button
                key={`seat-${seatNum}`}
                disabled={isOccupied}
                onClick={() => onSeatToggle(seatNum)}
                className={cn(
                  "relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 group",
                  "border-2",
                  isOccupied 
                    ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:border-slate-700" 
                    : isSelected
                    ? "bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/40 scale-105"
                    : "bg-white border-slate-100 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-slate-950 dark:border-slate-800 dark:hover:bg-indigo-900/20"
                )}
              >
                <Armchair className={cn(
                  "h-5 w-5 mb-1 transition-transform",
                  !isOccupied && !isSelected && "group-hover:scale-110"
                )} />
                <span className="text-[10px] font-black">{seatNum}</span>
                
                {isSelected && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
                  </span>
                )}
              </button>
            );
          })
        ))}
      </div>

      {/* Legend */}
      <div className="mt-12 flex gap-6 text-[10px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800"></div>
          Available
        </div>
        <div className="flex items-center gap-2 text-indigo-600">
          <div className="w-3 h-3 rounded-sm bg-indigo-600 shadow-sm shadow-indigo-500/50"></div>
          Selected
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-800"></div>
          Occupied
        </div>
      </div>
    </div>
  );
}
