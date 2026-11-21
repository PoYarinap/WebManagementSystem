import { google, sheets_v4 } from "googleapis";
import { Anggaran, Pemasukan, Pengeluaran, Pengaturan } from "./types";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_NAMES = {
  PEMASUKAN: "Pemasukan",
  PENGELUARAN: "Pengeluaran",
  ANGGARAN: "Anggaran",
  PENGATURAN: "Pengaturan",
};

const HEADERS = {
  [SHEET_NAMES.PEMASUKAN]: ["id", "tanggal", "periode", "jumlah", "keterangan"],
  [SHEET_NAMES.PENGELUARAN]: ["id", "tanggal", "periode", "pos", "keterangan", "jumlah", "dibuat_pada"],
  [SHEET_NAMES.ANGGARAN]: ["pos", "jatah_bulanan", "jatah_harian_opsional"],
  [SHEET_NAMES.PENGATURAN]: ["key", "value"],
};

const INITIAL_ANGGARAN: Anggaran[] = [
  { pos: "Tabungan", jatah_bulanan: 150000, jatah_harian_opsional: 0 },
  { pos: "Makan", jatah_bulanan: 700000, jatah_harian_opsional: 0 },
  { pos: "Bensin", jatah_bulanan: 100000, jatah_harian_opsional: 0 },
  { pos: "Kebutuhan Pokok", jatah_bulanan: 150000, jatah_harian_opsional: 0 },
  { pos: "Dana Tak Terduga", jatah_bulanan: 200000, jatah_harian_opsional: 0 },
  { pos: "Jajan & Rokok", jatah_bulanan: 100000, jatah_harian_opsional: 0 },
];

const INITIAL_PENGATURAN: Record<string, any> = {
  gaji_default: 1400000,
  tanggal_gajian: 25,
};

// In-memory cache for efficiency (short TTL e.g. 5 seconds)
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const cache: Record<string, CacheEntry<any>> = {};
const CACHE_TTL_MS = 5000;

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }
  return null;
}

function setCached<T>(key: string, data: T): void {
  cache[key] = { data, timestamp: Date.now() };
}

export function invalidateCache(): void {
  for (const k of Object.keys(cache)) {
    delete cache[k];
  }
}

// Fallback in-memory storage if Google Sheet credentials are not yet configured
let mockPemasukan: Pemasukan[] = [];
let mockPengeluaran: Pengeluaran[] = [];
let mockAnggaran: Anggaran[] = [...INITIAL_ANGGARAN];
let mockPengaturan: Record<string, any> = { ...INITIAL_PENGATURAN };

export function isGoogleSheetsConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY &&
    process.env.GOOGLE_SHEET_ID
  );
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  // Handle literal or escaped newlines in environment variable
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Kredensial Service Account Google tidak lengkap di environment variables.");
  }

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  });
}

function getSheets(): sheets_v4.Sheets {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("GOOGLE_SHEET_ID belum dikonfigurasi di environment variables.");
  }
  return id;
}

/**
 * Ensures that the 4 required sheets exist with proper headers and initial seed data.
 */
let isInitialized = false;
export async function ensureSpreadsheetInitialized(): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    return;
  }
  if (isInitialized) return;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheetTitles = (meta.data.sheets || []).map(
      (s) => s.properties?.title || ""
    );

    const sheetsToCreate: string[] = [];
    for (const title of Object.values(SHEET_NAMES)) {
      if (!existingSheetTitles.includes(title)) {
        sheetsToCreate.push(title);
      }
    }

    if (sheetsToCreate.length > 0) {
      // Add missing sheets
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map((title) => ({
            addSheet: {
              properties: { title },
            },
          })),
        },
      });
    }

    // Now check headers and initial data for each sheet
    for (const [sheetTitle, headers] of Object.entries(HEADERS)) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetTitle}!A1:Z1`,
      });

      const currentHeader = res.data.values?.[0] || [];
      const needsHeader =
        currentHeader.length === 0 ||
        headers.some((h, i) => currentHeader[i] !== h);

      if (needsHeader) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${sheetTitle}!A1:${String.fromCharCode(64 + headers.length)}1`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [headers],
          },
        });
      }

      // Check if Anggaran needs initial seed
      if (sheetTitle === SHEET_NAMES.ANGGARAN) {
        const rowsRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetTitle}!A2:C`,
        });
        if (!rowsRes.data.values || rowsRes.data.values.length === 0) {
          const initialRows = INITIAL_ANGGARAN.map((a) => [
            a.pos,
            a.jatah_bulanan,
            a.jatah_harian_opsional || 0,
          ]);
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetTitle}!A2:C`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: initialRows },
          });
        }
      }

      // Check if Pengaturan needs initial seed
      if (sheetTitle === SHEET_NAMES.PENGATURAN) {
        const rowsRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetTitle}!A2:B`,
        });
        if (!rowsRes.data.values || rowsRes.data.values.length === 0) {
          const initialRows = Object.entries(INITIAL_PENGATURAN).map(
            ([key, val]) => [key, String(val)]
          );
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${sheetTitle}!A2:B`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: initialRows },
          });
        }
      }
    }

    isInitialized = true;
  } catch (err: any) {
    console.error("Gagal inisialisasi spreadsheet:", err?.message || err);
    throw err;
  }
}

