/**
 * PEPS Income / Expense App
 * Backend: Google Apps Script + Google Sheets + Google Drive
 * Spreadsheet: Peps_Income_Expense_App
 * Timezone: Asia/Bangkok
 *
 * ฟังก์ชันหลัก:
 *   doGet()              — serve web app
 *   include(filename)    — HtmlService template include
 *   setupApp()           — สร้าง sheet + seed data
 *   installEditTrigger() — ติดตั้ง onEdit trigger
 *   onEditInstalled(e)   — trigger handler (installable)
 *   handleEdit(e)        — alias สำหรับ simple trigger (fallback)
 *   getBootstrapData()   — โหลดข้อมูลตอนเปิด app
 *   addTransaction(p)    — เพิ่มรายรับ/รายจ่าย
 *   addCategory(p)       — เพิ่มหมวดหมู่
 *   uploadSlip_(p, id)   — อัปโหลดสลิปไป Drive
 *   getCategories()      — ดึงหมวดหมู่ทั้งหมด
 *   getDashboardData()   — คำนวณ Dashboard
 *   getTransactions(o)   — ดึงรายการ
 *   buildTransactionRow_(data, id, now) — สร้าง row array
 *   nowBangkok_()        — วันที่/เวลาปัจจุบัน Asia/Bangkok
 *   ensureSheets_()      — สร้าง sheet ทั้งหมดถ้ายังไม่มี
 *   writeLog_(...)       — บันทึก log
 */

/* ══════════════════════════════════════════
   CONFIG
══════════════════════════════════════════ */
const CONFIG = {
  SPREADSHEET_ID: '1VMzcS0GmqCNa8WcdA9GQdoslYIoDhZJXGVSgUUMKBJE',
  TIMEZONE: 'Asia/Bangkok',
  TRANSACTIONS_SHEET: '01_Transactions',
  CATEGORIES_SHEET: '02_Categories',
  SETTINGS_SHEET: '10_Settings',
  LOG_SHEET: '11_Log',
  SLIP_FOLDER_NAME: 'Peps_Expense_Slips',
  SLIP_LINK_SHARING: false,
  MAX_SLIP_SIZE_MB: 5,
};

const HEADERS = [
  'id', 'created_at', 'date', 'time', 'type', 'category', 'title', 'amount',
  'note', 'payment_method', 'project', 'client', 'slip_url', 'status',
  'updated_at', 'source',
];

/* ══════════════════════════════════════════
   WEB APP ENTRY
══════════════════════════════════════════ */

function doGet() {
  const template = HtmlService.createTemplateFromFile('index');
  template.appTitle = 'PEPS รายรับรายจ่าย';
  return template.evaluate()
    .setTitle('PEPS รายรับรายจ่าย')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ══════════════════════════════════════════
   SETUP & TRIGGERS
══════════════════════════════════════════ */

function setupApp() {
  const ss = getSpreadsheet_();
  ss.setSpreadsheetTimeZone(CONFIG.TIMEZONE);
  ensureSheets_();
  seedCategories_();
  return { ok: true, message: 'Setup complete', spreadsheetUrl: ss.getUrl() };
}

function installEditTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'onEditInstalled' || t.getHandlerFunction() === 'handleEdit') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('onEditInstalled')
    .forSpreadsheet(CONFIG.SPREADSHEET_ID)
    .onEdit()
    .create();
  return { ok: true, message: 'ติดตั้ง onEdit trigger สำเร็จ (handler: onEditInstalled)' };
}

/**
 * onEditInstalled — Installable trigger handler
 * เติม id, created_at, date, time, status, updated_at, source อัตโนมัติ
 * เมื่อผู้ใช้แก้ข้อมูลใน 01_Transactions โดยตรง
 */
