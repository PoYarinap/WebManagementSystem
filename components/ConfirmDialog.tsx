"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X, Info } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title = "Konfirmasi Tindakan",
  message,
  confirmLabel = "Ya, Hapus",
  cancelLabel = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 !mt-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div 
        className="w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              variant === "danger"
                ? "bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400"
                : variant === "warning"
                ? "bg-amber-100 text-amber-600 dark:bg-amber-950/70 dark:text-amber-400"
                : "bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400"
            }`}
          >
            {variant === "danger" ? (
              <Trash2 className="w-6 h-6" />
            ) : variant === "warning" ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 space-y-1">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 ${
              variant === "danger"
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/25"
                : variant === "warning"
                ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25"
                : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
            }`}
          >
            {variant === "danger" && <Trash2 className="w-3.5 h-3.5" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