// ==========================================
// PEMASUKAN
// ==========================================

export async function getPemasukanList(periode?: string): Promise<Pemasukan[]> {
  if (!isGoogleSheetsConfigured()) {
    let list = [...mockPemasukan];
    if (periode) {
      list = list.filter((item) => item.periode === periode);
    }
    return list;
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `pemasukan_${periode || "all"}`;
  const cached = getCached<Pemasukan[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A2:E`,
  });

  const rows = res.data.values || [];
  let list: Pemasukan[] = rows.map((row) => ({
    id: String(row[0] || ""),
    tanggal: String(row[1] || ""),
    periode: String(row[2] || ""),
    jumlah: parseInt(String(row[3] || "0").replace(/[^0-9]/g, ""), 10) || 0,
    keterangan: String(row[4] || ""),
  }));

  if (periode) {
    list = list.filter((item) => item.periode === periode);
  }

  setCached(cacheKey, list);
  return list;
}

export async function addPemasukan(
  data: Omit<Pemasukan, "id">
): Promise<Pemasukan> {
  const id = crypto.randomUUID();
  const newEntry: Pemasukan = { id, ...data };

  if (!isGoogleSheetsConfigured()) {
    mockPemasukan.push(newEntry);
    return newEntry;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          newEntry.id,
          newEntry.tanggal,
          newEntry.periode,
          newEntry.jumlah,
          newEntry.keterangan,
        ],
      ],
    },
  });

  invalidateCache();
  return newEntry;
}

export async function updatePemasukan(
  id: string,
  data: Partial<Pemasukan>
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const idx = mockPemasukan.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPemasukan[idx] = { ...mockPemasukan[idx], ...data };
      return true;
    }
    return false;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A2:E`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const actualRow = rowIndex + 2;
  const current = rows[rowIndex];
  const updatedRow = [
    id,
    data.tanggal ?? current[1],
    data.periode ?? current[2],
    data.jumlah ?? current[3],
    data.keterangan ?? current[4],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A${actualRow}:E${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  invalidateCache();
  return true;
}

export async function deletePemasukan(id: string): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const initialLen = mockPemasukan.length;
    mockPemasukan = mockPemasukan.filter((p) => p.id !== id);
    return mockPemasukan.length < initialLen;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_NAMES.PEMASUKAN
  );
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) return false;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A2:A`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const actualRowZeroIndex = rowIndex + 1; // 0-based index for deleteDimension

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: actualRowZeroIndex,
              endIndex: actualRowZeroIndex + 1,
            },
          },
        },
      ],
    },
  });

  invalidateCache();
  return true;
}

// ==========================================
// PENGELUARAN
// ==========================================

export async function getPengeluaranList(
  periode?: string
): Promise<Pengeluaran[]> {
  if (!isGoogleSheetsConfigured()) {
    let list = [...mockPengeluaran];
    if (periode) {
      list = list.filter((item) => item.periode === periode);
    }
    return list;
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `pengeluaran_${periode || "all"}`;
  const cached = getCached<Pengeluaran[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A2:G`,
  });

  const rows = res.data.values || [];
  let list: Pengeluaran[] = rows.map((row) => ({
    id: String(row[0] || ""),
    tanggal: String(row[1] || ""),
    periode: String(row[2] || ""),
    pos: String(row[3] || ""),
    keterangan: String(row[4] || ""),
    jumlah: parseInt(String(row[5] || "0").replace(/[^0-9]/g, ""), 10) || 0,
    dibuat_pada: String(row[6] || ""),
  }));

  if (periode) {
    list = list.filter((item) => item.periode === periode);
  }

  setCached(cacheKey, list);
  return list;
}

export async function addPengeluaran(
  data: Omit<Pengeluaran, "id" | "dibuat_pada">
): Promise<Pengeluaran> {
  const id = crypto.randomUUID();
  const dibuat_pada = new Date().toISOString();
  const newEntry: Pengeluaran = { id, dibuat_pada, ...data };

  if (!isGoogleSheetsConfigured()) {
    mockPengeluaran.push(newEntry);
    return newEntry;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          newEntry.id,
          newEntry.tanggal,
          newEntry.periode,
          newEntry.pos,
          newEntry.keterangan,
          newEntry.jumlah,
          newEntry.dibuat_pada,
        ],
      ],
    },
  });

  invalidateCache();
  return newEntry;
}

