"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Tooltip,
} from "recharts";
import { formatRupiah } from "@/lib/format";
import { DailyExpenseTrend, PosProgress } from "@/lib/types";
import { PieChart as PieIcon, BarChart2, Info, ArrowUpRight } from "lucide-react";

const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#64748b", // Slate
];

interface ExpenseDistributionChartProps {
  data: PosProgress[];
}

export function ExpenseDistributionChart({
  data,
}: ExpenseDistributionChartProps) {
  const [chartType, setChartType] = useState<"donut" | "bar">("donut");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // Filter only pos with spending
  const activeData = data
    .filter((d) => d.terpakai > 0)
    .map((d, idx) => ({
      name: d.pos,
      value: d.terpakai,
      jatah_bulanan: d.jatah_bulanan,
      sisa: d.sisa,
      persenPos: d.persen,
      status: d.status,
      color: COLORS[idx % COLORS.length],
    }))
    .sort((a, b) => b.value - a.value);

  const totalSpent = activeData.reduce((sum, d) => sum + d.value, 0);

  // Active item for the side panel (samping chart)
  const currentActive =
    activeData[selectedIndex] || (activeData.length > 0 ? activeData[0] : null);

  if (activeData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center mb-2">
          <PieIcon className="w-5 h-5 text-slate-400" />
        </div>
        <span>Belum ada pengeluaran di periode ini.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header & View Switcher */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span className="text-blue-500 font-bold">#</span>
          <span>Komposisi Pengeluaran ({activeData.length} Pos Aktif)</span>
        </div>

        {/* Toggle between Donut & Bar chart */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setChartType("donut")}
            aria-label="Tampilan Donut"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartType === "donut"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
            title="Diagram Donat"
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Donat</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType("bar")}
            aria-label="Tampilan Batang"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              chartType === "bar"
                ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
            title="Diagram Batang"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Batang</span>
          </button>
        </div>
      </div>

      {chartType === "donut" ? (
        /* Layout Samping (Chart di Kiri, Teks Detail di Kanan/Samping) */
        <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6 pt-1">
          {/* Sisi Kiri: Donut Chart Bersih Tanpa Popup Menutupi Tengah */}
          <div className="relative w-[240px] sm:w-[260px] h-[240px] sm:h-[260px] shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* TOOLTIP FLOATING DIHAPUS agar tidak menutupi lubang tengah donat */}
                <Pie
                  data={activeData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={activeData.length > 1 ? 3 : 0}
                  stroke="#090d16"
                  strokeWidth={2}
                  onClick={(_, index) => setSelectedIndex(index)}
                  onMouseEnter={(_, index) => setSelectedIndex(index)}
                >
                  {activeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={selectedIndex === index ? 1 : 0.45}
                      className="transition-all duration-200 cursor-pointer outline-none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Tulisan Tengah Donat: Tetap Terbaca Bersih */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center p-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Terpakai
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 leading-tight">
                {formatRupiah(totalSpent)}
              </span>
              <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                {activeData.length} Pos Anggaran
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Panel Teks Detail Pas di Luar Samping Chart */}
          <div className="w-full flex-1 space-y-3">
            {currentActive ? (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-3 transition-all animate-in fade-in duration-150">
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-md border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: currentActive.color }}
                    />
                    <div>
                      <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                        {currentActive.name}
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        {Math.round((currentActive.value / totalSpent) * 100)}% dari total pengeluaran
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300">
                    Pos Aktif
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">
                      Terpakai
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatRupiah(currentActive.value)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block mb-0.5">
                      Jatah Bulanan
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {formatRupiah(currentActive.jatah_bulanan)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>
                    {currentActive.sisa >= 0 ? (
                      <span>Sisa jatah: <strong className="text-emerald-500">{formatRupiah(currentActive.sisa)}</strong></span>
                    ) : (
                      <span className="text-rose-500 font-bold">Over jatah: {formatRupiah(Math.abs(currentActive.sisa))}</span>
                    )}
                  </span>
                  <span className="font-semibold">
                    {currentActive.persenPos}% dari jatah pos
                  </span>
                </div>
              </div>
            ) : null}

            {/* Daftar Pos Cepat di Samping Bawah (Bisa Diklik) */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {activeData.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const percent = Math.round((item.value / totalSpent) * 100);

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-600 text-blue-700 dark:text-blue-300 shadow-sm scale-105"
                        : "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {percent}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Alternative Bar Chart view */
        <div
          className="w-full transition-all duration-300"
          style={{
            height: `${Math.max(130, Math.min(320, activeData.length * 48 + 40))}px`,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activeData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(val) =>
                  val >= 1000000
                    ? `${(val / 1000000).toFixed(1)}jt`
                    : `${Math.round(val / 1000)}k`
                }
                stroke="#94a3b8"
                fontSize={11}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={85}
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                        <p className="font-bold">{item.name}</p>
                        <p className="text-blue-300 font-semibold mt-0.5">
                          {formatRupiah(item.value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" barSize={24} radius={[0, 9999, 9999, 0]}>
                {activeData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface DailyTrendChartProps {
  data: DailyExpenseTrend[];
}

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  // Check if there are any spending
  const hasExpenses = data.some((d) => d.total > 0);

  if (!hasExpenses) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
        <span>Belum ada data tren harian.</span>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
          <XAxis
            dataKey="hari"
            stroke="#94a3b8"
            fontSize={11}
            tickLine={false}
            interval={2}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={10}
            tickLine={false}
            tickFormatter={(val) =>
              val >= 1000000
                ? `${(val / 1000000).toFixed(1)}jt`
                : val > 0
                ? `${Math.round(val / 1000)}k`
                : "0"
            }
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as DailyExpenseTrend;
                return (
                  <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl border border-slate-700">
                    <p className="font-semibold text-slate-300">
                      Tgl {item.hari}
                    </p>
                    <p className="font-bold text-blue-400 mt-0.5">
                      {formatRupiah(item.total)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 2, fill: "#3b82f6" }}
            activeDot={{ r: 5, fill: "#2563eb" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
