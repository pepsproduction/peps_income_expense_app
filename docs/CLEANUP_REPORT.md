# Cleanup Report

วันที่ตรวจสอบ: 2026-06-16

## ไฟล์ที่ถูกลบออกจากโปรเจกต์

| ไฟล์ | ขนาด | เหตุผล |
|------|------|--------|
| `local_preview.html` | 31,655 bytes (31KB) | ซ้ำกับ `/web/index.html` ที่สร้างใหม่ ซึ่งมีฟีเจอร์ครบและดีกว่า ไฟล์นี้เป็น monolithic HTML ที่มี CSS และ JS ฝังอยู่ภายใน ทำให้สับสนว่าควรใช้ไฟล์ไหนเป็น GitHub Pages หลัก |

## ไฟล์ที่ถูกย้าย (ไม่ใช่ลบ)

| ไฟล์เดิม (root) | ย้ายไปที่ | หมายเหตุ |
|----------------|-----------|---------|
| `Code.gs` | `apps-script/Code.gs` | เพิ่มฟังก์ชันใหม่ + ปรับปรุง |
| `index.html` | `apps-script/index.html` | ใช้ Apps Script template syntax |
| `styles.html` | `apps-script/styles.html` | CSS wrapper สำหรับ HtmlService |
| `app.html` | `apps-script/app.html` | JS wrapper สำหรับ HtmlService |
| `transaction_form.html` | `apps-script/transaction_form.html` | Form HTML fragment |
| `appsscript.json` | `apps-script/appsscript.json` | Apps Script manifest |
| `VERIFY_REPORT.md` | `docs/VERIFY_REPORT.md` | ย้ายไป docs/ |

## ไฟล์ที่ยังคงอยู่ root (จงใจ)

| ไฟล์ | เหตุผล |
|------|--------|
| `README.md` | GitHub แสดงที่ root |
| `.gitignore` | Git ต้องการที่ root |
| `.clasp.json.example` | Reference สำหรับนักพัฒนา |
| `index.html` | Meta-refresh redirect → /web/index.html |
| `verify_project.py` | รันจาก root |

## โครงไฟล์ใหม่

```
peps_income_expense_app/
├── web/                          ← GitHub Pages
│   ├── index.html                ← Self-contained app (localStorage)
│   ├── styles.css                ← CSS แยก
│   └── app.js                    ← JS แยก
├── apps-script/                  ← Google Apps Script production
│   ├── Code.gs
│   ├── index.html
│   ├── styles.html
│   ├── app.html
│   ├── transaction_form.html
│   └── appsscript.json
├── docs/
│   ├── CLEANUP_REPORT.md         ← ไฟล์นี้
│   ├── SETUP_APPS_SCRIPT.md
│   ├── DEPLOYMENT.md
│   └── VERIFY_REPORT.md
├── README.md
├── .gitignore
├── .clasp.json.example
├── verify_project.py
└── index.html                    ← Redirect → web/index.html
```
