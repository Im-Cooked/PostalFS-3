# Postal Delivery System

ระบบจัดการ “ส่งพัสดุ” แบบ Full-stack ด้วย Node.js + Express + EJS + SQLite

## Features

- สมัครสมาชิก/เข้าสู่ระบบด้วย session
- บทบาทผู้ใช้: `customer` และ `admin`
- Customer: สร้างพัสดุ, ดูสถานะ (Tracking), ยกเลิกพัสดุ, ชำระเงิน/เลือกวิธีชำระ (รวม COD)
- Admin: ดู Dashboard, จัดการสถานะพัสดุ/การชำระเงิน, ดูรายงานสรุป (Report)

## Tech Stack

- Node.js (CommonJS)
- Express + EJS
- SQLite (`sqlite3`)
- `express-session`

## Getting Started

### 1) Install

```bash
npm install
```

### 2) Run

```bash
npm start
```

เปิดที่: `http://localhost:3000`

## Default Admin Account

ระบบจะ seed บัญชี admin อัตโนมัติระหว่างเริ่มแอป (ถ้ายังไม่มีในฐานข้อมูล)

- Email: `admin@gmail.com`
- Password: `958813229`

## Database

- ไฟล์ฐานข้อมูล: `Database/postal.db`
- Schema ถูก ensure อัตโนมัติจากโค้ดใน `Database/Database.js` (ไม่ต้องใช้ `schema.sql`)

## Main Routes (Overview)

### Auth

- `GET /login` / `POST /login`
- `GET /register` / `POST /register`
- `GET /logout`

### Customer (Parcels)

- `GET /parcels/dashboard`
- `GET /parcels/create` / `POST /parcels/create`
- `GET /parcels/:id` (ดูสถานะพัสดุ)
- `GET /parcels/:id/pay` / `POST /parcels/:id/pay`
- `POST /parcels/:id/cancel`

### Admin

- `GET /admin/dashboard`
- `GET /admin/report`
- `GET /admin/user/:id`
- `POST /admin/parcel/ship`
- `POST /admin/parcel/start-delivery`
- `POST /admin/parcel/deliver`

## Project Structure

- `app.js` — Express app entry (routes + session + view engine)
- `controllers/` — business logic
- `routes/` — express routers
- `models/` — database models
- `views/` — EJS templates
- `public/` — static assets (css/images)
- `Database/Database.js` — SQLite connection + schema bootstrap + seed

## Notes

- ถ้าอยากเริ่มระบบใหม่แบบสะอาด: ปิดแอป แล้วลบ `Database/postal.db` จากนั้นรัน `npm start` เพื่อให้สร้างตารางใหม่อัตโนมัติ
