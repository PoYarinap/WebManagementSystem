"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  ArrowDownLeft,
  PieChart,
  History,
  Users,
  LogOut,
  Wallet,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { ConfirmDialog } from "./ConfirmDialog";

const NAV_ITEMS = [
  { label: "Dasbor", href: "/", icon: LayoutDashboard },
  { label: "Transaksi", href: "/transaksi", icon: Receipt },
  { label: "Pemasukan", href: "/pemasukan", icon: ArrowDownLeft },
  { label: "Anggaran", href: "/anggaran", icon: PieChart },
  { label: "Riwayat", href: "/riwayat", icon: History },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    nama: string;
    username: string;
    role: "admin" | "user";
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.authenticated && json?.user) {
          setCurrentUser(json.user);
        }
      })
      .catch(() => {});
  }, []);

  const navItems =
    currentUser?.role === "admin"
      ? [...NAV_ITEMS, { label: "Kelola Akun", href: "/akun", icon: Users }]
      : NAV_ITEMS;

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    setLoggingOut(true);
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* ==================================================== */}
      {/* DESKTOP SIDEBAR (hidden on mobile, visible on md+) */}
      {/* ==================================================== */}
      <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800/80 z-30">
        {/* Brand */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/60">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
              Rencana Gaji
            </h1>
            <span className="text-xs text-slate-400 font-medium block truncate max-w-[140px]">
              {currentUser ? `${currentUser.nama} (@${currentUser.username})` : "Keuangan Pribadi"}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : ""}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
            <span className="text-xs text-slate-500 font-medium">Tema Tampilan</span>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            {loggingOut ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <LogOut className="w-5 h-5" />
            )}
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* MOBILE TOP BAR (visible on mobile only) */}
      {/* ==================================================== */}
      <header className="md:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-900 dark:text-white">
            Rencana Gaji
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 p-4 shadow-xl space-y-1 animate-in slide-in-from-top duration-200">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="w-5 h-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (fixed at bottom) */}
      {/* ==================================================== */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 z-30 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 font-semibold scale-105"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
        {/* 5th item: Riwayat */}
        <Link
          href="/riwayat"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            pathname.startsWith("/riwayat")
              ? "text-blue-600 dark:text-blue-400 font-semibold scale-105"
              : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Riwayat</span>
        </Link>
      </nav>

      {/* Modal Dialog Konfirmasi Logout */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Konfirmasi Keluar (Logout)"
        message="Apakah Anda yakin ingin keluar dari sesi aplikasi Rencana Gaji?"
        confirmLabel="Ya, Keluar"
        cancelLabel="Batal"
        variant="warning"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </>
  );
}
