"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  History,
  Calendar,
  ArrowUpRight,
  TrendingDown,
  ArrowDownLeft,
  Flame,
  ChevronRight,
  Loader2,
  Wallet,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { MonthHistorySummary } from "@/lib/types";

export default function RiwayatPage() {
  const [historyList, setHistoryList] = useState<MonthHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/riwayat");
        if (res.ok) {
          const json = await res.json();
          setHistoryList(json.data || []);
        }
      } catch (err) {
        console.error("Gagal mengambil riwayat:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Riwayat Bulanan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Ringkasan arus kas dan pos terboros di setiap bulan
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" />
          <p className="text-xs text-slate-400 mt-3">Memuat riwayat keuangan...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400 text-sm">
          Belum ada riwayat transaksi atau pemasukan.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {historyList.map((item) => (
            <Link
              key={item.periode}
              href={`/transaksi?periode=${item.periode}`}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-400/50 dark:hover:border-blue-600/50 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.namaBulan}
                      </h3>
                      <span className="text-[11px] text-slate-400">
                        Periode: {item.periode}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Lihat Detail</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>

                {/* Grid Financials */}
                <div className="grid grid-cols-3 gap-2 py-4 text-center">
                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Masuk
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatRupiah(item.totalPemasukan)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                      Keluar
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
                      {formatRupiah(item.totalPengeluaran)}
                    </span>
                  </div>

                  <div
                    className={`p-2.5 rounded-2xl ${
                      item.sisaSaldo >= 0
                        ? "bg-blue-50/70 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                        : "bg-rose-50/70 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-semibold opacity-70 block mb-0.5">
                      Sisa
                    </span>
                    <span className="text-xs sm:text-sm font-bold">
                      {formatRupiah(item.sisaSaldo)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pos Terboros footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Pos Terboros:</span>
                </div>

                {item.posTerboros ? (
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.posTerboros.pos} ({formatRupiah(item.posTerboros.total)})
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
