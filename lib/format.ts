/**
 * Utilities for formatting numbers, currency, and dates in Indonesian locale (Asia/Jakarta)
 */

export function formatRupiah(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : Math.round(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount).replace(/\s+/g, "");
}

export function parseRupiahInput(value: string): number {
  const clean = value.replace(/[^0-9]/g, "");
  return clean ? parseInt(clean, 10) : 0;
}

// Format Date string (YYYY-MM-DD) into Indonesian formatted date (e.g. 21 Nov 2026)
export function formatTanggal(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date);
  } catch {
    return dateStr;
  }
}

// Get today's date in Asia/Jakarta in YYYY-MM-DD
export function getTodayJakarta(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date()); // outputs YYYY-MM-DD
}

// Get current period in Asia/Jakarta in YYYY-MM
export function getCurrentPeriodeJakarta(): string {
  const today = getTodayJakarta();
  return today.substring(0, 7);
}

// Format period YYYY-MM into "November 2026"
export function formatPeriode(periode: string): string {
  if (!periode || !periode.includes("-")) return periode || "-";
  const [yearStr, monthStr] = periode.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  if (isNaN(year) || isNaN(month)) return periode;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

// Get total days in a month for a given period YYYY-MM
export function getDaysInPeriod(periode: string): number {
  if (!periode || !periode.includes("-")) return 30;
  const [yearStr, monthStr] = periode.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return new Date(year, month, 0).getDate();
}

// Get the current day number (1-31) in Asia/Jakarta
export function getCurrentDayJakarta(): number {
  const today = getTodayJakarta();
  const parts = today.split("-");
  return parseInt(parts[2], 10);
}
