import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  variant?: "blue" | "green" | "amber" | "red" | "purple";
  badge?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
  badge,
  onClick,
}: StatCardProps) {
  const variantStyles = {
    blue: "bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/50",
    green:
      "bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50",
    amber:
      "bg-amber-50/70 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50",
    red: "bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/50",
    purple:
      "bg-purple-50/70 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/50",
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${variantStyles[variant]}`}
        >
          {icon}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>

        {(subtitle || badge) && (
          <div className="flex items-center gap-2 pt-0.5">
            {badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${variantStyles[variant]}`}
              >
                {badge}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
