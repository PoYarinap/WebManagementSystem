import { google, sheets_v4 } from "googleapis";
import { Anggaran, AppUser, Pemasukan, Pengeluaran, Pengaturan, UserRole } from "./types";
import { hashPassword } from "./password";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SHEET_NAMES = {
  PEMASUKAN: "Pemasukan",
  PENGELUARAN: "Pengeluaran",
  ANGGARAN: "Anggaran",
  PENGATURAN: "Pengaturan",
  USERS: "Users",
};

const HEADERS = {
  [SHEET_NAMES.PEMASUKAN]: ["id", "tanggal", "periode", "jumlah", "keterangan", "user_id"],
  [SHEET_NAMES.PENGELUARAN]: ["id", "tanggal", "periode", "pos", "keterangan", "jumlah", "dibuat_pada", "user_id"],
  [SHEET_NAMES.ANGGARAN]: ["pos", "jatah_bulanan", "jatah_harian_opsional", "user_id"],
  [SHEET_NAMES.PENGATURAN]: ["key", "value", "user_id"],
  [SHEET_NAMES.USERS]: ["id", "username", "nama", "password_hash", "role", "aktif", "dibuat_pada"],
};

const INITIAL_ANGGARAN: Anggaran[] = [
  { pos: "Tabungan", jatah_bulanan: 150000, jatah_harian_opsional: 0 },
  { pos: "Makan", jatah_bulanan: 900000, jatah_harian_opsional: 30000 },
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
const CACHE_TTL_MS = 15000;

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
let mockAnggaran: Anggaran[] = INITIAL_ANGGARAN.map((a) => ({ ...a, user_id: "admin" }));
let mockPengaturan: Record<string, Record<string, any>> = {
  admin: { ...INITIAL_PENGATURAN },
};
let mockUsers: AppUser[] = [
  {
    id: "admin",
    username: "admin",
    nama: "Admin Utama",
    password_hash: hashPassword(process.env.ADMIN_PASSWORD || "admin123"),
    role: "admin",
    aktif: true,
    dibuat_pada: new Date().toISOString(),
  },
];

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
let initPromise: Promise<void> | null = null;

export async function ensureSpreadsheetInitialized(): Promise<void> {
  if (!isGoogleSheetsConfigured()) {
    return;
  }
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
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

      // Batch read all headers and seed check ranges in a single API call
      const sheetTitles = Object.keys(HEADERS);
      const batchRanges = [
        ...sheetTitles.map((t) => `${t}!A1:Z1`),
        `${SHEET_NAMES.ANGGARAN}!A2:D`,
        `${SHEET_NAMES.PENGATURAN}!A2:C`,
        `${SHEET_NAMES.USERS}!A2:G`,
      ];

      const batchRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: batchRanges,
      });

      const valueRanges = batchRes.data.valueRanges || [];

      for (let idx = 0; idx < sheetTitles.length; idx++) {
        const sheetTitle = sheetTitles[idx];
        const headers = HEADERS[sheetTitle];
        const currentHeader = valueRanges[idx]?.values?.[0] || [];
        const needsHeader =
          currentHeader.length === 0 ||
          headers.some((h, i) => currentHeader[i] !== h);

        if (needsHeader) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1:${String.fromCharCode(64 + headers.length)}1`,
            valueInputOption: "USER_ENTERED",
            requestBody: { values: [headers] },
          });
        }
      }

      const anggaranRows = valueRanges[sheetTitles.length]?.values || [];
      if (anggaranRows.length === 0) {
        const initialRows = INITIAL_ANGGARAN.map((a) => [
          a.pos,
          a.jatah_bulanan,
          a.jatah_harian_opsional || 0,
          "admin",
        ]);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.ANGGARAN}!A2:D${initialRows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: initialRows },
        });
      }

      const pengaturanRows = valueRanges[sheetTitles.length + 1]?.values || [];
      if (pengaturanRows.length === 0) {
        const initialRows = Object.entries(INITIAL_PENGATURAN).map(
          ([key, val]) => [key, String(val), "admin"]
        );
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.PENGATURAN}!A2:C${initialRows.length + 1}`,
          valueInputOption: "USER_ENTERED",
          requestBody: { values: initialRows },
        });
      }

      const userRows = valueRanges[sheetTitles.length + 2]?.values || [];
      if (userRows.length === 0) {
        const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEET_NAMES.USERS}!A2:G2`,
          valueInputOption: "USER_ENTERED",
          requestBody: {
            values: [
              [
                "admin",
                "admin",
                "Admin Utama",
                hashPassword(adminPassword),
                "admin",
                "true",
                new Date().toISOString(),
              ],
            ],
          },
        });
      }

      isInitialized = true;
    } catch (err: any) {
      console.error("Gagal inisialisasi spreadsheet:", err?.message || err);
      throw err;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

// ==========================================
// PEMASUKAN
// ==========================================

export async function getPemasukanList(
  periode?: string,
  userId: string = "admin"
): Promise<Pemasukan[]> {
  if (!isGoogleSheetsConfigured()) {
    let list = mockPemasukan.filter((item) => (item.user_id || "admin") === userId);
    if (periode) {
      list = list.filter((item) => item.periode === periode);
    }
    return list;
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `pemasukan_${userId}_${periode || "all"}`;
  const cached = getCached<Pemasukan[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A2:F`,
  });

  const rows = res.data.values || [];
  let list: Pemasukan[] = rows
    .map((row) => ({
      id: String(row[0] || ""),
      tanggal: String(row[1] || ""),
      periode: String(row[2] || ""),
      jumlah: parseInt(String(row[3] || "0").replace(/[^0-9]/g, ""), 10) || 0,
      keterangan: String(row[4] || ""),
      user_id: String(row[5] || "admin"),
    }))
    .filter((item) => item.user_id === userId);

  if (periode) {
    list = list.filter((item) => item.periode === periode);
  }

  setCached(cacheKey, list);
  return list;
}

