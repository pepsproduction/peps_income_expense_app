# Setup Google Apps Script

คู่มือนี้อธิบายวิธีตั้งค่า PEPS Income Expense App ให้ทำงานกับ Google Sheets จริง

## ขั้นตอน

### 1. เปิด Google Apps Script

เข้าไปที่ [script.google.com](https://script.google.com) แล้วสร้าง Project ใหม่

หรือเปิดจาก Google Sheet:

```
Extensions > Apps Script
```

### 2. ตั้งค่า appsscript.json

ในหน้า Apps Script Editor ให้เปิด `appsscript.json` (Project Settings > Show appsscript.json)
แล้ววางเนื้อหาจากไฟล์ `apps-script/appsscript.json` ในโปรเจกต์นี้

### 3. สร้างไฟล์ใน Apps Script

สร้างไฟล์ต่อไปนี้และวางโค้ดจากโฟลเดอร์ `apps-script/`:

| ชื่อไฟล์ใน Apps Script | ไฟล์ต้นแบบ |
|------------------------|------------|
| `Code.gs` | `apps-script/Code.gs` |
| `index` (HTML) | `apps-script/index.html` |
| `styles` (HTML) | `apps-script/styles.html` |
| `app` (HTML) | `apps-script/app.html` |
| `transaction_form` (HTML) | `apps-script/transaction_form.html` |

> **หมายเหตุ**: ชื่อไฟล์ HTML ใน Apps Script **ต้องไม่มี `.html`** ต่อท้าย

### 4. รัน setupApp()

ในตัว Editor กด Run > `setupApp`

ฟังก์ชันนี้จะ:
- สร้าง Sheet `01_Transactions`, `02_Categories`, `11_Log` ถ้ายังไม่มี
- ใส่ header row ให้อัตโนมัติ
- Seed หมวดหมู่เริ่มต้น

### 5. รัน installEditTrigger()

กด Run > `installEditTrigger`

ฟังก์ชันนี้จะติดตั้ง Trigger สำหรับ `onEditInstalled` ซึ่งจะเติม:
- `updated_at` อัตโนมัติเมื่อแก้ข้อมูลใน Sheet โดยตรง
- `source = sheet`

### 6. Deploy เป็น Web App

1. กด **Deploy** > **New deployment**
2. เลือก Type: **Web app**
3. Description: `PEPS Income Expense App v1`
4. Execute as: **Me** (หรือผู้ Deploy)
5. Who has access: **Anyone** (หรือ Anyone with Google Account)
6. กด **Deploy**
7. Copy URL ที่ได้ไปเปิดใน Browser

## Spreadsheet ID

```
1VMzcS0GmqCNa8WcdA9GQdoslYIoDhZJXGVSgUUMKBJE
```

## Google Drive Slip Folder

สลิปจะถูกเก็บใน folder: **`Peps_Expense_Slips`**

ถ้าต้องการให้ลิงก์สลิปเปิดได้จากทุกคน แก้ใน `Code.gs`:
```js
SLIP_LINK_SHARING: true
```

## Timezone

ระบบใช้ `Asia/Bangkok` ทั้งหมด ผู้ใช้ไม่ต้องเลือกวันที่/เวลาเอง

## ทดสอบหลัง Deploy

1. เปิด Web App URL
2. เพิ่มรายรับ 1 รายการ
3. เพิ่มรายจ่าย 1 รายการ
4. เปิด Google Sheet ดูว่า `01_Transactions` มีข้อมูล
5. ทดสอบแนบสลิป → เปิด Google Drive หา folder `Peps_Expense_Slips`
6. กด Sync ในเว็บ → ยอดต้องอัปเดต

## การใช้ clasp (ทางเลือก)

```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json
# แก้ scriptId ใน .clasp.json
clasp push --rootDir ./apps-script
```
