"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  PiggyBank,
  TrendingDown,
  AlertCircle,
  PlusCircle,
  ChevronRight,
  Flame,
  ArrowRight,
  Info,
  CalendarCheck,
} from "lucide-react";
import { formatRupiah, formatTanggal, getCurrentPeriodeJakarta } from "@/lib/format";
import { DashboardData } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { PosProgressBar } from "@/components/PosProgressBar";
import { ExpenseDistributionChart, DailyTrendChart } from "@/components/Charts";
import { WarningAlerts } from "@/components/WarningAlerts";
import { PeriodSelector } from "@/components/PeriodSelector";
import { DashboardSkeleton } from "@/components/Skeleton";

export default function DashboardPage() {
  const [periode, setPeriode] = useState(getCurrentPeriodeJakarta());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [movingSavings, setMovingSavings] = useState(false);

  const fetchDashboard = useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?periode=${selectedPeriod}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal mengambil data dasbor:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard(periode);
  }, [periode, fetchDashboard]);

  // Listen to global data update event (e.g. from FAB Quick Expense modal)
  useEffect(() => {
    const handleRefresh = () => fetchDashboard(periode);
    window.addEventListener("refresh-data", handleRefresh);
    return () => window.removeEventListener("refresh-data", handleRefresh);
  }, [periode, fetchDashboard]);

  // Handle transfer sisa bulan lalu ke tabungan
  const handlePindahkanSisaKeTabungan = async () => {
    if (!data || data.sisaBulanLalu <= 0) return;
    const confirmMove = confirm(
      `Pindahkan sisa bulan lalu sebesar ${formatRupiah(
        data.sisaBulanLalu
      )} ke pos Tabungan bulan ini?`
    );
    if (!confirmMove) return;

    setMovingSavings(true);
    try {
      // Record an expense as saving or an income note
      await fetch("/api/pemasukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal: `${periode}-01`,
          jumlah: data.sisaBulanLalu,
          keterangan: `Sisa saldo bulan lalu (${data.periodeLalu}) dialihkan`,
          periode,
        }),
      });

      await fetchDashboard(periode);
    } catch (e) {
      console.error("Gagal memindahkan sisa ke tabungan:", e);
    } finally {
      setMovingSavings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dasbor Keuangan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pantau gaji, sisa saldo, dan pos anggaran harian Anda
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <PeriodSelector
            currentPeriod={periode}
            onChangePeriod={(newP) => setPeriode(newP)}
          />
        </div>
      </div>

      {loading && !data ? (
        <DashboardSkeleton />
      ) : data ? (
        <>
          {/* Banner: Sisa Bulan Lalu Info */}
          {data.sisaBulanLalu > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/80 dark:border-blue-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <PiggyBank className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Sisa Bulan Lalu ({data.periodeLalu})
                  </h4>
                  <p className="text-base font-bold text-slate-900 dark:text-white">
                    {formatRupiah(data.sisaBulanLalu)}
                  </p>
                </div>
              </div>

              <button
                onClick={handlePindahkanSisaKeTabungan}
                disabled={movingSavings}
                className="self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <span>Pindahkan sisa ke tabungan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Banner: Belum ada gaji bulan ini */}
          {!data.hasPemasukan && (
            <div className="p-6 rounded-3xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Belum Ada Gaji Bulan Ini
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Catat gaji masuk untuk periode {periode} agar dasbor aktif dan
                  perhitungan sisa saldo otomatis berjalan.
                </p>
              </div>

              <Link
                href="/pemasukan"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/25 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Catat Gaji Masuk Sekarang</span>
              </Link>
            </div>
          )}

          {/* 4 Summary Cards (Grid 2 col mobile, 4 col desktop) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Uang Masuk */}
            <StatCard
              title="Uang Masuk"
              value={formatRupiah(data.totalPemasukan)}
              subtitle={`${data.daftarPemasukan.length} entri gajian`}
              icon={<ArrowDownLeft className="w-5 h-5" />}
              variant="green"
            />

            {/* Total Terpakai */}
            <StatCard
              title="Total Terpakai"
              value={formatRupiah(data.totalPengeluaran)}
              subtitle={
                data.totalPemasukan > 0
                  ? `${Math.round(
                      (data.totalPengeluaran / data.totalPemasukan) * 100
                    )}% dari gaji`
                  : undefined
              }
              icon={<TrendingDown className="w-5 h-5" />}
              variant="amber"
            />

            {/* Sisa Saldo */}
            <StatCard
              title="Sisa Saldo"
              value={formatRupiah(data.sisaSaldo)}
              subtitle={
                data.sisaSaldo >= 0 ? "Saldo tersedia" : "Defisit anggaran"
              }
              icon={<Wallet className="w-5 h-5" />}
              variant={data.sisaSaldo >= 0 ? "blue" : "red"}
              badge={data.sisaSaldo < 0 ? "Minus" : undefined}
            />

            {/* Sisa Jatah Makan Hari Ini */}
            <StatCard
              title="Jatah Makan Hari Ini"
              value={formatRupiah(data.makanHariIni.sisaHariIni)}
              subtitle={`Terpakai: ${formatRupiah(
                data.makanHariIni.terpakaiHariIni
              )}`}
              icon={<Utensils className="w-5 h-5" />}
              variant={data.makanHariIni.sisaHariIni >= 0 ? "purple" : "red"}
              badge={`Target ${formatRupiah(
                data.makanHariIni.jatahHarian
              )}/hr`}
            />
          </div>

          {/* Automated Warnings */}
          {data.warnings && data.warnings.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Peringatan Anggaran
              </h2>
              <WarningAlerts warnings={data.warnings} />
            </div>
          )}

          {/* Progress Bar per Pos Anggaran */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Jatah Pos Anggaran Bulanan
              </h2>
              <Link
                href="/anggaran"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Atur Pos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data.posProgressList.map((prog) => (
                <PosProgressBar key={prog.pos} progress={prog} />
              ))}
            </div>
          </div>

          {/* Section: "Di Mana Boroskan?" */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Di Mana Boroskan?
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Distribution Chart */}
              <div className="lg:col-span-2 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Pengeluaran per Pos Anggaran
                </h3>
                <ExpenseDistributionChart data={data.posProgressList} />
              </div>

              {/* Top 3 Biggest Expenses */}
              <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  3 Pengeluaran Terbesar Bulan Ini
                </h3>

                {data.topPengeluaran.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Belum ada pengeluaran tercatat
                  </p>
                ) : (
                  <div className="space-y-3">
                    {data.topPengeluaran.map((exp, idx) => (
                      <div
                        key={exp.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                              {exp.keterangan || exp.pos}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {exp.pos} • {formatTanggal(exp.tanggal)}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                          {formatRupiah(exp.jumlah)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tren Pengeluaran Harian */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                Tren Pengeluaran Harian
              </h3>
              <DailyTrendChart data={data.dailyTrends} />
            </div>
          </div>

          {/* Recent 10 Transactions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Transaksi Terbaru
              </h2>
              <Link
                href="/transaksi"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {data.transaksiTerbaru.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-400">
                Belum ada transaksi di bulan ini. Gunakan tombol + di kanan bawah
                untuk mencatat pengeluaran.
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden shadow-sm">
                {data.transaksiTerbaru.map((trx) => (
                  <div
                    key={trx.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {trx.pos.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {trx.keterangan || trx.pos}
                        </p>
                        <p className="text-xs text-slate-400">
                          {trx.pos} • {formatTanggal(trx.tanggal)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        -{formatRupiah(trx.jumlah)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">
          Gagal memuat data dasbor. Silakan periksa koneksi atau konfigurasi.
        </div>
      )}
    </div>
  );
}
