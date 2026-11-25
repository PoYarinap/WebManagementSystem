'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Wallet,
    Lock,
    User,
    Eye,
    EyeOff,
    ArrowRight,
    Loader2,
    ShieldCheck,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

function LoginForm() {
    const [username, setUsername] = useState('admin')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const redirect = searchParams.get('redirect') || '/'

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username.trim() || !password) {
            setError('Masukkan username dan password terlebih dahulu.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Username atau password salah, coba lagi.')
            }

            router.push(redirect)
            router.refresh()
        } catch (err: any) {
            setError(
                err.message || 'Gagal masuk. Periksa username, password, dan konfigurasi.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-6 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="w-5 h-5 text-blue-500" />
                <h2 className="text-base font-semibold">Masuk ke Akun Anda</h2>
            </div>

            {error && (
                <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                    <span className="font-medium text-xs leading-5">
                        ⚠️ {error}
                    </span>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label
                        htmlFor="username"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
                    >
                        Username
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                            <User className="w-4 h-4" />
                        </div>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Contoh: admin atau nama akun..."
                            autoComplete="username"
                            required
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label
                        htmlFor="password"
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider"
                    >
                        Password
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                            <Lock className="w-4 h-4" />
                        </div>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Masukkan password..."
                            autoFocus
                            required
                            className="w-full pl-10 pr-11 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="w-4 h-4" />
                            ) : (
                                <Eye className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-2xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed group mt-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Memeriksa...</span>
                        </>
                    ) : (
                        <>
                            <span>Buka Dasbor</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 sm:p-6 bg-gradient-to-b from-blue-50/50 via-slate-50 to-slate-100 dark:from-[#080d1a] dark:via-[#0b1021] dark:to-[#070b16]">
            {/* Top right theme switch */}
            <div className="fixed top-4 right-4 z-10">
                <ThemeToggle />
            </div>

            <div className="w-full max-w-sm">
                {/* Brand Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
                        <Wallet className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        Rencana Gaji
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pencatat gaji & pengeluaran harian simpel
                    </p>
                </div>

                <Suspense
                    fallback={
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center text-sm text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                            <span>Memuat halaman login...</span>
                        </div>
                    }
                >
                    <LoginForm />
                </Suspense>
            </div>
        </div>
    )
}
