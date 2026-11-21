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

async function checkPengaturan() {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Pengaturan!A2:B',
  });
  const rows = res.data.values || [];
  console.log('Total rows in Pengaturan:', rows.length);
  rows.forEach((r, i) => console.log(`Row ${i+2}:`, r));

  const uniqueMap = new Map();
  for (const r of rows) {
    const key = String(r[0] || '').trim();
    if (!key) continue;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, [key, r[1]]);
    }
  }

  const cleanRows = Array.from(uniqueMap.values());
  if (cleanRows.length < rows.length) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Pengaturan!A2:B100',
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Pengaturan!A2:B${cleanRows.length + 1}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: cleanRows },
    });
    console.log('Deduplicated Pengaturan rows!');
  } else {
    console.log('Pengaturan is already clean!');
  }
}

checkPengaturan().catch(console.error);