export async function addPemasukan(
  data: Omit<Pemasukan, "id">,
  userId: string = "admin"
): Promise<Pemasukan> {
  const id = crypto.randomUUID();
  const newEntry: Pemasukan = { id, ...data, user_id: userId };

  if (!isGoogleSheetsConfigured()) {
    mockPemasukan.push(newEntry);
    return newEntry;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          newEntry.id,
          newEntry.tanggal,
          newEntry.periode,
          newEntry.jumlah,
          newEntry.keterangan,
          userId,
        ],
      ],
    },
  });

  invalidateCache();
  return newEntry;
}

export async function updatePemasukan(
  id: string,
  data: Partial<Pemasukan>,
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const idx = mockPemasukan.findIndex(
      (p) => p.id === id && (p.user_id || "admin") === userId
    );
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
    range: `${SHEET_NAMES.PEMASUKAN}!A2:F`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r) => r[0] === id && String(r[5] || "admin") === userId
  );
  if (rowIndex === -1) return false;

  const actualRow = rowIndex + 2;
  const current = rows[rowIndex];
  const updatedRow = [
    id,
    data.tanggal ?? current[1],
    data.periode ?? current[2],
    data.jumlah ?? current[3],
    data.keterangan ?? current[4],
    userId,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.PEMASUKAN}!A${actualRow}:F${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  invalidateCache();
  return true;
}