function onEditInstalled(e) {
  try {
    if (!e || !e.range) return;
    const sheet = e.range.getSheet();
    if (sheet.getName() !== CONFIG.TRANSACTIONS_SHEET) return;
    const row = e.range.getRow();
    if (row <= 1) return; // skip header

    const now = nowBangkok_();
    const rowRange = sheet.getRange(row, 1, 1, HEADERS.length);
    const values = rowRange.getValues()[0];

    const typeVal = normalizeType_(values[4]);
    if (!values[0]) values[0] = makeTxnId_(typeVal || 'manual', now.date);
    if (!values[1]) values[1] = now.date + ' ' + now.time;
    if (!values[2]) values[2] = now.date;
    if (!values[3]) values[3] = now.time;
    if (!values[13]) values[13] = 'paid';
    values[14] = now.date + ' ' + now.time; // updated_at always refreshed
    values[15] = 'sheet';

    rowRange.setValues([values]);
    formatTransactionsSheet_();
    writeLog_('SHEET_EDIT', values[0], '', '', '', Session.getActiveUser().getEmail() || 'sheet');
  } catch (err) {
    console.error('[PEPS] onEditInstalled error:', err);
  }
}

/** Alias: simple onEdit (may be limited by permissions, prefer installable) */
function handleEdit(e) {
  onEditInstalled(e);
}

/* ══════════════════════════════════════════
   BOOTSTRAP & DATA
══════════════════════════════════════════ */

function getBootstrapData() {
  setupApp();
  const now = nowBangkok_();
  return {
    ok: true,
    now: now.date + ' ' + now.time,
    timezone: CONFIG.TIMEZONE,
    categories: getCategories(),
    dashboard: getDashboardData(),
    recent: getTransactions({ limit: 25 }),
  };
}

function getCategories() {
  const sheet = getSheet_(CONFIG.CATEGORIES_SHEET);
  const values = getDataRows_(sheet);
  const result = { income: [], expense: [] };
  values.forEach(row => {
    const type = String(row[0] || '').trim();
    const category = String(row[1] || '').trim();
    const active = String(row[2] || '').toUpperCase() !== 'FALSE';
    if ((type === 'income' || type === 'expense') && category && active) {
      result[type].push(category);
    }
  });
  result.income = unique_(result.income);
  result.expense = unique_(result.expense);
  return result;
}

function addCategory(payload) {
  const type = normalizeType_(payload && payload.type);
  const category = String(payload && payload.category || '').trim();
  if (!type) throw new Error('type ต้องเป็น income หรือ expense');
  if (!category) throw new Error('กรุณากรอกชื่อหมวดหมู่');

  const existing = getCategories();
  const exists = existing[type].some(item => item.toLowerCase() === category.toLowerCase());
  if (!exists) {
    const now = nowBangkok_();
    getSheet_(CONFIG.CATEGORIES_SHEET).appendRow([type, category, true, now.date + ' ' + now.time]);
  }
  return { ok: true, categories: getCategories() };
}

function addTransaction(payload) {
  setupApp();
  if (!payload) throw new Error('ไม่พบข้อมูลรายการ');

  const type = normalizeType_(payload.type);
  if (!type) throw new Error('type ต้องเป็น income หรือ expense');

  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('จำนวนเงินต้องมากกว่า 0');

  const category = String(payload.category || '').trim();
  const title = String(payload.title || '').trim();
  if (!category) throw new Error('กรุณาเลือกหรือเพิ่มหมวดหมู่');
  if (!title) throw new Error('กรุณากรอกชื่อรายการ');

  // Auto-register category
  addCategory({ type, category });

  const now = nowBangkok_();
  const id = makeTxnId_(type, now.date);

  // Upload slip if provided
  let slipUrl = '';
  if (payload.slip && payload.slip.base64) {
    slipUrl = uploadSlip_(payload.slip, id, type, title, now);
  }

  const row = buildTransactionRow_({
    id,
    created_at: now.date + ' ' + now.time,
    date: now.date,
    time: now.time,
    type,
    category,
    title,
    amount,
    note: String(payload.note || '').trim(),
    payment_method: String(payload.payment_method || 'โอน').trim(),
    project: String(payload.project || '').trim(),
    client: String(payload.client || '').trim(),
    slip_url: slipUrl,
    status: String(payload.status || 'paid').trim(),
    updated_at: now.date + ' ' + now.time,
    source: 'app',
  });

  const sheet = getSheet_(CONFIG.TRANSACTIONS_SHEET);
  sheet.appendRow(row);
  formatTransactionsSheet_();
  writeLog_('ADD_TRANSACTION', id, '', '', JSON.stringify({ type, category, amount }), 'app');

  return {
    ok: true,
    message: type === 'income' ? 'บันทึกรายรับแล้ว' : 'บันทึกรายจ่ายแล้ว',
    transaction: rowToTransaction_(row),
    dashboard: getDashboardData(),
    recent: getTransactions({ limit: 25 }),
    categories: getCategories(),
  };
}

