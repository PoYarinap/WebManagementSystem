const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
env.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[match[1].trim()] = val;
  }
});

const { google } = require('googleapis');
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = process.env.GOOGLE_SHEET_ID;

async function checkAndDeduplicateAnggaran() {
  console.log('Checking Anggaran sheet...');
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Anggaran!A2:C',
  });
  const rows = res.data.values || [];
  console.log('Total rows in Anggaran:', rows.length);
  rows.forEach((r, i) => console.log(`Row ${i+2}:`, r));

  // Deduplicate by pos (case-insensitive)
  const uniqueMap = new Map();
  for (const r of rows) {
    const pos = String(r[0] || '').trim();
    if (!pos) continue;
    const lower = pos.toLowerCase();
    if (!uniqueMap.has(lower)) {
      uniqueMap.set(lower, [pos, r[1] || 0, r[2] || 0]);
    }
  }

  const cleanRows = Array.from(uniqueMap.values());
  console.log('Clean unique rows:', cleanRows.length);

  // Clear existing
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Anggaran!A2:C100',
  });

  // Re-write clean unique rows
  if (cleanRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Anggaran!A2:C${cleanRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: cleanRows },
    });
    console.log('Successfully deduplicated and saved clean Anggaran rows!');
  }
}

checkAndDeduplicateAnggaran().catch(console.error);