export async function deletePemasukan(
  id: string,
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const initialLen = mockPemasukan.length;
    mockPemasukan = mockPemasukan.filter(
      (p) => !(p.id === id && (p.user_id || "admin") === userId)
    );
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
    range: `${SHEET_NAMES.PEMASUKAN}!A2:F`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r) => r[0] === id && String(r[5] || "admin") === userId
  );
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
  periode?: string,
  userId: string = "admin"
): Promise<Pengeluaran[]> {
  if (!isGoogleSheetsConfigured()) {
    let list = mockPengeluaran.filter((item) => (item.user_id || "admin") === userId);
    if (periode) {
      list = list.filter((item) => item.periode === periode);
    }
    return list;
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `pengeluaran_${userId}_${periode || "all"}`;
  const cached = getCached<Pengeluaran[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A2:H`,
  });

  const rows = res.data.values || [];
  let list: Pengeluaran[] = rows
    .map((row) => ({
      id: String(row[0] || ""),
      tanggal: String(row[1] || ""),
      periode: String(row[2] || ""),
      pos: String(row[3] || ""),
      keterangan: String(row[4] || ""),
      jumlah: parseInt(String(row[5] || "0").replace(/[^0-9]/g, ""), 10) || 0,
      dibuat_pada: String(row[6] || ""),
      user_id: String(row[7] || "admin"),
    }))
    .filter((item) => item.user_id === userId);

  if (periode) {
    list = list.filter((item) => item.periode === periode);
  }

  setCached(cacheKey, list);
  return list;
}

export async function addPengeluaran(
  data: Omit<Pengeluaran, "id" | "dibuat_pada">,
  userId: string = "admin"
): Promise<Pengeluaran> {
  const id = crypto.randomUUID();
  const dibuat_pada = new Date().toISOString();
  const newEntry: Pengeluaran = { id, dibuat_pada, ...data, user_id: userId };

  if (!isGoogleSheetsConfigured()) {
    mockPengeluaran.push(newEntry);
    return newEntry;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A:H`,
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
          userId,
        ],
      ],
    },
  });

  invalidateCache();
  return newEntry;
}

export async function updatePengeluaran(
  id: string,
  data: Partial<Pengeluaran>,
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const idx = mockPengeluaran.findIndex(
      (p) => p.id === id && (p.user_id || "admin") === userId
    );
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
    range: `${SHEET_NAMES.PENGELUARAN}!A2:H`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r) => r[0] === id && String(r[7] || "admin") === userId
  );
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
    userId,
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGELUARAN}!A${actualRow}:H${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  invalidateCache();
  return true;
}

export async function deletePengeluaran(
  id: string,
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const initialLen = mockPengeluaran.length;
    mockPengeluaran = mockPengeluaran.filter(
      (p) => !(p.id === id && (p.user_id || "admin") === userId)
    );
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
    range: `${SHEET_NAMES.PENGELUARAN}!A2:H`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r) => r[0] === id && String(r[7] || "admin") === userId
  );
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

