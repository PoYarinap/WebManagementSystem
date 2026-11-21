import { AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { WarningItem } from "@/lib/types";

interface WarningAlertsProps {
  warnings: WarningItem[];
}

export function WarningAlerts({ warnings }: WarningAlertsProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {warnings.map((w) => {
        const isDanger = w.type === "danger";
        const isWarning = w.type === "warning";

        return (
          <div
            key={w.id}
            className={`p-3.5 sm:p-4 rounded-2xl border flex items-start gap-3 transition-all ${
              isDanger
                ? "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200"
                : isWarning
                ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200"
                : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200"
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {isDanger ? (
                <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              ) : isWarning ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            <div className="space-y-0.5 text-xs sm:text-sm">
              <h4 className="font-bold leading-tight">{w.title}</h4>
              <p className="opacity-90 leading-relaxed">{w.pesan}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
