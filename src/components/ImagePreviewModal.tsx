"use client";

import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  isOpen, onClose, images, currentIndex, onIndexChange 
}) => {
  if (!isOpen || images.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onIndexChange) {
      onIndexChange(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onIndexChange) {
      onIndexChange(currentIndex === images.length - 1 ? 0 : currentIndex + 1);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"
      >
        <X className="h-6 w-6" />
      </button>

      {images.length > 1 && onIndexChange && (
        <>
          <button 
            onClick={handlePrev}
            className="absolute left-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 z-[101]"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button 
            onClick={handleNext}
            className="absolute right-6 p-4 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-95 z-[101]"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      <div className="max-w-4xl max-h-[85vh] w-full p-4 flex flex-col items-center gap-4">
        <img 
          src={images[currentIndex]} 
          alt={`Preview ${currentIndex + 1}`} 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300 pointer-events-none"
        />
        <div className="px-4 py-2 bg-white/10 rounded-full text-white text-sm font-medium">
          {currentIndex + 1} / {images.length}
        </div>
      </div>
    </div>
  );
};