export async function getAnggaranList(userId: string = "admin"): Promise<Anggaran[]> {
  if (!isGoogleSheetsConfigured()) {
    const userRows = mockAnggaran.filter((a) => (a.user_id || "admin") === userId);
    return userRows.length > 0 ? userRows : INITIAL_ANGGARAN.map((a) => ({ ...a, user_id: userId }));
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `anggaran_list_${userId}`;
  const cached = getCached<Anggaran[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGARAN}!A2:D`,
  });

  const rows = res.data.values || [];
  const list: Anggaran[] = rows
    .filter((row) => String(row[3] || "admin") === userId)
    .map((row) => ({
      pos: String(row[0] || ""),
      jatah_bulanan:
        parseInt(String(row[1] || "0").replace(/[^0-9]/g, ""), 10) || 0,
      jatah_harian_opsional:
        parseInt(String(row[2] || "0").replace(/[^0-9]/g, ""), 10) || 0,
      user_id: userId,
    }));

  const finalList =
    list.length > 0
      ? list
      : INITIAL_ANGGARAN.map((a) => ({ ...a, user_id: userId }));

  setCached(cacheKey, finalList);
  return finalList;
}

export async function saveAnggaranList(
  list: Anggaran[],
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    mockAnggaran = [
      ...mockAnggaran.filter((a) => (a.user_id || "admin") !== userId),
      ...list.map((a) => ({ ...a, user_id: userId })),
    ];
    return true;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  // Read all rows and preserve other users' budgets
  const existingRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGARAN}!A2:D`,
  });
  const existingRows = existingRes.data.values || [];
  const otherUsersRows = existingRows
    .filter((row) => String(row[3] || "admin") !== userId)
    .map((row) => [row[0] || "", row[1] || 0, row[2] || 0, row[3] || "admin"]);

  const newUserRows = list.map((a) => [
    a.pos,
    a.jatah_bulanan,
    a.jatah_harian_opsional || 0,
    userId,
  ]);

  const combinedRows = [...otherUsersRows, ...newUserRows];

  // Clear existing rows in Anggaran
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEET_NAMES.ANGGARAN}!A2:D`,
  });

  if (combinedRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.ANGGARAN}!A2:D${combinedRows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: combinedRows },
    });
  }

  invalidateCache();
  return true;
}

// ==========================================
// PENGATURAN
// ==========================================

export async function getPengaturan(userId: string = "admin"): Promise<Pengaturan> {
  if (!isGoogleSheetsConfigured()) {
    return { ...INITIAL_PENGATURAN, ...(mockPengaturan[userId] || {}) };
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = `pengaturan_${userId}`;
  const cached = getCached<Pengaturan>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGATURAN}!A2:C`,
  });

  const rows = res.data.values || [];
  const result: Record<string, any> = { ...INITIAL_PENGATURAN };
  for (const row of rows) {
    if (String(row[2] || "admin") !== userId) continue;
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
  value: any,
  userId: string = "admin"
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    mockPengaturan[userId] = { ...(mockPengaturan[userId] || {}), [key]: value };
    return true;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.PENGATURAN}!A2:C`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex(
    (r) => r[0] === key && String(r[2] || "admin") === userId
  );

  if (rowIndex !== -1) {
    const actualRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAMES.PENGATURAN}!B${actualRow}:C${actualRow}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[String(value), userId]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_NAMES.PENGATURAN}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[key, String(value), userId]] },
    });
  }

  invalidateCache();
  return true;
}

// ==========================================
// USERS (MULTI-USER MANAGEMENT)
// ==========================================

export async function getUsersList(): Promise<AppUser[]> {
  if (!isGoogleSheetsConfigured()) {
    return [...mockUsers];
  }

  await ensureSpreadsheetInitialized();
  const cacheKey = "users_list";
  const cached = getCached<AppUser[]>(cacheKey);
  if (cached) return cached;

  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.USERS}!A2:G`,
  });

  const rows = res.data.values || [];
  const seen = new Set<string>();
  const list: AppUser[] = [];

  for (const row of rows) {
    if (!row[0] || !row[1]) continue;
    const uname = String(row[1]).toLowerCase();
    if (seen.has(uname)) continue;
    seen.add(uname);
    list.push({
      id: String(row[0]),
      username: String(row[1]),
      nama: String(row[2] || row[1]),
      password_hash: String(row[3] || ""),
      role: (String(row[4]) === "admin" ? "admin" : "user") as UserRole,
      aktif: String(row[5]).toLowerCase() !== "false",
      dibuat_pada: String(row[6] || ""),
    });
  }

  setCached(cacheKey, list);
  return list;
}

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const users = await getUsersList();
  const target = username.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === target) || null;
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const users = await getUsersList();
  return users.find((u) => u.id === id) || null;
}

export async function createUser(input: {
  username: string;
  nama: string;
  password: string;
  role?: UserRole;
}): Promise<AppUser> {
  const cleanUsername = input.username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "");
  if (!cleanUsername || cleanUsername.length < 3) {
    throw new Error("Username minimal 3 karakter (huruf, angka, titik, atau garis bawah).");
  }

  const existing = await getUserByUsername(cleanUsername);
  if (existing) {
    throw new Error(`Username "${cleanUsername}" sudah digunakan.`);
  }

  const newUser: AppUser = {
    id: crypto.randomUUID(),
    username: cleanUsername,
    nama: input.nama.trim() || cleanUsername,
    password_hash: hashPassword(input.password),
    role: input.role || "user",
    aktif: true,
    dibuat_pada: new Date().toISOString(),
  };

  if (!isGoogleSheetsConfigured()) {
    mockUsers.push(newUser);
    await saveAnggaranList(INITIAL_ANGGARAN, newUser.id);
    return newUser;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAMES.USERS}!A:G`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          newUser.id,
          newUser.username,
          newUser.nama,
          newUser.password_hash,
          newUser.role,
          "true",
          newUser.dibuat_pada,
        ],
      ],
    },
  });

  invalidateCache();

  // Seed default budget for the new user so their dashboard works immediately
  await saveAnggaranList(INITIAL_ANGGARAN, newUser.id);

  return newUser;
}

export async function updateUser(
  id: string,
  data: { nama?: string; password?: string; aktif?: boolean }
): Promise<boolean> {
  if (!isGoogleSheetsConfigured()) {
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    mockUsers[idx] = {
      ...mockUsers[idx],
      ...(data.nama !== undefined ? { nama: data.nama.trim() } : {}),
      ...(data.password ? { password_hash: hashPassword(data.password) } : {}),
      ...(data.aktif !== undefined && id !== "admin" ? { aktif: data.aktif } : {}),
    };
    return true;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.USERS}!A2:G`,
  });
  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === id);
  if (rowIndex === -1) return false;

  const actualRow = rowIndex + 2;
  const current = rows[rowIndex];
  const updatedRow = [
    id,
    current[1],
    data.nama !== undefined ? data.nama.trim() : current[2],
    data.password ? hashPassword(data.password) : current[3],
    current[4],
    data.aktif !== undefined && id !== "admin" ? String(data.aktif) : current[5],
    current[6] || "",
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAMES.USERS}!A${actualRow}:G${actualRow}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [updatedRow] },
  });

  invalidateCache();
  return true;
}