export async function updatePengeluaran(
  id: string,
  data: Partial<Pengeluaran>
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const idx = mockPengeluaran.findIndex((p) => p.id === id);
    if (idx !== -1) {
      mockPengeluaran[idx] = { ...mockPengeluaran[idx], ...data };
      return true;
    }
    return false;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A2:G`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const actualRow = rowIndex + 2;
  const current = rows[rowIndex];
  const updatedRow = [
    id,
    data.tanggal ?? current[1],
    data.periode ?? current[2],
    data.pos ?? current[3],
    data.keterangan ?? current[4],
    data.jumlah ?? current[5],
    current[6], // keep original dibuat_pada
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A${actualRow}:G${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  invalidateCache();
  return true;
}

export async function deletePengeluaran(id: string): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const initialLen = mockPengeluaran.length;
    mockPengeluaran = mockPengeluaran.filter((p) => p.id !== id);
    return mockPengeluaran.length < initialLen;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_NAMES.PENGELUARAN
  );
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined) return false;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A2:A`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const actualRowZeroIndex = rowIndex + 1;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: actualRowZeroIndex,
              endIndex: actualRowZeroIndex + 1,
            },
          },
        },
      ],
    },
  });

  invalidateCache();
  return true;
}

// ==========================================
// ANGGARAN
// ==========================================

export async function getAnggaranList(): Promise<Anggaran[]> {
  if (!isGoogleSheetsConfigured()) {
    return [...mockAnggaran];
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = "anggaran_list";
  const cached = getCached<Anggaran[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGARAN}!A2:C`,
  });

  const rows = res.data.values || [];
  const list: Anggaran[] = rows.map((row) => ({
    pos: String(row[0] || ""),
    jatah_bulanan:
      parseInt(String(row[1] || "0").replace(/[^0-9]/g, ""), 10) || 0,
    jatah_harian_opsional:
      parseInt(String(row[2] || "0").replace(/[^0-9]/g, ""), 10) || 0,
  }));

  setCached(cacheKey, list);
  return list;
}

export async function saveAnggaranList(list: Anggaran[]): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    mockAnggaran = [...list];
    return true;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Clear existing rows in Anggaran
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGARAN}!A2:C`,
  });

  if (list.length > 0) {
    const rows = list.map((a) => [
      a.pos,
      a.jatah_bulanan,
      a.jatah_harian_opsional || 0,
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.ANGGARAN}!A2:C${rows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: rows },
    });
  }

  invalidateCache();
  return true;
}

// ==========================================
// PENGATURAN
// ==========================================

export async function getPengaturan(): Promise<Pengaturan> {
  if (!isGoogleSheetsConfigured()) {
    return { ...mockPengaturan };
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = "pengaturan";
  const cached = getCached<Pengaturan>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGATURAN}!A2:B`,
  });

  const rows = res.data.values || [];
  const result: Record<string, any> = { ...INITIAL_PENGATURAN };
  for (const row of rows) {
    const key = String(row[0] || "");
    const val = String(row[1] || "");
    if (key) {
      const numVal = Number(val);
      result[key] = isNaN(numVal) ? val : numVal;
    }
  }

  setCached(cacheKey, result);
  return result;
}

export async function updatePengaturanItem(
  key: string,
  value: any
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    mockPengaturan[key] = value;
    return true;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGATURAN}!A2:B`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === key);

  if (rowIndex !== -1) {
    const actualRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.PENGATURAN}!B${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[String(value)]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.PENGATURAN}!A:B`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[key, String(value)]] },
    });
  }

  invalidateCache();
  return true;
}

// ==========================================
// BATCH / AGGREGATION HELPERS
// ==========================================

export async function getDashboardDataForPeriode(periode: string) {
  // Batch get all needed data for this period
  const [allPemasukan, allPengeluaran, anggaranList, pengaturan] =
    await Promise.all([
      getPemasukanList(),
      getPengeluaranList(),
      getAnggaranList(),
      getPengaturan(),
    ]);

  const pemasukanPeriode = allPemasukan.filter((p) => p.periode === periode);
  const pengeluaranPeriode = allPengeluaran.filter((p) => p.periode === periode);

  // Compute previous month periode YYYY-MM
  const [yearStr, monthStr] = periode.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }
  const periodeLalu = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const pemasukanLalu = allPemasukan.filter((p) => p.periode === periodeLalu);
  const pengeluaranLalu = allPengeluaran.filter((p) => p.periode === periodeLalu);

  const totalPemasukanLalu = pemasukanLalu.reduce((sum, p) => sum + p.jumlah, 0);
  const totalPengeluaranLalu = pengeluaranLalu.reduce(
    (sum, p) => sum + p.jumlah,
    0
  );
  const sisaBulanLalu = totalPemasukanLalu - totalPengeluaranLalu;

  return {
    periode,
    pemasukanPeriode,
    pengeluaranPeriode,
    anggaranList,
    pengaturan,
    sisaBulanLalu,
    periodeLalu,
    allPemasukan,
    allPengeluaran,
  };
}

export async function getAllDistinctPeriods(): Promise<string[]> {
  const [pemasukanList, pengeluaranList] = await Promise.all([
    getPemasukanList(),
    getPengeluaranList(),
  ]);

  const periodsSet = new Set<string>();
  pemasukanList.forEach((p) => {
    if (p.periode) periodsSet.add(p.periode);
  });
  pengeluaranList.forEach((p) => {
    if (p.periode) periodsSet.add(p.periode);
  });

  return Array.from(periodsSet).sort().reverse();
}
