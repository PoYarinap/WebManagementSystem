"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Check,
  Utensils,
  PiggyBank,
  Fuel,
  ShoppingBag,
  ShieldAlert,
  Coffee,
  Tag,
} from "lucide-react";

interface PosSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
}

function getPosIcon(posName: string) {
  const lower = posName.toLowerCase();
  if (lower.includes("makan")) return <Utensils className="w-4 h-4 text-orange-500" />;
  if (lower.includes("tabung")) return <PiggyBank className="w-4 h-4 text-emerald-500" />;
  if (lower.includes("bensin") || lower.includes("transport"))
    return <Fuel className="w-4 h-4 text-amber-500" />;
  if (lower.includes("pokok") || lower.includes("belanja"))
    return <ShoppingBag className="w-4 h-4 text-blue-500" />;
  if (lower.includes("tak terduga") || lower.includes("darurat"))
    return <ShieldAlert className="w-4 h-4 text-rose-500" />;
  if (lower.includes("jajan") || lower.includes("rokok") || lower.includes("kopi"))
    return <Coffee className="w-4 h-4 text-purple-500" />;
  return <Tag className="w-4 h-4 text-slate-400" />;
}

export function PosSelect({
  value,
  options,
  onChange,
  placeholder = "Pilih Pos Anggaran",
}: PosSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-2xl text-sm font-medium flex items-center justify-between transition-all ${
          open
            ? "border-blue-500 ring-2 ring-blue-500/25"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-center shrink-0 shadow-xs">
            {getPosIcon(value)}
          </span>
          <span className="text-slate-900 dark:text-white font-semibold truncate">
            {value || placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? "rotate-180 text-blue-500" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 mt-2 z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt === value;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-sm flex items-center justify-between transition-colors ${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 font-medium"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="w-7 h-7 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center shrink-0">
                    {getPosIcon(opt)}
                  </span>
                  <span className="truncate">{opt}</span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
