"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowDownLeft,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Calendar,
  Wallet,
  Sparkles,
} from "lucide-react";
import {
  formatRupiah,
  formatTanggal,
  getCurrentPeriodeJakarta,
  getTodayJakarta,
  parseRupiahInput,
} from "@/lib/format";
import { Pemasukan } from "@/lib/types";
import { PeriodSelector } from "@/components/PeriodSelector";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModalPortal } from "@/components/ModalPortal";

export default function PemasukanPage() {
  const [periode, setPeriode] = useState(getCurrentPeriodeJakarta());
  const [pemasukanList, setPemasukanList] = useState<Pemasukan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [defaultGaji, setDefaultGaji] = useState(1400000);

  // Form states
  const [tanggal, setTanggal] = useState(getTodayJakarta());
  const [jumlahStr, setJumlahStr] = useState("1.400.000");
  const [keterangan, setKeterangan] = useState("Gaji Bulanan");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit states
  const [editingItem, setEditingItem] = useState<Pemasukan | null>(null);
  const [editTanggal, setEditTanggal] = useState("");
  const [editJumlahStr, setEditJumlahStr] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");

  // Delete confirm dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; keterangan: string } | null>(null);

  const fetchData = useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const [resPemasukan, resAnggaran] = await Promise.all([
        fetch(`/api/pemasukan?periode=${selectedPeriod}`),
        fetch("/api/anggaran"),
      ]);

      if (resPemasukan.ok) {
        const json = await resPemasukan.json();
        setPemasukanList(json.data || []);
      }

      if (resAnggaran.ok) {
        const json = await resAnggaran.json();
        if (json.pengaturan?.gaji_default) {
          setDefaultGaji(json.pengaturan.gaji_default);
          // Set default form amount if not yet touched
          setJumlahStr(Number(json.pengaturan.gaji_default).toLocaleString("id-ID"));
        }
      }
    } catch (e) {
      console.error("Gagal memuat pemasukan:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periode);
  }, [periode, fetchData]);

  const handleAmountChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const rawValue = e.target.value;
    const numeric = parseRupiahInput(rawValue);
    if (numeric === 0 && rawValue.replace(/[^0-9]/g, "") === "") {
      setter("");
    } else {
      setter(numeric.toLocaleString("id-ID"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseRupiahInput(jumlahStr);
    if (amount <= 0) {
      setErrorMsg("Masukkan jumlah pemasukan lebih dari 0.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/pemasukan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tanggal,
          jumlah: amount,
          keterangan: keterangan || "Gaji Bulanan",
          periode,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menyimpan pemasukan.");
      }

      // Success
      setKeterangan("Gaji Bulanan");
      await fetchData(periode);
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan pemasukan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (item: Pemasukan) => {
    setEditingItem(item);
    setEditTanggal(item.tanggal);
    setEditJumlahStr(item.jumlah.toLocaleString("id-ID"));
    setEditKeterangan(item.keterangan);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const amount = parseRupiahInput(editJumlahStr);
    if (amount <= 0) {
      alert("Jumlah pemasukan harus lebih dari 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/pemasukan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          tanggal: editTanggal,
          jumlah: amount,
          keterangan: editKeterangan,
          periode: editTanggal.substring(0, 7),
        }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui pemasukan.");

      setEditingItem(null);
      await fetchData(periode);
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (e: any) {
      alert(e.message || "Gagal memperbarui data.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string, ket: string) => {
    setDeleteConfirm({ id, keterangan: ket });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setDeleteConfirm(null);

    try {
      const res = await fetch(`/api/pemasukan?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus.");
      await fetchData(periode);
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (e: any) {
      alert(e.message || "Gagal menghapus pemasukan.");
    }
  };

  const totalPemasukanPeriode = pemasukanList.reduce(
    (sum, p) => sum + p.jumlah,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header & Month Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pemasukan & Gaji
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Catat gaji masuk untuk mengaktifkan dasbor periode ini
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <PeriodSelector
            currentPeriod={periode}
            onChangePeriod={(newP) => setPeriode(newP)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Catat Gaji Masuk */}
        <div className="lg:col-span-1 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Catat Gaji Masuk
              </h2>
              <span className="text-xs text-slate-400">Periode {periode}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          {/* Quick chip for default salary */}
          <div className="flex items-center justify-between p-2.5 bg-blue-50/60 dark:bg-slate-800/60 rounded-2xl border border-blue-100 dark:border-slate-800 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Gaji Default:
            </span>
            <button
              type="button"
              onClick={() =>
                setJumlahStr(defaultGaji.toLocaleString("id-ID"))
              }
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{formatRupiah(defaultGaji)} (Gunakan)</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Nominal Gaji / Uang Masuk
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={jumlahStr}
                  onChange={(e) => handleAmountChange(e, setJumlahStr)}
                  placeholder="0"
                  required
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Tanggal Masuk
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Keterangan
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Gaji Pokok, Bonus, Freelance"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-2xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Simpan Pemasukan</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Daftar Pemasukan Periode Ini */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                Total Pemasukan ({periode})
              </span>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatRupiah(totalPemasukanPeriode)}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Daftar Riwayat Pemasukan
              </h3>
              <span className="text-xs text-slate-400">
                {pemasukanList.length} entri
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                <p className="text-xs text-slate-400 mt-2">Memuat pemasukan...</p>
              </div>
            ) : pemasukanList.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                Belum ada pemasukan yang dicatat untuk periode {periode}.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {pemasukanList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <ArrowDownLeft className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.keterangan || "Gaji Masuk"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatTanggal(item.tanggal)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatRupiah(item.jumlah)}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(item.id, item.keterangan)
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ModalPortal isOpen={!!editingItem} onClose={() => setEditingItem(null)}>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Pemasukan
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  type="text"
                  value={editJumlahStr}
                  onChange={(e) => handleAmountChange(e, setEditJumlahStr)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2.5 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-sm"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-md shadow-blue-500/20"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
      </ModalPortal>
      {/* Modal Dialog Konfirmasi Hapus yang Elegan */}
      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="Hapus Entri Pemasukan"
        message={`Apakah Anda yakin ingin menghapus pemasukan "${deleteConfirm?.keterangan || "ini"}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Pemasukan"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