async function purgeUserRowsFromSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rangeColEnd: string,
  userIdColIndex: number,
  targetUserId: string
) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:${rangeColEnd}`,
  });
  const rows = res.data.values || [];
  const keptRows = rows.filter(
    (row) => String(row[userIdColIndex] || "admin") !== targetUserId
  );

  if (keptRows.length === rows.length) return;

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A2:${rangeColEnd}`,
  });

  if (keptRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A2:${rangeColEnd}${keptRows.length + 1}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: keptRows },
    });
  }
}

export async function deleteUser(
  id: string,
  deleteData: boolean = true
): Promise<boolean> {
  if (id === "admin") {
    throw new Error("Akun Admin Utama tidak dapat dihapus.");
  }

  if (!isGoogleSheetsConfigured()) {
    const before = mockUsers.length;
    mockUsers = mockUsers.filter((u) => u.id !== id);
    if (deleteData) {
      mockPemasukan = mockPemasukan.filter((p) => (p.user_id || "admin") !== id);
      mockPengeluaran = mockPengeluaran.filter((p) => (p.user_id || "admin") !== id);
      mockAnggaran = mockAnggaran.filter((a) => (a.user_id || "admin") !== id);
      delete mockPengaturan[id];
    }
    return mockUsers.length < before;
  }

  await ensureSpreadsheetInitialized();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const userSheet = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_NAMES.USERS
  );
  const sheetId = userSheet?.properties?.sheetId;
  if (sheetId === undefined) return false;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAMES.USERS}!A2:A`,
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

  if (deleteData) {
    await Promise.all([
      purgeUserRowsFromSheet(sheets, spreadsheetId, SHEET_NAMES.PEMASUKAN, "F", 5, id),
      purgeUserRowsFromSheet(sheets, spreadsheetId, SHEET_NAMES.PENGELUARAN, "H", 7, id),
      purgeUserRowsFromSheet(sheets, spreadsheetId, SHEET_NAMES.ANGGARAN, "D", 3, id),
      purgeUserRowsFromSheet(sheets, spreadsheetId, SHEET_NAMES.PENGATURAN, "C", 2, id),
    ]);
  }

  invalidateCache();
  return true;
}

// ==========================================
// BATCH / AGGREGATION HELPERS
// ==========================================

export async function getDashboardDataForPeriode(
  periode: string,
  userId: string = "admin"
) {
  // Batch get all needed data for this period
  const [allPemasukan, allPengeluaran, anggaranList, pengaturan] =
    await Promise.all([
      getPemasukanList(undefined, userId),
      getPengeluaranList(undefined, userId),
      getAnggaranList(userId),
      getPengaturan(userId),
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

export async function getAllDistinctPeriods(
  userId: string = "admin"
): Promise<string[]> {
  const [pemasukanList, pengeluaranList] = await Promise.all([
    getPemasukanList(undefined, userId),
    getPengeluaranList(undefined, userId),
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
