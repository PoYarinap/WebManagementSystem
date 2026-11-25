export type UserRole = "admin" | "user";

export interface AppUser {
  id: string;
  username: string;
  nama: string;
  password_hash: string;
  role: UserRole;
  aktif: boolean;
  dibuat_pada: string;
}

export interface PublicUser {
  id: string;
  username: string;
  nama: string;
  role: UserRole;
  aktif: boolean;
  dibuat_pada: string;
}

export interface Pemasukan {
  id: string;
  tanggal: string; // YYYY-MM-DD
  periode: string; // YYYY-MM
  jumlah: number;
  keterangan: string;
  user_id?: string;
}

export interface Pengeluaran {
  id: string;
  tanggal: string; // YYYY-MM-DD
  periode: string; // YYYY-MM
  pos: string;
  keterangan: string;
  jumlah: number;
  dibuat_pada: string; // ISO timestamp
  user_id?: string;
}

export interface Anggaran {
  pos: string;
  jatah_bulanan: number;
  jatah_harian_opsional?: number;
  user_id?: string;
}

export interface Pengaturan {
  gaji_default?: number;
  tanggal_gajian?: number;
  [key: string]: any;
}

export interface PosProgress {
  pos: string;
  jatah_bulanan: number;
  terpakai: number;
  sisa: number;
  persen: number;
  status: "aman" | "waspada" | "melebihi"; // green (<70%), yellow (70-99%), red (>=100%)
  jatah_harian: number;
}

export interface WarningItem {
  id: string;
  type: "danger" | "warning" | "info";
  title: string;
  pesan: string;
}

export interface DailyExpenseTrend {
  tanggal: string; // YYYY-MM-DD
  hari: number; // 1-31
  formattedTanggal: string;
  total: number;
}

export interface MonthHistorySummary {
  periode: string;
  namaBulan: string;
  totalPemasukan: number;
  totalPengeluaran: number;
  sisaSaldo: number;
  posTerboros: {
    pos: string;
    total: number;
  } | null;
}

export interface DashboardData {
  periode: string;
  hasPemasukan: boolean;
  totalPemasukan: number;
  totalPengeluaran: number;
  sisaSaldo: number;
  makanHariIni: {
    jatahHarian: number;
    terpakaiHariIni: number;
    sisaHariIni: number;
  };
  posProgressList: PosProgress[];
  topPengeluaran: Pengeluaran[];
  warnings: WarningItem[];
  dailyTrends: DailyExpenseTrend[];
  transaksiTerbaru: Pengeluaran[];
  daftarPemasukan: Pemasukan[];
  sisaBulanLalu: number;
  periodeLalu: string;
  pengaturan: Pengaturan;
}
