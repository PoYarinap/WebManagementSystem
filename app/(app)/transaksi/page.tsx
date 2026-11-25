"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Receipt,
  Search,
  Filter,
  ArrowUpDown,
  Trash2,
  Edit2,
  X,
  Loader2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  formatRupiah,
  formatTanggal,
  getCurrentPeriodeJakarta,
  parseRupiahInput,
} from "@/lib/format";
import { Anggaran, Pengeluaran } from "@/lib/types";
import { PeriodSelector } from "@/components/PeriodSelector";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ModalPortal } from "@/components/ModalPortal";

export default function TransaksiPage() {
  const [periode, setPeriode] = useState(getCurrentPeriodeJakarta());
  const [pengeluaranList, setPengeluaranList] = useState<Pengeluaran[]>([]);
  const [anggaranList, setAnggaranList] = useState<Anggaran[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & sorting
  const [selectedPos, setSelectedPos] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Edit states
  const [editingItem, setEditingItem] = useState<Pengeluaran | null>(null);
  const [editTanggal, setEditTanggal] = useState("");
  const [editPos, setEditPos] = useState("");
  const [editKeterangan, setEditKeterangan] = useState("");
  const [editJumlahStr, setEditJumlahStr] = useState("");
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete confirm dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; keterangan: string } | null>(null);

  const fetchData = useCallback(async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const [resPengeluaran, resAnggaran] = await Promise.all([
        fetch(`/api/pengeluaran?periode=${selectedPeriod}`),
        fetch("/api/anggaran"),
      ]);

      if (resPengeluaran.ok) {
        const json = await resPengeluaran.json();
        setPengeluaranList(json.data || []);
      }

      if (resAnggaran.ok) {
        const json = await resAnggaran.json();
        setAnggaranList(json.anggaran || []);
      }
    } catch (e) {
      console.error("Gagal memuat transaksi:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periode);
  }, [periode, fetchData]);

  // Listen to global event
  useEffect(() => {
    const handleRefresh = () => fetchData(periode);
    window.addEventListener("refresh-data", handleRefresh);
    return () => window.removeEventListener("refresh-data", handleRefresh);
  }, [periode, fetchData]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    let result = [...pengeluaranList];

    if (selectedPos !== "all") {
      result = result.filter(
        (p) => p.pos.toLowerCase() === selectedPos.toLowerCase()
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.keterangan.toLowerCase().includes(q) ||
          p.pos.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      const cmp = a.tanggal.localeCompare(b.tanggal);
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return result;
  }, [pengeluaranList, selectedPos, searchQuery, sortOrder]);

  const totalFiltered = useMemo(() => {
    return filteredTransactions.reduce((sum, item) => sum + item.jumlah, 0);
  }, [filteredTransactions]);

  const handleStartEdit = (item: Pengeluaran) => {
    setEditingItem(item);
    setEditTanggal(item.tanggal);
    setEditPos(item.pos);
    setEditKeterangan(item.keterangan);
    setEditJumlahStr(item.jumlah.toLocaleString("id-ID"));
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const amount = parseRupiahInput(editJumlahStr);
    if (amount <= 0) {
      alert("Jumlah pengeluaran harus lebih dari 0.");
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch("/api/pengeluaran", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          tanggal: editTanggal,
          pos: editPos,
          keterangan: editKeterangan,
          jumlah: amount,
          periode: editTanggal.substring(0, 7),
        }),
      });

      if (!res.ok) throw new Error("Gagal memperbarui pengeluaran.");

      setEditingItem(null);
      await fetchData(periode);
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (e: any) {
      alert(e.message || "Gagal memperbarui transaksi.");
    } finally {
      setSubmittingEdit(false);
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
      const res = await fetch(`/api/pengeluaran?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Gagal menghapus.");
      await fetchData(periode);
      window.dispatchEvent(new CustomEvent("refresh-data"));
    } catch (e: any) {
      alert(e.message || "Gagal menghapus transaksi.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Period */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Riwayat Transaksi
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Daftar seluruh pengeluaran untuk periode terpilih
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <PeriodSelector
            currentPeriod={periode}
            onChangePeriod={(newP) => setPeriode(newP)}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari transaksi atau pos..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Pos Filter Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Semua Pos Anggaran</option>
              {anggaranList.map((a) => (
                <option key={a.pos} value={a.pos}>
                  {a.pos}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Toggle */}
          <div className="sm:col-span-3">
            <button
              onClick={() =>
                setSortOrder(sortOrder === "desc" ? "asc" : "desc")
              }
              className="w-full py-2 px-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortOrder === "desc" ? "Terbaru" : "Terlama"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Container */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header Summary */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs sm:text-sm">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Ditemukan {filteredTransactions.length} transaksi
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            Total: {formatRupiah(totalFiltered)}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
            <p className="text-xs text-slate-400 mt-2">Memuat transaksi...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada transaksi yang cocok dengan filter atau pencarian.
          </div>
        ) : (
          <>
            {/* Desktop Table View (hidden on mobile, visible on md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Pos</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Nominal</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTransactions.map((trx) => (
                    <tr
                      key={trx.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatTanggal(trx.tanggal)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {trx.pos}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200">
                        {trx.keterangan || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        -{formatRupiah(trx.jumlah)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(trx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(trx.id, trx.keterangan)
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (visible on mobile, hidden on md+) */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTransactions.map((trx) => (
                <div
                  key={trx.id}
                  className="p-4 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      {trx.pos}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      -{formatRupiah(trx.jumlah)}
                    </span>
                  </div>

                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {trx.keterangan || trx.pos}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                    <span>{formatTanggal(trx.tanggal)}</span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(trx)}
                        className="px-2 py-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold text-xs flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(trx.id, trx.keterangan)}
                        className="px-2 py-1 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bottom Total Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
            Total Sesuai Filter
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {formatRupiah(totalFiltered)}
          </span>
        </div>
      </div>

      {/* Edit Modal */}
      <ModalPortal isOpen={!!editingItem} onClose={() => setEditingItem(null)}>
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Transaksi Pengeluaran
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
                  onChange={(e) => {
                    const num = parseRupiahInput(e.target.value);
                    setEditJumlahStr(num.toLocaleString("id-ID"));
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-base font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Pos Anggaran
                </label>
                <select
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium text-slate-900 dark:text-white"
                >
                  {anggaranList.map((a) => (
                    <option key={a.pos} value={a.pos}>
                      {a.pos}
                    </option>
                  ))}
                </select>
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
                disabled={submittingEdit}
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
        title="Hapus Transaksi Pengeluaran"
        message={`Apakah Anda yakin ingin menghapus pengeluaran "${deleteConfirm?.keterangan || "ini"}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Transaksi"
        cancelLabel="Batal"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
