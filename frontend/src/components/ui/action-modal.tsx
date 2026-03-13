import React from "react";
import { Button } from "@/components/ui/button";

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryActionText: string;
  onPrimaryAction: () => void;
}

export default function ActionModal({
  isOpen,
  onClose,
  title,
  children,
  primaryActionText,
  onPrimaryAction,
}: ActionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Box */}
      <div className="relative z-10 w-[90vw] max-w-md rounded-[2rem] bg-white p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <h2 className="mb-4 text-xl font-bold text-foreground">{title}</h2>
        
        <div className="mb-6 text-sm text-muted-foreground">
          {children}
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl h-12" 
            onClick={onClose}
          >
            Отмена
          </Button>
          <Button 
            className="flex-1 rounded-xl h-12 text-white" 
            onClick={() => {
              onPrimaryAction();
              onClose();
            }}
          >
            {primaryActionText}
          </Button>
        </div>
      </div>
    </div>
  );
}