/**
 * buildTransactionRow_ — สร้าง array ตาม HEADERS ลำดับ
 */
function buildTransactionRow_(data) {
  return HEADERS.map(h => (data[h] !== undefined ? data[h] : ''));
}

function getTransactions(options) {
  const opts = options || {};
  const limit = Math.max(1, Math.min(Number(opts.limit || 100), 500));
  const type = normalizeType_(opts.type);
  const rows = getDataRows_(getSheet_(CONFIG.TRANSACTIONS_SHEET));
  let txns = rows.map(rowToTransaction_).filter(t => t.id && t.id !== 'ยังไม่มีข้อมูล');
  if (type) txns = txns.filter(t => t.type === type);
  txns.sort((a, b) => {
    const da = new Date(a.created_at_raw || a.created_at).getTime();
    const db = new Date(b.created_at_raw || b.created_at).getTime();
    return db - da;
  });
  return txns.slice(0, limit);
}

function getDashboardData() {
  const rows = getDataRows_(getSheet_(CONFIG.TRANSACTIONS_SHEET));
  const txns = rows.map(rowToTransaction_).filter(t => t.id && t.status !== 'cancelled');

  const now = nowBangkok_();
  const todayStr = now.date;
  const weekStart = startOfWeek_(now.dateObj);
  const weekEnd = addDays_(weekStart, 6);
  const monthStart = new Date(now.dateObj.getFullYear(), now.dateObj.getMonth(), 1);
  const monthEnd = new Date(now.dateObj.getFullYear(), now.dateObj.getMonth() + 1, 0);

  return {
    now: todayStr + ' ' + now.time,
    today: sumByRange_(txns, now.dateObj, now.dateObj),
    week: sumByRange_(txns, weekStart, weekEnd),
    month: sumByRange_(txns, monthStart, monthEnd),
    all: sumByRange_(txns, null, null),
    missingSlipCount: txns.filter(t => !t.slip_url).length,
    expenseByCategory: totalsByCategory_(txns, 'expense'),
    incomeByCategory: totalsByCategory_(txns, 'income'),
    monthlySeries: monthlySeries_(txns),
  };
}

/* ══════════════════════════════════════════
   SLIP UPLOAD
══════════════════════════════════════════ */

function uploadSlip_(slip, transactionId, type, title, now) {
  const rawName = slip.name || `${transactionId}_slip.jpg`;
  const mimeType = slip.mimeType || 'image/jpeg';
  const base64 = String(slip.base64 || '').replace(/^data:[^,]+,/, '');
  const bytes = Utilities.base64Decode(base64);
  const sizeMb = bytes.length / 1024 / 1024;

  if (sizeMb > CONFIG.MAX_SLIP_SIZE_MB) {
    throw new Error(`ไฟล์สลิปใหญ่เกิน ${CONFIG.MAX_SLIP_SIZE_MB} MB`);
  }

  const folder = getOrCreateFolder_(CONFIG.SLIP_FOLDER_NAME);
  const stamp = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
  const safeTitle = sanitizeFileName_(title || transactionId);
  const ext = rawName.includes('.') ? rawName.split('.').pop() : 'jpg';
  const fileName = `${stamp}_${type}_${safeTitle}.${ext}`;

  const blob = Utilities.newBlob(bytes, mimeType, fileName);
  const file = folder.createFile(blob);

  if (CONFIG.SLIP_LINK_SHARING) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }

  return file.getUrl();
}

