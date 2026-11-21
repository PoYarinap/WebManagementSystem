"use client";

import { Navbar } from "@/components/Navbar";
import { QuickExpenseModal } from "@/components/QuickExpenseModal";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19]">
      {/* Navigation (Sidebar desktop + Topbar/Bottombar mobile) */}
      <Navbar />

      {/* Main Content Area */}
      <main className="md:pl-64 min-h-screen pb-28 md:pb-12 transition-all">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Floating Action Button for Quick Expense */}
      <QuickExpenseModal />
    </div>
  );
}
