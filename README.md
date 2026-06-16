# PEPS Income / Expense App

เว็บแอปรายรับรายจ่าย ซิงก์กับ Google Sheets แนบสลิปเก็บใน Google Drive  
ธีมดำ-ส้ม PEPS · รองรับมือถือ · ไม่ต้องเลือกวันที่เอง

## 🌐 GitHub Pages (Preview)

เปิดใช้งานได้ที่:  
**[https://pepsproduction.github.io/peps_income_expense_app/web/index.html](https://pepsproduction.github.io/peps_income_expense_app/web/index.html)**

- ข้อมูลเก็บใน `localStorage` ของ Browser
- ทุกปุ่มกดได้ ทุกหน้าทำงานได้
- ไม่ต้อง Login ไม่ต้อง Setup อะไร

## 📁 โครงไฟล์

```
peps_income_expense_app/
├── web/                          ← GitHub Pages Preview
│   ├── index.html                ← หน้าหลัก (self-contained)
│   ├── styles.css                ← CSS ธีมดำ-ส้ม PEPS
│   └── app.js                    ← JavaScript + localStorage mock
│
├── apps-script/                  ← Google Apps Script Production
│   ├── Code.gs                   ← Backend หลัก
│   ├── index.html                ← Template (ใช้ include() syntax)
│   ├── styles.html               ← CSS wrapped สำหรับ HtmlService
│   ├── app.html                  ← JS wrapped สำหรับ HtmlService
│   ├── transaction_form.html     ← Form fragment
│   └── appsscript.json           ← Manifest (timezone: Asia/Bangkok)
│
├── docs/
│   ├── SETUP_APPS_SCRIPT.md      ← คู่มือ Deploy Apps Script
│   ├── DEPLOYMENT.md             ← คู่มือ Deploy ทั้งหมด
│   ├── CLEANUP_REPORT.md         ← ไฟล์ที่ถูกลบออก
│   └── VERIFY_REPORT.md          ← ผลการตรวจสอบโปรเจกต์
│
├── README.md
├── .gitignore
├── .clasp.json.example
├── verify_project.py             ← รันตรวจสอบ: python verify_project.py
└── index.html                    ← Redirect → /web/index.html
```

## 🚀 2 โหมด

### Mode 1: GitHub Pages Preview

เปิดหน้าเว็บได้เลย ข้อมูลเก็บ localStorage ไม่ต้อง setup อะไร

### Mode 2: Google Apps Script Production

ดูคู่มือที่ [docs/SETUP_APPS_SCRIPT.md](docs/SETUP_APPS_SCRIPT.md)

```
1. เปิด script.google.com > New Project
2. วางโค้ดจาก apps-script/ ทุกไฟล์
3. รัน setupApp()
4. รัน installEditTrigger()
5. Deploy > Web app > Copy URL
```

## 📊 Google Sheet

**Spreadsheet ID**: `1VMzcS0GmqCNa8WcdA9GQdoslYIoDhZJXGVSgUUMKBJE`

| Sheet | หน้าที่ |
|-------|--------|
| `01_Transactions` | รายการทั้งหมด |
| `02_Categories` | หมวดหมู่ |
| `11_Log` | บันทึก action |

**คอลัมน์หลัก**: `id · created_at · date · time · type · category · title · amount · note · payment_method · project · client · slip_url · status · updated_at · source`

## ⏱️ นโยบายเวลา

- วันที่/เวลาทุกอย่างใช้ `Asia/Bangkok` อัตโนมัติ
- ผู้ใช้**ไม่ต้องเลือก**วันที่หรือเวลาเอง
- ระบบเติม `created_at`, `date`, `time`, `updated_at` ให้ทุกครั้งที่บันทึก

## 🧾 สลิป

- เก็บใน Google Drive folder: **`Peps_Expense_Slips`**
- Sheet เก็บเฉพาะ `slip_url` (ไม่ฝังรูปใน Sheet)
- ค่าเริ่มต้น: ไม่ public (ปลอดภัย)

## 🔧 ตรวจสอบโปรเจกต์

```bash
python verify_project.py
node --check web/app.js
```

## 📋 ฟีเจอร์

- ✅ Dashboard รวมยอดวันนี้/สัปดาห์นี้/เดือนนี้
- ✅ หน้าแยกรายรับ / รายจ่าย
- ✅ เพิ่มหมวดหมู่เองได้ (ทั้งรายรับและรายจ่าย)
- ✅ หมายเหตุ / โปรเจกต์ / ลูกค้า
- ✅ แนบสลิป อัปโหลดไป Google Drive
- ✅ กราฟรายเดือน + breakdown ตามหมวดหมู่
- ✅ onEdit trigger เติม updated_at/source อัตโนมัติ
- ✅ Responsive มือถือ
