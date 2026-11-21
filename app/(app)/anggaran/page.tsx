"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle,
  Loader2,
  DollarSign,
  Settings,
  Calendar,
} from "lucide-react";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { Anggaran, Pengaturan } from "@/lib/types";

export default function AnggaranPage() {
  const [anggaranList, setAnggaranList] = useState<Anggaran[]>([]);
  const [gajiDefaultStr, setGajiDefaultStr] = useState("1.400.000");
  const [tanggalGajian, setTanggalGajian] = useState(25);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // New pos input
  const [newPosName, setNewPosName] = useState("");
  const [newPosBudgetStr, setNewPosBudgetStr] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/anggaran");
      if (res.ok) {
        const json = await res.json();
        setAnggaranList(json.anggaran || []);
        if (json.pengaturan?.gaji_default !== undefined) {
          setGajiDefaultStr(
            Number(json.pengaturan.gaji_default).toLocaleString("id-ID")
          );
        }
        if (json.pengaturan?.tanggal_gajian !== undefined) {
          setTanggalGajian(Number(json.pengaturan.tanggal_gajian));
        }
      }
    } catch (e) {
      console.error("Gagal mengambil data anggaran:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateItem = (
    index: number,
    field: "pos" | "jatah_bulanan" | "jatah_harian_opsional",
    value: any
  ) => {
    const next = [...anggaranList];
    next[index] = { ...next[index], [field]: value };
    setAnggaranList(next);
  };

  const handleRemovePos = (index: number) => {
    const posName = anggaranList[index].pos;
    if (!confirm(`Hapus pos anggaran "${posName}"?`)) return;
    const next = anggaranList.filter((_, i) => i !== index);
    setAnggaranList(next);
  };

  const handleAddPos = () => {
    if (!newPosName.trim()) {
      alert("Masukkan nama pos baru.");
      return;
    }
    const amount = parseRupiahInput(newPosBudgetStr);
    const next = [
      ...anggaranList,
      {
        pos: newPosName.trim(),
        jatah_bulanan: amount,
        jatah_harian_opsional: 0,
      },
    ];
    setAnggaranList(next);
    setNewPosName("");
    setNewPosBudgetStr("");
  };

  const totalGaji = parseRupiahInput(gajiDefaultStr);
  const totalAlokasi = anggaranList.reduce(
    (sum, a) => sum + (Number(a.jatah_bulanan) || 0),
    0
  );
  const selisih = totalGaji - totalAlokasi;
  const isOverAllocated = totalAlokasi > totalGaji;

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/anggaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anggaran: anggaranList,
          gaji_default: totalGaji,
          tanggal_gajian: tanggalGajian,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan.");
      }

      setFeedback({
        type: "success",
        message: "Perubahan anggaran dan pengaturan berhasil disimpan ke Google Sheets!",
      });

      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (e: any) {
      setFeedback({
        type: "error",
        message: e.message || "Gagal menyimpan anggaran.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Alokasi Pos Anggaran
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Atur pos pengeluaran bulanan dan sesuaikan dengan patokan gaji Anda
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Salary Overview & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card Gaji Default */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-500">
              Patokan Gaji Default
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">
              Rp
            </span>
            <input
              type="text"
              value={gajiDefaultStr}
              onChange={(e) => {
                const num = parseRupiahInput(e.target.value);
                setGajiDefaultStr(num.toLocaleString("id-ID"));
              }}
              className="w-full pl-11 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white"
            />
          </div>
          <span className="text-[11px] text-slate-400 block">
            Nominal default saat mencatat gaji bulanan baru
          </span>
        </div>

        {/* Card Total Alokasi */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500">
            Total Alokasi Anggaran
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {formatRupiah(totalAlokasi)}
          </p>
          <span className="text-xs text-slate-400">
            {anggaranList.length} pos terdaftar
          </span>
        </div>

        {/* Card Selisih / Warning */}
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-1 ${
            isOverAllocated
              ? "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
              : "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase">
              {isOverAllocated ? "Over-Alokasi!" : "Sisa Belum Dialokasikan"}
            </span>
            {isOverAllocated && (
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            )}
          </div>
          <p className="text-2xl font-bold">
            {formatRupiah(Math.abs(selisih))}
          </p>
          <span className="text-xs opacity-90 block">
            {isOverAllocated
              ? "Total jatah pos melebihi nilai gaji default!"
              : "Anggaran seimbang dengan gaji"}
          </span>
        </div>
      </div>

      {/* List of Pos Anggaran */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Daftar Pos Anggaran
            </h2>
            <span className="text-xs text-slate-400">
              Sesuaikan nominal jatah bulanan untuk masing-masing pos
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs text-slate-400 mt-2">Memuat anggaran...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Rows */}
            <div className="space-y-3">
              {anggaranList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                      Nama Pos
                    </label>
                    <input
                      type="text"
                      value={item.pos}
                      onChange={(e) =>
                        handleUpdateItem(idx, "pos", e.target.value)
                      }
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="w-full sm:w-1/3">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                      Jatah Bulanan (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={Number(item.jatah_bulanan).toLocaleString(
                          "id-ID"
                        )}
                        onChange={(e) => {
                          const num = parseRupiahInput(e.target.value);
                          handleUpdateItem(idx, "jatah_bulanan", num);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center pt-1 sm:pt-4">
                    <span className="text-xs text-slate-400">
                      ~{formatRupiah(Math.round(item.jatah_bulanan / 30))}/hr
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemovePos(idx)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Hapus Pos"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Pos Section */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Tambah Pos Baru
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  placeholder="Nama pos (misal: Hiburan, Laundry)"
                  value={newPosName}
                  onChange={(e) => setNewPosName(e.target.value)}
                  className="w-full sm:w-1/2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm"
                />

                <div className="w-full sm:w-1/3 relative">
                  <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    placeholder="Nominal alokasi"
                    value={newPosBudgetStr}
                    onChange={(e) => {
                      const num = parseRupiahInput(e.target.value);
                      setNewPosBudgetStr(
                        num ? num.toLocaleString("id-ID") : ""
                      );
                    }}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-semibold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddPos}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-2xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan ke Google Sheets...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Anggaran</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
