'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
    Users,
    UserPlus,
    Shield,
    User as UserIcon,
    Pencil,
    Trash2,
    Power,
    Loader2,
    CheckCircle,
    AlertTriangle,
    Eye,
    EyeOff,
    X,
    ArrowLeft,
} from 'lucide-react'
import { PublicUser } from '@/lib/types'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ModalPortal } from '@/components/ModalPortal'

export default function KelolaAkunPage() {
    const [users, setUsers] = useState<PublicUser[]>([])
    const [loading, setLoading] = useState(true)
    const [forbidden, setForbidden] = useState(false)
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error'
        message: string
    } | null>(null)

    // Add form state
    const [nama, setNama] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showAddPass, setShowAddPass] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Edit modal state
    const [editingUser, setEditingUser] = useState<PublicUser | null>(null)
    const [editNama, setEditNama] = useState('')
    const [editPassword, setEditPassword] = useState('')
    const [showEditPass, setShowEditPass] = useState(false)

    // Delete confirm dialog
    const [deleteTarget, setDeleteTarget] = useState<PublicUser | null>(null)

    const loadUsers = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/users')
            if (res.status === 403) {
                setForbidden(true)
                return
            }
            if (res.ok) {
                const json = await res.json()
                setUsers(json.data || [])
            }
        } catch (e) {
            console.error('Gagal memuat daftar akun:', e)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadUsers()
    }, [loadUsers])

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setFeedback(null)

        if (!username.trim() || !password) {
            setFeedback({
                type: 'error',
                message: 'Username dan password wajib diisi.',
            })
            return
        }

        setSubmitting(true)
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nama: nama.trim() || username.trim(),
                    username: username.trim(),
                    password,
                    role: 'user',
                }),
            })
            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Gagal menambahkan akun.')
            }

            setNama('')
            setUsername('')
            setPassword('')
            setFeedback({
                type: 'success',
                message: `Akun "${json.data.username}" berhasil dibuat! Teman Anda sudah bisa login.`,
            })
            await loadUsers()
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err.message || 'Gagal membuat akun baru.',
            })
        } finally {
            setSubmitting(false)
        }
    }

    const handleToggleAktif = async (user: PublicUser) => {
        setFeedback(null)
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: user.id,
                    aktif: !user.aktif,
                }),
            })
            if (!res.ok) {
                const json = await res.json()
                throw new Error(json.error || 'Gagal mengubah status akun.')
            }
            setFeedback({
                type: 'success',
                message: `Akun "${user.username}" sekarang ${
                    !user.aktif ? 'Aktif' : 'Dinonaktifkan'
                }.`,
            })
            await loadUsers()
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err.message || 'Gagal memperbarui status.',
            })
        }
    }

    const openEditModal = (user: PublicUser) => {
        setEditingUser(user)
        setEditNama(user.nama)
        setEditPassword('')
        setShowEditPass(false)
    }

    const handleSaveEdit = async () => {
        if (!editingUser) return
        setFeedback(null)
        setSubmitting(true)
        try {
            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingUser.id,
                    nama: editNama.trim() || editingUser.username,
                    password: editPassword || undefined,
                }),
            })
            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Gagal menyimpan perubahan.')
            }
            setEditingUser(null)
            setFeedback({
                type: 'success',
                message: `Data akun "${editingUser.username}" berhasil diperbarui.`,
            })
            await loadUsers()
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err.message || 'Gagal memperbarui akun.',
            })
        } finally {
            setSubmitting(false)
        }
    }

    const confirmDeleteUser = async () => {
        if (!deleteTarget) return
        const target = deleteTarget
        setDeleteTarget(null)
        setFeedback(null)

        try {
            const res = await fetch(
                `/api/users?id=${target.id}&deleteData=true`,
                {
                    method: 'DELETE',
                }
            )
            const json = await res.json()
            if (!res.ok) {
                throw new Error(json.error || 'Gagal menghapus akun.')
            }
            setFeedback({
                type: 'success',
                message: `Akun "${target.username}" beserta seluruh data transaksinya berhasil dihapus permanen.`,
            })
            await loadUsers()
        } catch (err: any) {
            setFeedback({
                type: 'error',
                message: err.message || 'Gagal menghapus akun.',
            })
        }
    }

    if (forbidden) {
        return (
            <div className="max-w-lg mx-auto mt-12 p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                    <Shield className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Akses Khusus Admin
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Halaman Kelola Akun hanya dapat diakses oleh Admin Utama.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Dasbor</span>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Kelola Akun Pengguna
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Buat akun untuk teman Anda — setiap akun punya data
                    pemasukan, pengeluaran, dan anggaran masing-masing
                </p>
            </div>

            {feedback && (
                <div
                    className={`p-4 rounded-2xl border flex items-center gap-3 text-sm animate-in fade-in duration-200 ${
                        feedback.type === 'success'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
                            : 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300'
                    }`}
                >
                    {feedback.type === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    )}
                    <span>{feedback.message}</span>
                </div>
            )}

            {/* Form Tambah Akun Baru */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                            Tambah Akun Teman
                        </h2>
                        <p className="text-xs text-slate-400">
                            Akun baru otomatis mendapat 6 pos anggaran standar
                            untuk memulai
                        </p>
                    </div>
                </div>

                <form
                    onSubmit={handleCreateUser}
                    className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1"
                >
                    <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                            Nama Lengkap
                        </label>
                        <input
                            type="text"
                            placeholder="Budi"
                            value={nama}
                            onChange={(e) => setNama(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                            Username Login
                        </label>
                        <input
                            type="text"
                            placeholder="budi"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showAddPass ? 'text' : 'password'}
                                placeholder="Min. 8 karakter"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowAddPass(!showAddPass)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                tabIndex={-1}
                            >
                                {showAddPass ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserPlus className="w-4 h-4" />
                            )}
                            <span>Buat Akun</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Daftar Akun Terdaftar */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        <h2 className="font-bold text-base text-slate-900 dark:text-white">
                            Daftar Akun Terdaftar ({users.length})
                        </h2>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" />
                        <p className="text-xs text-slate-400 mt-2">
                            Memuat daftar akun...
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users.map((u) => {
                            const isMainAdmin = u.id === 'admin'
                            return (
                                <div
                                    key={u.id}
                                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3.5">
                                        <div
                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                                u.role === 'admin'
                                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                            }`}
                                        >
                                            {u.role === 'admin' ? (
                                                <Shield className="w-5 h-5" />
                                            ) : (
                                                <UserIcon className="w-5 h-5" />
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                    {u.nama}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                        u.role === 'admin'
                                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}
                                                >
                                                    {u.role === 'admin'
                                                        ? 'Admin'
                                                        : 'Pengguna'}
                                                </span>
                                                <span
                                                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                        u.aktif
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                                                    }`}
                                                >
                                                    {u.aktif
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Username:{' '}
                                                <span className="font-mono text-slate-600 dark:text-slate-300">
                                                    @{u.username}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 self-end sm:self-center">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(u)}
                                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-blue-200/60 dark:border-blue-800/60"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                            <span>Edit / Sandi</span>
                                        </button>

                                        {!isMainAdmin && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleToggleAktif(u)
                                                    }
                                                    className={`px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors border ${
                                                        u.aktif
                                                            ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/70 dark:border-amber-800/60'
                                                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
                                                    }`}
                                                    title={
                                                        u.aktif
                                                            ? 'Nonaktifkan (data tetap aman)'
                                                            : 'Aktifkan kembali'
                                                    }
                                                >
                                                    <Power className="w-3.5 h-3.5" />
                                                    <span>
                                                        {u.aktif
                                                            ? 'Nonaktifkan'
                                                            : 'Aktifkan'}
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteTarget(u)
                                                    }
                                                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Hapus Permanen Beserta Datanya"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Modal Edit / Reset Password */}
            <ModalPortal
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
            >
                {editingUser && (
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                                Edit Akun: @{editingUser.username}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                                    Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={editNama}
                                    onChange={(e) =>
                                        setEditNama(e.target.value)
                                    }
                                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                                    Password Baru (Opsional)
                                </label>
                                <div className="relative">
                                    <input
                                        type={
                                            showEditPass ? 'text' : 'password'
                                        }
                                        placeholder="Kosongkan jika tidak ingin ganti sandi"
                                        value={editPassword}
                                        onChange={(e) =>
                                            setEditPassword(e.target.value)
                                        }
                                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowEditPass(!showEditPass)
                                        }
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        {showEditPass ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
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
                )}
            </ModalPortal>

            {/* Modal Konfirmasi Hapus Permanen Akun + Datanya */}
            <ConfirmDialog
                isOpen={deleteTarget !== null}
                title="Hapus Akun Permanen"
                message={`Hapus akun "${deleteTarget?.nama || ''} (@${deleteTarget?.username || ''})" BESERTA seluruh data pemasukan, pengeluaran, dan anggarannya? Jika hanya ingin memblokir login tanpa menghapus data, gunakan tombol "Nonaktifkan".`}
                confirmLabel="Ya, Hapus Permanen"
                cancelLabel="Batal"
                variant="danger"
                onConfirm={confirmDeleteUser}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    )
}
