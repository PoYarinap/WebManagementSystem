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
  Pencil,
  X,
  Sparkles,
} from "lucide-react";
import { formatRupiah, parseRupiahInput } from "@/lib/format";
import { Anggaran, Pengaturan } from "@/lib/types";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModalPortal } from "@/components/ModalPortal";

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

  // Modal Edit Pos
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPosName, setEditPosName] = useState("");
  const [editBulananStr, setEditBulananStr] = useState("");
  const [editHarianStr, setEditHarianStr] = useState("");

  // Delete confirm dialog
  const [posToDeleteIndex, setPosToDeleteIndex] = useState<number | null>(null);

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
    if (field === "jatah_harian_opsional" && value > 0) {
      // Auto-hitung bulanan dari harian × 30
      next[index] = { ...next[index], jatah_harian_opsional: value, jatah_bulanan: value * 30 };
    } else if (field === "jatah_bulanan") {
      // Auto-hitung harian dari bulanan / 30
      const harian = Math.round(value / 30);
      next[index] = { ...next[index], jatah_bulanan: value, jatah_harian_opsional: harian };
    } else {
      next[index] = { ...next[index], [field]: value };
    }
    setAnggaranList(next);
  };

  const handleRemovePos = (index: number) => {
    setPosToDeleteIndex(index);
  };

  const confirmRemovePos = () => {
    if (posToDeleteIndex === null) return;
    const next = anggaranList.filter((_, i) => i !== posToDeleteIndex);
    setAnggaranList(next);
    setPosToDeleteIndex(null);
  };

  const openEditModal = (index: number) => {
    const item = anggaranList[index];
    setEditingIndex(index);
    setEditPosName(item.pos);
    setEditBulananStr(Number(item.jatah_bulanan || 0).toLocaleString("id-ID"));
    const harian =
      item.jatah_harian_opsional && item.jatah_harian_opsional > 0
        ? item.jatah_harian_opsional
        : Math.round((item.jatah_bulanan || 0) / 30);
    setEditHarianStr(Number(harian).toLocaleString("id-ID"));
  };

  const handleEditHarianChange = (valStr: string) => {
    const harianNum = parseRupiahInput(valStr);
    setEditHarianStr(harianNum ? harianNum.toLocaleString("id-ID") : "");
    // Otomatis hitung bulanan = harian * 30
    const bulananNum = harianNum * 30;
    setEditBulananStr(bulananNum ? bulananNum.toLocaleString("id-ID") : "");
  };

  const handleEditBulananChange = (valStr: string) => {
    const bulananNum = parseRupiahInput(valStr);
    setEditBulananStr(bulananNum ? bulananNum.toLocaleString("id-ID") : "");
    // Otomatis hitung harian = bulanan / 30
    const harianNum = Math.round(bulananNum / 30);
    setEditHarianStr(harianNum ? harianNum.toLocaleString("id-ID") : "");
  };

  const handleSaveModalEdit = () => {
    if (editingIndex === null) return;
    if (!editPosName.trim()) {
      alert("Nama pos tidak boleh kosong.");
      return;
    }
    const bulananNum = parseRupiahInput(editBulananStr);
    const harianNum = parseRupiahInput(editHarianStr);

    const next = [...anggaranList];
    next[editingIndex] = {
      pos: editPosName.trim(),
      jatah_bulanan: bulananNum,
      jatah_harian_opsional: harianNum,
    };
    setAnggaranList(next);
    setEditingIndex(null);
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

                  <div className="w-full sm:w-1/4">
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

                  <div className="w-full sm:w-1/5">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                      Jatah Harian (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={
                          item.jatah_harian_opsional && item.jatah_harian_opsional > 0
                            ? Number(item.jatah_harian_opsional).toLocaleString("id-ID")
                            : ""
                        }
                        placeholder={Number(Math.round(item.jatah_bulanan / 30)).toLocaleString("id-ID")}
                        onChange={(e) => {
                          const num = parseRupiahInput(e.target.value);
                          handleUpdateItem(idx, "jatah_harian_opsional", num);
                        }}
                        className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-white placeholder:font-normal placeholder:text-slate-300 dark:placeholder:text-slate-600"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">Kosongkan = otomatis dari bulanan</span>
                  </div>

                  <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-2 self-end sm:self-center pt-1 sm:pt-4">
                    <span className="text-xs text-slate-400 mr-1">
                      ~{formatRupiah(
                        item.jatah_harian_opsional && item.jatah_harian_opsional > 0
                          ? item.jatah_harian_opsional
                          : Math.round(item.jatah_bulanan / 30)
                      )}/hr
                    </span>

                    {/* Tombol Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(idx)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-blue-200/60 dark:border-blue-800/60 shadow-sm"
                      title="Edit Pos Anggaran Ini"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemovePos(idx)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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

      {/* Modal Popup Edit Pos Anggaran */}
      <ModalPortal isOpen={editingIndex !== null} onClose={() => setEditingIndex(null)}>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Edit Pos: {editPosName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Otomatis sinkron antara jatah harian & bulanan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nama Pos */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Nama Pos
                </label>
                <input
                  type="text"
                  value={editPosName}
                  onChange={(e) => setEditPosName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {/* Jatah Harian (Per Hari) */}
              <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-900 dark:text-blue-300">
                    Jatah Harian (1 Hari)
                  </label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                    Ketik ini untuk otomatis hitung 1 bulan ⚡
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-blue-500">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={editHarianStr}
                    placeholder="Contoh: 30.000"
                    onChange={(e) => handleEditHarianChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-xl text-base font-bold text-blue-600 dark:text-blue-400"
                  />
                </div>
              </div>

              {/* Jatah Bulanan (1 Bulan = 30 Hari) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Total Jatah 1 Bulan (30 Hari)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Otomatis dihitung
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={editBulananStr}
                    placeholder="Contoh: 900.000"
                    onChange={(e) => handleEditBulananChange(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons khusus pos seperti Makan/Bensin */}
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Preset Cepat Harian:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[20000, 25000, 30000, 35000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => handleEditHarianChange(nominal.toString())}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-blue-900/40 text-slate-700 dark:text-slate-300 hover:text-blue-600 text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      {nominal / 1000}rb/hr
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tombol Simpan Modal */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingIndex(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModalEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25 transition-all"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
      </ModalPortal>

      {/* Modal Dialog Konfirmasi Hapus Pos Anggaran */}
      <ConfirmDialog
        isOpen={posToDeleteIndex !== null}
        title="Hapus Pos Anggaran"
        message={`Apakah Anda yakin ingin menghapus pos "${posToDeleteIndex !== null ? anggaranList[posToDeleteIndex]?.pos : ""}"? Pos ini akan dihilangkan dari alokasi anggaran bulanan.`}
        confirmLabel="Ya, Hapus Pos"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={confirmRemovePos}
        onCancel={() => setPosToDeleteIndex(null)}
      />
    </div>
  );
}
