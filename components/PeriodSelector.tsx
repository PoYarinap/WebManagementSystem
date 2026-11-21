"use client";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatPeriode, getCurrentPeriodeJakarta } from "@/lib/format";

interface PeriodSelectorProps {
  currentPeriod: string;
  onChangePeriod: (newPeriod: string) => void;
}

export function PeriodSelector({
  currentPeriod,
  onChangePeriod,
}: PeriodSelectorProps) {
  const defaultPeriod = getCurrentPeriodeJakarta();
  const isCurrentMonth = currentPeriod === defaultPeriod;

  const navigateMonth = (delta: number) => {
    const [yearStr, monthStr] = currentPeriod.split("-");
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + delta;

    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }

    const nextPeriod = `${year}-${String(month).padStart(2, "0")}`;
    onChangePeriod(nextPeriod);
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-sm">
      <button
        onClick={() => navigateMonth(-1)}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Bulan Sebelumnya"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 px-2">
        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
          {formatPeriode(currentPeriod)}
        </span>
        {isCurrentMonth && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
            Bulan Ini
          </span>
        )}
      </div>

      <button
        onClick={() => navigateMonth(1)}
        className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Bulan Berikutnya"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
