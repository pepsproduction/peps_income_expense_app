# Deployment Guide

## 1. GitHub Pages (Preview Mode)

### วิธี Enable GitHub Pages

1. ไปที่ GitHub Repo > **Settings** > **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / Root: **/ (root)**
4. Save

### URL

หลัง Deploy แล้ว GitHub Pages URL จะเป็น:

```
https://pepsproduction.github.io/peps_income_expense_app/
```

หน้านี้จะ redirect ไปที่ `/web/index.html` อัตโนมัติ

หรือเข้าตรงได้ที่:

```
https://pepsproduction.github.io/peps_income_expense_app/web/index.html
```

### Preview Mode Features

- ✅ ทุกหน้าทำงานได้ (Dashboard / รายรับ / รายจ่าย / รายงาน / ตั้งค่า)
- ✅ เพิ่มรายรับ/รายจ่ายได้
- ✅ เพิ่มหมวดหมู่ได้
- ✅ ข้อมูลเก็บใน `localStorage` ของ Browser
- ✅ ธีมดำ-ส้ม PEPS
- ✅ รองรับมือถือ
- ⚠️ ไม่ sync กับ Google Sheets จริง
- ⚠️ สลิปไม่ได้อัปโหลดไป Drive

---

## 2. Google Apps Script (Production Mode)

ดูคำแนะนำละเอียดที่: [SETUP_APPS_SCRIPT.md](./SETUP_APPS_SCRIPT.md)

### สรุปขั้นตอน

```
1. เปิด script.google.com
2. สร้าง Project ใหม่
3. วางโค้ดจาก apps-script/ ทุกไฟล์
4. รัน setupApp()
5. รัน installEditTrigger()
6. Deploy > New deployment > Web app
7. Copy URL ไปเปิดใน Browser
```

### Production Mode Features

- ✅ บันทึกรายรับลง Google Sheet `01_Transactions`
- ✅ บันทึกรายจ่ายลง Google Sheet `01_Transactions`
- ✅ เพิ่มหมวดหมู่ลง `02_Categories`
- ✅ อัปโหลดสลิปไป Google Drive folder `Peps_Expense_Slips`
- ✅ เก็บ slip_url กลับเข้า Sheet
- ✅ Dashboard / Summary / Recent โหลดจาก Sheet จริง
- ✅ onEdit trigger เติม updated_at + source อัตโนมัติ
- ✅ วันที่/เวลา Asia/Bangkok อัตโนมัติ

---

## 3. การใช้ clasp (Optional)

```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json
# แก้ scriptId ใน .clasp.json ให้ตรงกับ Project ของคุณ
clasp push --rootDir ./apps-script
```

---

## โครงไฟล์

```
/web              → GitHub Pages files
/apps-script      → Google Apps Script files
/docs             → Documentation
index.html        → Redirect → /web/index.html
```

---

## Spreadsheet

- **ID**: `1VMzcS0GmqCNa8WcdA9GQdoslYIoDhZJXGVSgUUMKBJE`
- **Timezone**: Asia/Bangkok
- **Slip Folder**: Peps_Expense_Slips (Google Drive)
