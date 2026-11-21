import { PosProgress } from "@/lib/types";
import { formatRupiah } from "@/lib/format";

interface PosProgressBarProps {
  progress: PosProgress;
}

export function PosProgressBar({ progress }: PosProgressBarProps) {
  const { pos, jatah_bulanan, terpakai, sisa, persen, status } = progress;

  // Colors based on status:
  // aman (<70%): green
  // waspada (70-99%): yellow / amber
  // melebihi (>=100%): red
  const colorMap = {
    aman: {
      bar: "bg-emerald-500",
      text: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    waspada: {
      bar: "bg-amber-500",
      text: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    },
    melebihi: {
      bar: "bg-rose-500",
      text: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
    },
  };

  const currentTheme = colorMap[status];
  const barWidth = Math.min(Math.max(persen, 0), 100);

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            {pos}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${currentTheme.badge}`}
          >
            {persen}%
          </span>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            {formatRupiah(terpakai)}
          </span>
          <span className="text-xs text-slate-400 ml-1">
            / {formatRupiah(jatah_bulanan)}
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${currentTheme.bar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Sisa Info */}
      <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {status === "melebihi" ? (
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              Melebihi jatah {formatRupiah(Math.abs(sisa))}
            </span>
          ) : (
            <span>Sisa jatah: {formatRupiah(sisa)}</span>
          )}
        </span>

        {progress.jatah_harian > 0 && (
          <span className="text-slate-400">
            Target: ~{formatRupiah(progress.jatah_harian)}/hr
          </span>
        )}
      </div>
    </div>
  );
}
