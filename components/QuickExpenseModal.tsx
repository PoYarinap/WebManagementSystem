"use client";

import { useEffect, useState } from "react";
import { Plus, X, AlertTriangle, Check, Loader2, Sparkles } from "lucide-react";
import { formatRupiah, getTodayJakarta, parseRupiahInput } from "@/lib/format";
import { Anggaran, PosProgress } from "@/lib/types";
import { PosSelect } from "./PosSelect";

interface QuickExpenseModalProps {
  onExpenseAdded?: () => void;
}

const MAKAN_CHIPS = [10000, 15000, 20000, 25000];

export function QuickExpenseModal({ onExpenseAdded }: QuickExpenseModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingAnggaran, setFetchingAnggaran] = useState(false);
  const [anggaranList, setAnggaranList] = useState<Anggaran[]>([]);
  const [posProgressList, setPosProgressList] = useState<PosProgress[]>([]);

  // Form states
  const [tanggal, setTanggal] = useState(getTodayJakarta());
  const [pos, setPos] = useState("Makan");
  const [keterangan, setKeterangan] = useState("");
  const [jumlahStr, setJumlahStr] = useState("");
  const [showOverLimitConfirm, setShowOverLimitConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch current anggaran & progress
  const loadAnggaran = async () => {
    try {
      setFetchingAnggaran(true);
      const res = await fetch("/api/anggaran");
      if (res.ok) {
        const json = await res.json();
        if (json.anggaran && json.anggaran.length > 0) {
          setAnggaranList(json.anggaran);
          if (!pos || !json.anggaran.some((a: Anggaran) => a.pos === pos)) {
            setPos(json.anggaran[0].pos);
          }
        }
      }

      // Also get current dashboard to know remaining budget per pos
      const dashRes = await fetch("/api/dashboard");
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData.posProgressList) {
          setPosProgressList(dashData.posProgressList);
        }
      }
    } catch (e) {
      console.error("Error loading budget for modal:", e);
    } finally {
      setFetchingAnggaran(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTanggal(getTodayJakarta());
      loadAnggaran();
      setShowOverLimitConfirm(false);
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numeric = parseRupiahInput(rawValue);
    if (numeric === 0 && rawValue.replace(/[^0-9]/g, "") === "") {
      setJumlahStr("");
    } else {
      setJumlahStr(numeric.toLocaleString("id-ID"));
    }
  };

  const setMakanQuickAmount = (nominal: number) => {
    setPos("Makan");
    setJumlahStr(nominal.toLocaleString("id-ID"));
    if (!keterangan) {
      setKeterangan("Makan");
    }
  };

  const handleSubmit = async (bypassLimit = false) => {
    const amount = parseRupiahInput(jumlahStr);
    if (amount <= 0) {
      setErrorMsg("Masukkan jumlah pengeluaran lebih dari 0.");
      return;
    }

    if (!pos) {
      setErrorMsg("Pilih pos anggaran.");
      return;
    }

    // Check if this expense causes pos to exceed limit
    const currentProgress = posProgressList.find(
      (p) => p.pos.toLowerCase() === pos.toLowerCase()
    );
    if (currentProgress && currentProgress.jatah_bulanan > 0 && !bypassLimit) {
      const remainingBefore = currentProgress.sisa;
      if (remainingBefore < amount) {
        // Will exceed limit!
        setShowOverLimitConfirm(true);
        return;
      }
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/pengeluaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          pos,
          keterangan: keterangan || pos,
          jumlah: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pengeluaran, coba lagi.");
      }

      // Success! Reset and close
      setIsOpen(false);
      setJumlahStr("");
      setKeterangan("");
      setShowOverLimitConfirm(false);

      // Trigger global event & callback
      window.dispatchEvent(new CustomEvent("refresh-data"));
      if (onExpenseAdded) onExpenseAdded();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan pengeluaran.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(true)}
        type="button"
        aria-label="Tambah Pengeluaran"
        className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 hover:shadow-xl hover:shadow-blue-600/50 transition-all group"
      >
        <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-200" />
      </button>

      {/* Modal / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Catat Pengeluaran
                  </h3>
                  <span className="text-xs text-slate-400">
                    Input cepat harian
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
                {errorMsg}
              </div>
            )}

            {/* Quick Chips for Makan */}
            <div className="mt-4 p-3 bg-blue-50/60 dark:bg-slate-800/50 rounded-2xl border border-blue-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tombol Cepat Makan (2 Ketukan)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {MAKAN_CHIPS.map((nom) => (
                  <button
                    key={nom}
                    type="button"
                    onClick={() => setMakanQuickAmount(nom)}
                    className="py-1.5 px-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all text-center"
                  >
                    {(nom / 1000).toLocaleString("id-ID")}rb
                  </button>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit(false);
              }}
              className="mt-4 space-y-3.5"
            >
              {/* Jumlah Input */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Nominal (Rp)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={jumlahStr}
                    onChange={handleAmountChange}
                    placeholder="0"
                    autoFocus
                    required
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pos Anggaran */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Pos Anggaran
                </label>
                <PosSelect
                  value={pos}
                  onChange={setPos}
                  options={
                    anggaranList.length > 0
                      ? anggaranList.map((a) => a.pos)
                      : [
                          "Makan",
                          "Tabungan",
                          "Bensin",
                          "Kebutuhan Pokok",
                          "Dana Tak Terduga",
                          "Jajan & Rokok",
                        ]
                  }
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Makan siang warteg, bensin pom"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                />
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Over Limit Warning Dialog */}
              {showOverLimitConfirm && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 space-y-2 animate-in zoom-in-95 duration-150">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold">
                        Peringatan: Jatah {pos} akan melebihi batas!
                      </p>
                      <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                        Pengeluaran ini akan membuat pos {pos} melampaui sisa jatah
                        bulanan. Tetap ingin simpan transaksi ini?
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowOverLimitConfirm(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSubmit(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
                    >
                      Lanjut Simpan
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!showOverLimitConfirm && (
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Simpan</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
