# 🏢 Indoor CMS (Indoor Maps & Booths Management API)

ระบบ Backend RESTful API สำหรับบริหารจัดการแผนที่ภายในอาคาร (Indoor Map), แปลนชั้น (Floor Plan), ฮอลล์จัดแสดง และตำแหน่งบูธ (Booths) พัฒนาด้วย **NestJS**, **MongoDB (Mongoose)**, และ **TypeScript** รองรับทั้งพิกัด 2D/3D ภายในอาคารสำหรับ Canvas/Three.js และพิกัดภูมิศาสตร์โลกจริง (GIS/GeoJSON)

---

## 📑 สารบัญ
- [คุณสมบัติเด่น (Features)](#-คุณสมบัติเด่น-features)
- [เทคโนโลยีที่ใช้ (Tech Stack)](#-เทคโนโลยีที่ใช้-tech-stack)
- [โครงสร้างโปรเจค (Project Structure)](#-โครงสร้างโปรเจค-project-structure)
- [การติดตั้งและเริ่มต้นใช้งาน (Getting Started)](#-การติดตั้งและเริ่มต้นใช้งาน-getting-started)
- [ตัวแปรสภาพแวดล้อม (Environment Variables)](#-ตัวแปรสภาพแวดล้อม-environment-variables)
- [โครงสร้างฐานข้อมูล (Database Schemas)](#-โครงสร้างฐานข้อมูล-database-schemas)
- [คู่มือ API (API Reference)](#-คู่มือ-api-api-reference)
  - [1. แผนที่หลัก (Maps)](#1-แผนที่หลัก-maps)
  - [2. บูธและตำแหน่งพิกัด (Booths)](#2-บูธและตำแหน่งพิกัด-booths)
- [Interactive API Documentation (Swagger)](#-interactive-api-documentation-swagger)
- [การจัดการข้อผิดพลาด (Error Handling)](#-การจัดการข้อผิดพลาด-error-handling)

---

## ✨ คุณสมบัติเด่น (Features)

- **ระบบแผนที่และผังอาคาร (Indoor Maps)**:
  - จัดเก็บข้อมูลแปลนอาคาร ขนาดความกว้าง-ยาว (Canvas dimension) และรูปภาพแผนที่
  - ระบบแปลงระดับชั้นเป็นแกน Z อัตโนมัติ (`parseFloorToZ`) เช่น `"B1"` $\rightarrow$ `-1`, `"G"` $\rightarrow$ `0`, `"M"` $\rightarrow$ `0.5`, `"2"` $\rightarrow$ `2`
  - ป้องกันการสร้างแผนที่ซ้ำในอาคาร-ฮอลล์-ชั้นเดียวกัน (Unique Index แบบ Case-Insensitive)
- **ระบบบูธและตำแหน่งพิกัด (Booths & Positioning)**:
  - รองรับพิกัด **Local 3D (x, y, z)** สำหรับการวาดภาพบนเว็บ (2D Canvas / WebGL / Three.js)
  - รองรับพิกัด **GeoJSON Point (longitude, latitude, altitude)** พร้อม 2dsphere index สำหรับระบบแผนที่ดาวเทียม / GIS
  - ดึงค่าระดับชั้น $Z$ จากแผนที่หลักมาใช้กับบูธให้อัตโนมัติหากไม่ได้ระบุพิกัดความสูง
  - ป้องกันรหัสบูธซ้ำในแผนที่เดียวกัน
- **Unified Full-Map Payload**:
  - Endpoint รวมผังแผนที่และบูธทั้งหมดในคำสั่งเดียว (`GET /maps/:id/full`) เพื่อให้ Frontend นำไป Render ได้ทันที
- **ความปลอดภัยและมาตรฐาน**:
  - ใช้ **UUID v4** เป็น Primary Key แทน ObjectId ของ MongoDB
  - ตรวจสอบความถูกต้องของข้อมูลด้วย `class-validator` และ `ValidationPipe`
  - พร้อมเอกสาร Swagger UI แบบ Interactive

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Framework**: [NestJS 11](https://nestjs.com/) (Node.js framework)
- **Language**: TypeScript 5
- **Database**: [MongoDB 7](https://www.mongodb.com/) ผ่าน [Mongoose 9](https://mongoosejs.com/)
- **Containerization**: Docker & Docker Compose
- **API Documentation**: OpenAPI 3.0 via Swagger (`@nestjs/swagger`)
- **Validation**: `class-validator` & `class-transformer`

---

## 📂 โครงสร้างโปรเจค (Project Structure)

```text
indoor-cms/
├── docker-compose.yml                      # คอนฟิก MongoDB Container
├── .env.example                            # ตัวอย่าง Environment Variables
├── src/
│   ├── main.ts                             # Bootstrap, ValidationPipe, Swagger setup
│   ├── app.module.ts                       # Root module เชื่อมต่อ Config และ Mongoose
│   ├── entities/                           # Mongoose Schemas & Database Models
│   │   └── indoor-map/
│   │       ├── map.schema.ts               # Schema แผนที่อาคาร
│   │       └── booth.schema.ts             # Schema บูธและพิกัดตำแหน่ง
│   ├── dto/                                # Data Transfer Objects + Validation Rules
│   │   └── indoor-map/
│   │       ├── create-map.dto.ts           # DTO สร้างแผนที่
│   │       ├── create-booth.dto.ts         # DTO สร้างบูธ
│   │       └── update-booth.dto.ts         # DTO แก้ไขบูธ
│   └── workflow/                           # Feature Modules (Controllers & Services)
│       └── indoor-map/
│           ├── indoor-map.module.ts        # รวม Controller, Service, Models
│           ├── indoor-map.controller.ts    # กำหนดเส้นทาง API และ Swagger annotations
│           └── indoor-map.service.ts       # Business Logic การคำนวณและประมวลผลข้อมูล
```

---

## 🚀 การติดตั้งและเริ่มต้นใช้งาน (Getting Started)

### ความต้องการของระบบ (Prerequisites)
- [Node.js](https://nodejs.org/) (Version 18 ขึ้นไป)
- [Docker](https://www.docker.com/) & Docker Compose

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่าไฟล์สภาพแวดล้อม (.env)
คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
cp .env.example .env
```

### 3. เริ่มต้นฐานข้อมูล MongoDB ด้วย Docker
```bash
# สตาร์ท MongoDB ใน Background
npm run db:up

# หรือใช้คำสั่ง Docker โดยตรง
docker compose up -d
```

### 4. รันแอปพลิเคชัน (Development Mode)
```bash
npm run start:dev
```
เมื่อรันสำเร็จ ระบบจะพร้อมทำงานที่:
- **API Server**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/cms`

### คำสั่งสคริปต์ที่สำคัญ (NPM Scripts)
| คำสั่ง | คำอธิบาย |
| :--- | :--- |
| `npm run start:dev` | เริ่มรันเซิร์ฟเวอร์โหมด Development (Hot-Reload) |
| `npm run build` | คอมไพล์โปรเจค TypeScript สู่โฟลเดอร์ `dist/` |
| `npm run start:prod` | รันโปรเจคในโหมด Production (`node dist/main`) |
| `npm run db:up` | สตาร์ท MongoDB container (`docker compose up -d`) |
| `npm run db:down` | หยุดและปิด MongoDB container (`docker compose down`) |
| `npm run db:logs` | ดู Logs การทำงานของ MongoDB container |

---

## ⚙️ ตัวแปรสภาพแวดล้อม (Environment Variables)

กำหนดในไฟล์ `.env`:

| ตัวแปร | ตัวอย่างค่า | คำอธิบาย |
| :--- | :--- | :--- |
| `PORT` | `3000` | พอร์ตที่ API เซิร์ฟเวอร์เปิดให้บริการ |
| `MONGODB_URI` | `mongodb://root:password@localhost:27017/indoor_cms?authSource=admin` | Connection String สำหรับเชื่อมต่อ MongoDB |
| `MONGO_PORT` | `27017` | พอร์ตสำหรับเปิดเชื่อมต่อ MongoDB Container |
| `MONGO_INITDB_ROOT_USERNAME` | `root` | ชื่อผู้ดูแลระบบ MongoDB |
| `MONGO_INITDB_ROOT_PASSWORD` | `password` | รหัสผ่านผู้ดูแลระบบ MongoDB |
| `MONGO_INITDB_DATABASE` | `indoor_cms` | ชื่อฐานข้อมูลเริ่มต้น |

---

## 🗄 โครงสร้างฐานข้อมูล (Database Schemas)

### 1. Map Schema (`maps`)
| ฟิลด์ | ประเภท | ค่าเริ่มต้น | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `_id` | `String` (UUID) | Auto UUIDv4 | Primary Key |
| `name` | `String` | **จำเป็น** | ชื่อแผนที่/ฮอลล์ (ความยาวไม่เกิน 255) |
| `building` | `String` | `null` | ชื่ออาคารหรือสถานที่ |
| `floor` | `String` | `null` | ชั้น (เช่น "1", "G", "B1") |
| `imageUrl` | `String` | `null` | ลิงก์ URL รูปภาพแปลนพื้นหลัง |
| `width` | `Number` | `1000` | ความกว้างของแปลน (pixels หรือ meters) |
| `height` | `Number` | `1000` | ความยาวของแปลน (pixels หรือ meters) |
| `z` | `Number` | `0` | ระดับความสูงแกน Z (คำนวณจากชั้นอัตโนมัติ) |
| `createdAt` | `Date` | Auto | วันเวลาที่สร้าง |
| `updatedAt` | `Date` | Auto | วันเวลาที่แก้ไขล่าสุด |

**Index พิเศษ**:
- `{ building: 1, name: 1, floor: 1 }` (Unique, Case-insensitive): ป้องกันการสร้างแผนที่ซ้ำ
- `{ createdAt: -1 }`: ดึงข้อมูลล่าสุดได้รวดเร็ว

---

### 2. Booth Schema (`booths`)
| ฟิลด์ | ประเภท | ค่าเริ่มต้น | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `_id` | `String` (UUID) | Auto UUIDv4 | Primary Key |
| `mapId` | `String` (UUID) | **จำเป็น** | Foreign Key อ้างอิงถึง `maps._id` |
| `boothNumber` | `String` | **จำเป็น** | รหัสประจำบูธ (เช่น "A01", "B12") |
| `name` | `String` | **จำเป็น** | ชื่อบูธหรือชื่อผู้จัดแสดง |
| `description` | `String` | `null` | รายละเอียดบูธ |
| `category` | `String` | `null` | หมวดหมู่หรือประเภทธุรกิจ |
| `status` | `Enum` | `AVAILABLE` | สถานะ: `AVAILABLE`, `RESERVED`, `OCCUPIED` |
| `x` | `Number` | `0` | พิกัดแกน X บนระนาบแผนที่ |
| `y` | `Number` | `0` | พิกัดแกน Y บนระนาบแผนที่ |
| `z` | `Number` | `0` | ระดับความสูงแกน Z (ดึงจาก Map ให้อัตโนมัติ) |
| `location` | `GeoPoint` | `null` | GeoJSON Point `[longitude, latitude, altitude]` |
| `createdAt` | `Date` | Auto | วันเวลาที่สร้าง |
| `updatedAt` | `Date` | Auto | วันเวลาที่แก้ไขล่าสุด |

**Index พิเศษ**:
- `{ mapId: 1, boothNumber: 1 }` (Unique, Case-insensitive): รหัสบูธต้องไม่ซ้ำกันในแผนที่เดียวกัน
- `{ location: "2dsphere" }` (Sparse): รองรับการ Query ตำแหน่งทางภูมิศาสตร์

---

## 📡 คู่มือ API (API Reference)

Base URL: `http://localhost:3000`

### 1. แผนที่หลัก (Maps)

#### 1.1 สร้างแผนที่หลัก (Create Map)
- **Method / URL**: `POST /maps`
- **Request Body** (`application/json`):
  ```json
  {
    "name": "Challenger Hall 1",
    "building": "Impact Muang Thong Thani",
    "floor": "1",
    "imageUrl": "https://example.com/floorplans/hall1.png",
    "width": 1920,
    "height": 1080,
    "z": 1
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "name": "Challenger Hall 1",
    "building": "Impact Muang Thong Thani",
    "floor": "1",
    "imageUrl": "https://example.com/floorplans/hall1.png",
    "width": 1920,
    "height": 1080,
    "z": 1,
    "id": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-15T00:00:00.000Z"
  }
  ```

---

#### 1.2 ดึงรายการแผนที่ทั้งหมด (List all maps)
- **Method / URL**: `GET /maps`
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
      "name": "Challenger Hall 1",
      "building": "Impact Muang Thong Thani",
      "floor": "1",
      "imageUrl": "https://example.com/floorplans/hall1.png",
      "width": 1920,
      "height": 1080,
      "z": 1,
      "createdAt": "2026-09-15T00:00:00.000Z",
      "updatedAt": "2026-09-15T00:00:00.000Z"
    }
  ]
  ```

---

#### 1.3 ดึงข้อมูลแผนที่เดี่ยว (Get Map by ID)
- **Method / URL**: `GET /maps/:id`
- **Path Parameters**:
  - `id` (string, required): UUID ของแผนที่
- **Response** (`200 OK`):
  ```json
  {
    "id": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "name": "Challenger Hall 1",
    "building": "Impact Muang Thong Thani",
    "floor": "1",
    "imageUrl": "https://example.com/floorplans/hall1.png",
    "width": 1920,
    "height": 1080,
    "z": 1,
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-15T00:00:00.000Z"
  }
  ```

---

#### 1.4 แสดงแผนที่รวมบูธทั้งหมด (Full Map with Booths)
- **Method / URL**: `GET /maps/:id/full`
- **คำอธิบาย**: ดึงข้อมูลผังแผนที่หลัก พร้อมรายการบูธและพิกัดตำแหน่งทั้งหมดในครั้งเดียว สำหรับการ Render บน Canvas / 3D Scene
- **Path Parameters**:
  - `id` (string, required): UUID ของแผนที่
- **Response** (`200 OK`):
  ```json
  {
    "id": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "name": "Challenger Hall 1",
    "building": "Impact Muang Thong Thani",
    "floor": "1",
    "imageUrl": "https://example.com/floorplans/hall1.png",
    "width": 1920,
    "height": 1080,
    "z": 1,
    "totalBooths": 1,
    "booths": [
      {
        "id": "b3e6f921-9921-4f47-8178-5db0d68616fa",
        "mapId": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
        "boothNumber": "A01",
        "name": "AI Showcase",
        "description": "Exhibition on Artificial Intelligence",
        "category": "Technology",
        "status": "AVAILABLE",
        "position": {
          "x": 350.5,
          "y": 420.0,
          "z": 1
        },
        "spatialLocation": {
          "type": "Point",
          "coordinates": [100.5489, 13.9113, 1]
        },
        "coordinates": {
          "longitude": 100.5489,
          "latitude": 13.9113,
          "altitude": 1
        },
        "createdAt": "2026-09-15T00:05:00.000Z",
        "updatedAt": "2026-09-15T00:05:00.000Z"
      }
    ]
  }
  ```

---

### 2. บูธและตำแหน่งพิกัด (Booths)

#### 2.1 สร้างบูธและบันทึกพิกัดตำแหน่ง (Create Booth)
- **Method / URL**: `POST /maps/:mapId/booths`
- **Path Parameters**:
  - `mapId` (string, required): UUID ของแผนที่ที่ต้องการผูกบูธ
- **Request Body** (`application/json`):
  ```json
  {
    "boothNumber": "A01",
    "name": "AI Showcase",
    "description": "Exhibition on Artificial Intelligence",
    "category": "Technology",
    "status": "AVAILABLE",
    "x": 350.5,
    "y": 420.0,
    "z": 1,
    "longitude": 100.5489,
    "latitude": 13.9113,
    "altitude": 1.0
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "b3e6f921-9921-4f47-8178-5db0d68616fa",
    "mapId": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "boothNumber": "A01",
    "name": "AI Showcase",
    "description": "Exhibition on Artificial Intelligence",
    "category": "Technology",
    "status": "AVAILABLE",
    "position": {
      "x": 350.5,
      "y": 420.0,
      "z": 1
    },
    "spatialLocation": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113, 1]
    },
    "coordinates": {
      "longitude": 100.5489,
      "latitude": 13.9113,
      "altitude": 1
    },
    "createdAt": "2026-09-15T00:05:00.000Z",
    "updatedAt": "2026-09-15T00:05:00.000Z"
  }
  ```

---

#### 2.2 ดึงรายการบูธทั้งหมดในแผนที่ (List Booths by Map ID)
- **Method / URL**: `GET /maps/:mapId/booths`
- **Path Parameters**:
  - `mapId` (string, required): UUID ของแผนที่
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "b3e6f921-9921-4f47-8178-5db0d68616fa",
      "mapId": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
      "boothNumber": "A01",
      "name": "AI Showcase",
      "status": "AVAILABLE",
      "position": {
        "x": 350.5,
        "y": 420.0,
        "z": 1
      },
      "coordinates": {
        "longitude": 100.5489,
        "latitude": 13.9113,
        "altitude": 1
      }
    }
  ]
  ```

---

#### 2.3 ดึงข้อมูลบูธเดี่ยวตาม ID (Get Booth by ID)
- **Method / URL**: `GET /booths/:id`
- **Path Parameters**:
  - `id` (string, required): UUID ของบูธ
- **Response** (`200 OK`):
  ```json
  {
    "id": "b3e6f921-9921-4f47-8178-5db0d68616fa",
    "mapId": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "boothNumber": "A01",
    "name": "AI Showcase",
    "description": "Exhibition on Artificial Intelligence",
    "category": "Technology",
    "status": "AVAILABLE",
    "position": {
      "x": 350.5,
      "y": 420.0,
      "z": 1
    },
    "spatialLocation": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113, 1]
    },
    "coordinates": {
      "longitude": 100.5489,
      "latitude": 13.9113,
      "altitude": 1
    }
  }
  ```

---

#### 2.4 แก้ไขข้อมูลหรืออัปเดตตำแหน่งบูธ (Update Booth)
- **Method / URL**: `PATCH /booths/:id`
- **Path Parameters**:
  - `id` (string, required): UUID ของบูธ
- **Request Body** (`application/json` - ส่งเฉพาะฟิลด์ที่ต้องการเปลี่ยน):
  ```json
  {
    "name": "Google DeepMind Showcase",
    "status": "OCCUPIED",
    "x": 400.0,
    "y": 450.0
  }
  ```
- **Response** (`200 OK`): ข้อมูลบูธฉบับอัปเดตล่าสุด

---

#### 2.5 ลบบูธ (Delete Booth)
- **Method / URL**: `DELETE /booths/:id`
- **Path Parameters**:
  - `id` (string, required): UUID ของบูธ
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Booth A01 deleted"
  }
  ```

---

## 📖 Interactive API Documentation (Swagger)

โปรเจคนี้ติดตั้ง Swagger UI ไว้อย่างสมบูรณ์ คุณสามารถทดลองยิง Request, ตรวจสอบ Schema ของโมเดล และดูตัวอย่างค่าต่างๆ ได้ทันที

1. รันเซิร์ฟเวอร์ด้วยคำสั่ง `npm run start:dev`
2. เปิดเบราว์เซอร์ไปที่:
   ```text
   http://localhost:3000/cms
   ```

---

## ⚠️ การจัดการข้อผิดพลาด (Error Handling)

ระบบส่งรหัสสถานะ HTTP ตามมาตรฐาน RESTful:

| รหัสสถานะ (Status Code) | ความหมาย | สถานการณ์ที่พบ |
| :--- | :--- | :--- |
| `200 OK` | สำเร็จ | ค้นหา, แก้ไข หรือลบข้อมูลสำเร็จ |
| `201 Created` | สร้างสำเร็จ | สร้าง Map หรือ Booth สำเร็จ |
| `400 Bad Request` | ข้อมูลไม่ถูกต้อง | ส่งฟิลด์ที่จำเป็นไม่ครบ หรือข้อมูลผิดประเภท (ดักโดย ValidationPipe) |
| `404 Not Found` | ไม่พบข้อมูล | ไม่พบ Map หรือ Booth ตาม ID ที่ระบุ |
| `409 Conflict` | ข้อมูลซ้ำซ้อน | ชื่อแผนที่ในอาคาร-ชั้นซ้ำ หรือรหัสบูธซ้ำในแผนที่เดียวกัน |
| `500 Internal Server Error` | ข้อผิดพลาดภายในเซิร์ฟเวอร์ | ปัญหาการเชื่อมต่อฐานข้อมูลหรือข้อผิดพลาดที่ไม่คาดคิด |

ตัวอย่าง Response ข้อผิดพลาด 409 Conflict:
```json
{
  "statusCode": 409,
  "message": "รหัสบูธ \"A01\" มีอยู่ในแผนที่นี้แล้ว",
  "error": "Conflict"
}
```

---

## 📄 ใบอนุญาต (License)

โปรเจคนี้เผยแพร่ภายใต้ลิขสิทธิ์ [UNLICENSED](LICENSE).