/* ══════════════════════════════════════════
   SHEET HELPERS
══════════════════════════════════════════ */

function getSpreadsheet_() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}

function getSheet_(name) {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`ไม่พบแท็บ "${name}" — รัน setupApp() ก่อน`);
  return sheet;
}

/**
 * ensureSheets_ — สร้างทุก sheet ที่จำเป็นถ้ายังไม่มี
 */
function ensureSheets_() {
  ensureSheet_(CONFIG.TRANSACTIONS_SHEET, HEADERS);
  ensureSheet_(CONFIG.CATEGORIES_SHEET, ['type', 'category', 'active', 'created_at']);
  ensureSheet_(CONFIG.LOG_SHEET, ['timestamp', 'action', 'row_id', 'field', 'old_value', 'new_value', 'actor']);
}

function ensureSheet_(name, headers) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const existing = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const needsHeader = existing.join('') === '' || existing[0] !== headers[0];
  if (needsHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function seedCategories_() {
  const sheet = getSheet_(CONFIG.CATEGORIES_SHEET);
  const existing = getCategories();
  const now = nowBangkok_();
  const seed = [
    ['income', 'งานถ่ายภาพ'],
    ['income', 'ไลฟ์สดกีฬา'],
    ['income', 'มัดจำลูกค้า'],
    ['income', 'ขายรูปออนไลน์'],
    ['income', 'งานดนตรี'],
    ['income', 'ขายเพลง/ลิขสิทธิ์'],
    ['income', 'อื่น ๆ'],
    ['expense', 'น้ำมัน'],
    ['expense', 'อุปกรณ์กล้อง'],
    ['expense', 'ค่าเน็ต'],
    ['expense', 'ค่าเดินทาง'],
    ['expense', 'ค่าอาหาร'],
    ['expense', 'ค่าโปรแกรม/ซอฟต์แวร์'],
    ['expense', 'ค่าโฆษณา'],
    ['expense', 'ทีมงาน/ผู้ช่วย'],
    ['expense', 'อื่น ๆ'],
  ];
  seed.forEach(([type, category]) => {
    if (!existing[type].includes(category)) {
      sheet.appendRow([type, category, true, now.date + ' ' + now.time]);
    }
  });
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  if (lastRow <= 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
}

function rowToTransaction_(row) {
  const created = row[1];
  const dateValue = row[2];
  const updated = row[14];
  return {
    id: String(row[0] || ''),
    created_at: formatCellDateTime_(created),
    created_at_raw: created,
    date: formatCellDate_(dateValue),
    time: String(row[3] || ''),
    type: String(row[4] || ''),
    category: String(row[5] || ''),
    title: String(row[6] || ''),
    amount: Number(row[7] || 0),
    note: String(row[8] || ''),
    payment_method: String(row[9] || ''),
    project: String(row[10] || ''),
    client: String(row[11] || ''),
    slip_url: String(row[12] || ''),
    status: String(row[13] || 'paid'),
    updated_at: formatCellDateTime_(updated),
    source: String(row[15] || ''),
  };
}

function formatTransactionsSheet_() {
  try {
    const sheet = getSheet_(CONFIG.TRANSACTIONS_SHEET);
    const lastRow = Math.max(sheet.getLastRow(), 2);
    sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
    sheet.getRange(2, 3, lastRow - 1, 1).setNumberFormat('yyyy-mm-dd');
    sheet.getRange(2, 4, lastRow - 1, 1).setNumberFormat('hh:mm:ss');
    sheet.getRange(2, 8, lastRow - 1, 1).setNumberFormat('฿#,##0.00');
    sheet.getRange(2, 15, lastRow - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  } catch (err) {
    console.error('[PEPS] formatTransactionsSheet_ error:', err);
  }
}

/* ══════════════════════════════════════════
   AGGREGATION
══════════════════════════════════════════ */

function sumByRange_(txns, startDate, endDate) {
  let income = 0;
  let expense = 0;
  txns.forEach(txn => {
    const d = parseTxnDate_(txn.date);
    if (startDate && d < stripTime_(startDate)) return;
    if (endDate && d > stripTime_(endDate)) return;
    if (txn.type === 'income') income += txn.amount;
    if (txn.type === 'expense') expense += txn.amount;
  });
  return { income, expense, net: income - expense };
}

function totalsByCategory_(txns, type) {
  const map = {};
  txns.filter(t => t.type === type).forEach(t => {
    const key = t.category || 'ไม่ระบุ';
    map[key] = (map[key] || 0) + t.amount;
  });
  return Object.keys(map).sort().map(category => ({ category, amount: map[category] }));
}

function monthlySeries_(txns) {
  const map = {};
  txns.forEach(t => {
    const d = parseTxnDate_(t.date);
    const key = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM');
    if (!map[key]) map[key] = { month: key, income: 0, expense: 0, net: 0 };
    if (t.type === 'income') map[key].income += t.amount;
    if (t.type === 'expense') map[key].expense += t.amount;
    map[key].net = map[key].income - map[key].expense;
  });
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

/* ══════════════════════════════════════════
   DATE / TIME HELPERS (Asia/Bangkok)
══════════════════════════════════════════ */

/**
 * nowBangkok_ — คืนข้อมูลเวลาปัจจุบัน Asia/Bangkok
 * @returns {{ dateObj: Date, date: string, time: string }}
 */
function nowBangkok_() {
  const now = new Date();
  return {
    dateObj: now,
    date: Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd'),
    time: Utilities.formatDate(now, CONFIG.TIMEZONE, 'HH:mm:ss'),
  };
}

function makeTxnId_(type, dateStr) {
  const prefix = type === 'income' ? 'INC' : type === 'expense' ? 'EXP' : 'TXN';
  const now = new Date();
  const stamp = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMddHHmmss');
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${stamp}-${rand}`;
}

function formatDate_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd');
}

function formatTime_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'HH:mm:ss');
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

function formatCellDate_(value) {
  if (!value) return '';
  if (value instanceof Date) return formatDate_(value);
  return String(value);
}

function formatCellDateTime_(value) {
  if (!value) return '';
  if (value instanceof Date) return formatDateTime_(value);
  return String(value);
}

function parseTxnDate_(value) {
  if (value instanceof Date) return stripTime_(value);
  if (!value) return new Date(0);
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
  return stripTime_(new Date(value));
}

function stripTime_(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek_(date) {
  const d = stripTime_(date);
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1 Sun=7
  d.setDate(d.getDate() - day + 1);
  return d;
}

function addDays_(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/* ══════════════════════════════════════════
   UTILITY
══════════════════════════════════════════ */

function normalizeType_(type) {
  const v = String(type || '').trim().toLowerCase();
  if (v === 'income' || v === 'รายรับ') return 'income';
  if (v === 'expense' || v === 'รายจ่าย') return 'expense';
  return '';
}

function unique_(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function sanitizeFileName_(name) {
  return String(name).replace(/[\\/:'*?"<>|]+/g, '_').slice(0, 80);
}

function getOrCreateFolder_(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

/**
 * writeLog_ — บันทึก log ลง 11_Log sheet
 */
function writeLog_(action, rowId, field, oldValue, newValue, actor) {
  try {
    const sheet = getSheet_(CONFIG.LOG_SHEET);
    const now = nowBangkok_();
    sheet.appendRow([now.date + ' ' + now.time, action, rowId, field, oldValue, newValue, actor || 'system']);
  } catch (err) {
    console.error('[PEPS] writeLog_ error:', err);
  }
}

/** @deprecated use writeLog_ */
function log_(action, rowId, field, oldValue, newValue, actor) {
  writeLog_(action, rowId, field, oldValue, newValue, actor);
}
