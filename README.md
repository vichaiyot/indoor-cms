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
  - [3. โครงข่ายเส้นทางเดินสำหรับคำนวณ A* (Paths / Navigation Graph)](#3-โครงข่ายเส้นทางเดินสำหรับคำนวณ-a-paths--navigation-graph)
- [Interactive API Documentation (Swagger)](#-interactive-api-documentation-swagger)
- [การจัดการข้อผิดพลาด (Error Handling)](#-การจัดการข้อผิดพลาด-error-handling)

---

## ✨ คุณสมบัติเด่น (Features)

- **ระบบแผนที่และผังอาคาร (Indoor Maps)**:
  - จัดเก็บข้อมูลแปลนอาคาร ขนาดความกว้าง-ยาว (Canvas dimension) และรูปภาพแผนที่
  - ป้องกันการสร้างแผนที่ซ้ำในอาคาร-ฮอลล์-ชั้นเดียวกัน (Unique Index แบบ Case-Insensitive)
- **ระบบบูธและตำแหน่งพิกัด (Booths & Positioning)**:
  - จัดเก็บพิกัดแบบ **GeoJSON Point (`position: { type: "Point", coordinates: [x, y] }`)** บนระนาบ 2D สำหรับ Web Canvas / Floor Plan Renderers
  - **ไม่ต้องเก็บพิกัด Z** แยกรายบูธ โดยกำหนดความสูงผ่านระดับชั้น (`floorLevel` หรือ Floor ของ Map)
  - รองรับฟิลด์ **`type`** เพื่อระบุประเภทออบเจกต์ (เช่น `room`, `booth`, `facility`, `stage`)
  - รองรับขนาดมิติ 3 มิติ **`size`** (`width`, `depth`, `height`) และมุมหมุน **`rotation`**
  - จัดเก็บรูปทรงขอบเขตระนาบ 2D **`footprint`** (GeoJSON Polygon) พร้อมระบบคำนวณ 5 จุดพิกัดอัตโนมัติจากตำแหน่งและขนาด
  - รองรับพิกัดภูมิศาสตร์โลกจริง **`geo`** (GeoJSON Point `[longitude, latitude]`) พร้อม MongoDB `2dsphere` index สำหรับระบบดาวเทียม / GIS
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
│   ├── schema/                             # Mongoose Schemas & Database Models
│   │   └── indoor-map/
│   │       ├── map/                        # 1. Schema แผนที่อาคาร
│   │       │   └── map.schema.ts
│   │       ├── booth/                      # 2. Schema บูธและพิกัดตำแหน่ง
│   │       │   └── booth.schema.ts
│   │       └── path/                       # 3. Schema โครงข่ายเส้นทางเดินสำหรับ A*
│   │           └── path-graph.schema.ts
│   ├── dto/                                # Data Transfer Objects + Validation Rules
│   │   └── indoor-map/
│   │       ├── map/                        # 1. DTO สร้างแผนที่
│   │       │   └── create-map.dto.ts
│   │       ├── booth/                      # 2. DTO สร้างและแก้ไขบูธ
│   │       │   ├── create-booth.dto.ts
│   │       │   └── update-booth.dto.ts
│   │       └── path/                       # 3. DTO บันทึกโครงข่ายเส้นทางเดิน
│   │           └── save-path-graph.dto.ts
│   └── workflow/                           # Feature Modules (Controllers & Services)
│       └── indoor-map/
│           ├── indoor-map.module.ts        # Aggregator Module รวมย่อยทั้ง 3 ด้าน
│           ├── map/                        # 1. แผนที่หลักและผังอาคาร (Maps)
│           │   ├── map.controller.ts
│           │   ├── map.service.ts
│           │   └── map.module.ts
│           ├── booth/                      # 2. บูธและตำแหน่งพิกัด (Booths)
│           │   ├── booth.controller.ts
│           │   ├── booth.service.ts
│           │   └── booth.module.ts
│           └── path/                       # 3. โครงข่ายทางเดินสำหรับ A* (Paths)
│               ├── path.controller.ts
│               ├── path.service.ts
│               └── path.module.ts
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
| `geo` | `Point2D` | `null` | พิกัดภูมิศาสตร์โลกจริง (GPS WGS84 GeoJSON Point `[longitude, latitude]`) |
| `boundary` | `Polygon2D` | `null` | ขอบเขตอาณาเขตผังอาคารบนแผนที่โลกจริง (GeoJSON Polygon `[[[lng, lat], ...]]`) |
| `rotation` | `Number` | `0` | องศาการหมุนของแผนที่เทียบกับทิศเหนือ (0 - 360 องศา) |
| `createdAt` | `Date` | Auto | วันเวลาที่สร้าง |
| `updatedAt` | `Date` | Auto | วันเวลาที่แก้ไขล่าสุด |

**Index พิเศษ**:
- `{ building: 1, name: 1, floor: 1 }` (Unique, Case-insensitive): ป้องกันการสร้างแผนที่ซ้ำ
- `{ createdAt: -1 }`: ดึงข้อมูลล่าสุดได้รวดเร็ว
- `{ building: 1, floor: 1 }`: กรองแผนที่ตามอาคารและชั้น
- `{ geo: '2dsphere' }` (Sparse): พิกัดภูมิศาสตร์โลกจริงสำหรับการวาดและค้นหาเชิงพื้นที่บนแผนที่โลกจริง (GIS)

---

### 2. Booth Schema (`booths`)
| ฟิลด์ | ประเภท | ค่าเริ่มต้น | คำอธิบาย |
| :--- | :--- | :--- | :--- |
| `_id` | `String` (UUID) | Auto UUIDv4 | Primary Key |
| `mapId` | `String` (UUID) | **จำเป็น** | Foreign Key อ้างอิงถึง `maps._id` (ระบุฮอลล์และชั้นผ่าน Map) |
| `boothNumber` | `String` | **จำเป็น** | รหัสประจำบูธ (เช่น "A01", "B12") |
| `name` | `String` | **จำเป็น** | ชื่อบูธหรือชื่อผู้จัดแสดง |
| `description` | `String` | `null` | รายละเอียดบูธ |
| `category` | `String` | `null` | หมวดหมู่หรือประเภทธุรกิจ |
| `status` | `Enum` | `AVAILABLE` | สถานะ: `AVAILABLE`, `RESERVED`, `OCCUPIED` |
| `type` | `String` | `room` | ประเภทของออบเจกต์ (เช่น `room`, `booth`, `facility`) |
| `position` | `Point2D` | **จำเป็น** | พิกัด 2D บน Canvas แปลนพื้น: `{"type": "Point", "coordinates": [x, y]}` |
| `rotation` | `Number` | `0` | มุมหมุนของวัตถุ (องศา: 0 - 360) |
| `size` | `ObjectSize` | `{ width: 0, depth: 0, height: 0 }` | ขนาดมิติ 3D (`width`, `depth`, `height`) |
| `footprint` | `Polygon2D` | `null` | รูปทรงขอบเขตระนาบ 2D แบบ GeoJSON Polygon (คำนวณอัตโนมัติหากไม่ระบุ) |
| `geo` | `Point2D` | `null` | พิกัด GPS WGS84 โลกจริง: `{"type": "Point", "coordinates": [lng, lat]}` |
| `createdAt` | `Date` | Auto | วันเวลาที่สร้าง |
| `updatedAt` | `Date` | Auto | วันเวลาที่แก้ไขล่าสุด |

**Index พิเศษ**:
- `{ mapId: 1, boothNumber: 1 }` (Unique, Case-insensitive): รหัสบูธต้องไม่ซ้ำกันในแผนที่เดียวกัน
- `{ geo: "2dsphere" }` (Sparse): รองรับการ Query ตำแหน่งทางภูมิศาสตร์บนโลกจริง

---
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
    "rotation": 45.5,
    "geo": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113]
    },
    "boundary": {
      "type": "Polygon",
      "coordinates": [
        [
          [100.5480, 13.9110],
          [100.5500, 13.9110],
          [100.5500, 13.9125],
          [100.5480, 13.9125],
          [100.5480, 13.9110]
        ]
      ]
    }
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
    "rotation": 45.5,
    "geo": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113]
    },
    "boundary": {
      "type": "Polygon",
      "coordinates": [
        [
          [100.5480, 13.9110],
          [100.5500, 13.9110],
          [100.5500, 13.9125],
          [100.5480, 13.9125],
          [100.5480, 13.9110]
        ]
      ]
    },
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
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-15T00:00:00.000Z"
  }
  ```

---

#### 1.4 แก้ไขข้อมูลแผนที่หลัก (Update Map Info / Dimensions)
- **Method / URL**: `PATCH /maps/:id`
- **Path Parameters**:
  - `id` (string, required): UUID ของแผนที่
- **Request Body** (`application/json`):
  สามารถส่งฟิลด์ที่ต้องการแก้ไขเฉพาะบางส่วนได้:
  ```json
  {
    "name": "Challenger Hall 1 (Renovated)",
    "width": 2000,
    "imageUrl": "https://example.com/floorplans/hall1-v2.png",
    "rotation": 90,
    "geo": {
      "type": "Point",
      "coordinates": [100.5500, 13.9120]
    }
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": "e4a2d80d-8df5-430c-99a3-5c0211739f4d",
    "name": "Challenger Hall 1 (Renovated)",
    "building": "Impact Muang Thong Thani",
    "floor": "1",
    "imageUrl": "https://example.com/floorplans/hall1-v2.png",
    "width": 2000,
    "height": 1080,
    "rotation": 90,
    "geo": {
      "type": "Point",
      "coordinates": [100.55, 13.912]
    },
    "createdAt": "2026-09-15T00:00:00.000Z",
    "updatedAt": "2026-09-18T07:30:12.570Z"
  }
  ```

---

#### 1.5 ลบแผนที่หลัก (Delete Map by ID)
- **Method / URL**: `DELETE /maps/:id`
- **คำอธิบาย**: ลบข้อมูลแผนที่ พร้อมทั้ง cascade ลบข้อมูลบูธและโครงข่ายเส้นทางเดิน (Paths) ทั้งหมดที่ผูกอยู่กับแผนที่นี้โดยอัตโนมัติ
- **Path Parameters**:
  - `id` (string, required): UUID ของแผนที่
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Map \"Challenger Hall 1\" and its associated booths and path graph deleted successfully"
  }
  ```

---

#### 1.6 แสดงแผนที่รวมบูธทั้งหมด (Full Map with Booths)
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
    "totalBooths": 1,
    "booths": [
      {
        "id": "bc34c0ad-b624-4ac9-850a-35ca8a830305",
        "boothNumber": "A01",
        "name": "DeepMind AI Showcase",
        "description": "Showcasing the latest in AI and robotics technology",
        "category": "Technology & AI",
        "status": "AVAILABLE",
        "type": "room",
        "position": {
          "type": "Point",
          "coordinates": [120.0, 340.0]
        },
        "rotation": 0,
        "size": {
          "width": 350.5,
          "depth": 420.0,
          "height": 300.0
        },
        "footprint": {
          "type": "Polygon",
          "coordinates": [[
            [120.0, 340.0],
            [470.5, 340.0],
            [470.5, 760.0],
            [120.0, 760.0],
            [120.0, 340.0]
          ]]
        },
        "geo": {
          "type": "Point",
          "coordinates": [100.5489, 13.9113]
        },
        "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
        "createdAt": "2026-09-18T03:10:46.788Z",
        "updatedAt": "2026-09-18T03:10:46.788Z"
      }
    ]
  }
  ```

---

### 2. บูธและตำแหน่งพิกัด (Booths)

#### 2.1 สร้างบูธและบันทึกพิกัดตำแหน่ง (Create Booth)
- **Method / URL**: `POST /maps/:mapId/booths`
- **Path Parameters**:
  - `mapId` (string, required): UUID หรือชื่อฮอลล์ของแผนที่ที่ต้องการผูกบูธไว้
- **Request Body** (`application/json`):
  ส่งข้อมูลตามมาตรฐาน GeoJSON พร้อมขอบเขตพื้นที่ `footprint` (Polygon) ที่ Frontend คำนวณมา:
  ```json
  {
    "boothNumber": "A01",
    "name": "DeepMind AI Showcase",
    "description": "Showcasing the latest in AI and robotics technology",
    "category": "Technology & AI",
    "status": "AVAILABLE",
    "type": "room",
    "position": {
      "type": "Point",
      "coordinates": [120.0, 340.0]
    },
    "rotation": 0,
    "size": {
      "width": 350.5,
      "depth": 420.0,
      "height": 300.0
    },
    "footprint": {
      "type": "Polygon",
      "coordinates": [
        [
          [120.0, 340.0],
          [470.5, 340.0],
          [470.5, 760.0],
          [120.0, 760.0],
          [120.0, 340.0]
        ]
      ]
    },
    "geo": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113]
    }
  }
  ```
  *(หมายเหตุ: หากเคสไหน Frontend ไม่ได้ส่ง `footprint` มา ระบบจะช่วยคำนวณสี่เหลี่ยม 5 จุดพิกัดจาก position + size + rotation ให้เป็น Fallback อัตโนมัติ)*
- **Response** (`201 Created`):
  ```json
  {
    "id": "bc34c0ad-b624-4ac9-850a-35ca8a830305",
    "boothNumber": "A01",
    "name": "DeepMind AI Showcase",
    "description": "Showcasing the latest in AI and robotics technology",
    "category": "Technology & AI",
    "status": "AVAILABLE",
    "type": "room",
    "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
    "position": {
      "type": "Point",
      "coordinates": [120.0, 340.0]
    },
    "rotation": 0,
    "size": {
      "width": 350.5,
      "depth": 420.0,
      "height": 300.0
    },
    "footprint": {
      "type": "Polygon",
      "coordinates": [[
        [120.0, 340.0],
        [470.5, 340.0],
        [470.5, 760.0],
        [120.0, 760.0],
        [120.0, 340.0]
      ]]
    },
    "geo": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113]
    },
    "createdAt": "2026-09-18T03:10:46.788Z",
    "updatedAt": "2026-09-18T03:10:46.788Z"
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
      "id": "bc34c0ad-b624-4ac9-850a-35ca8a830305",
      "boothNumber": "A01",
      "name": "DeepMind AI Showcase",
      "description": "Showcasing the latest in AI and robotics technology",
      "category": "Technology & AI",
      "status": "AVAILABLE",
      "type": "room",
      "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
      "position": {
        "type": "Point",
        "coordinates": [120.0, 340.0]
      },
      "rotation": 0,
      "size": {
        "width": 350.5,
        "depth": 420.0,
        "height": 300.0
      },
      "footprint": {
        "type": "Polygon",
        "coordinates": [[
          [120.0, 340.0],
          [470.5, 340.0],
          [470.5, 760.0],
          [120.0, 760.0],
          [120.0, 340.0]
        ]]
      },
      "geo": {
        "type": "Point",
        "coordinates": [100.5489, 13.9113]
      },
      "createdAt": "2026-09-18T03:10:46.788Z",
      "updatedAt": "2026-09-18T03:10:46.788Z"
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
    "id": "bc34c0ad-b624-4ac9-850a-35ca8a830305",
    "boothNumber": "A01",
    "name": "DeepMind AI Showcase",
    "description": "Showcasing the latest in AI and robotics technology",
    "category": "Technology & AI",
    "status": "AVAILABLE",
    "type": "room",
    "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
    "position": {
      "type": "Point",
      "coordinates": [120.0, 340.0]
    },
    "rotation": 0,
    "size": {
      "width": 350.5,
      "depth": 420.0,
      "height": 300.0
    },
    "footprint": {
      "type": "Polygon",
      "coordinates": [[
        [120.0, 340.0],
        [470.5, 340.0],
        [470.5, 760.0],
        [120.0, 760.0],
        [120.0, 340.0]
      ]]
    },
    "geo": {
      "type": "Point",
      "coordinates": [100.5489, 13.9113]
    },
    "createdAt": "2026-09-18T03:10:46.788Z",
    "updatedAt": "2026-09-18T03:10:46.788Z"
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
    "position": {
      "type": "Point",
      "coordinates": [150.0, 380.0]
    },
    "rotation": 45
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

### 3. โครงข่ายเส้นทางเดินสำหรับคำนวณ A* (Paths / Navigation Graph)

ระบบจัดเก็บโครงข่ายทางเดิน (Nodes & Edges) ประจำแผนที่ เพื่อให้ Frontend ดึงข้อมูลออกไปรันอัลกอริทึม A* (A-Star) บน Client-side แบบ Real-time ได้ทันที

#### 3.1 บันทึกหรืออัปเดตโครงข่ายเส้นทางเดิน (Save / Upsert Path Graph)
- **Method / URL**: `POST /maps/:mapId/paths`
- **Path Parameters**:
  - `mapId` (string, required): UUID ของแผนที่ที่ต้องการผูกเส้นทางเดิน
- **Request Body** (`application/json`):
  ```json
  {
    "nodes": [
      {
        "id": "n1",
        "name": "หน้าทางเข้าฮอลล์ 1",
        "type": "door",
        "position": { "type": "Point", "coordinates": [100.0, 200.0] }
      },
      {
        "id": "n2",
        "name": "ทางแยกหลัก",
        "type": "intersection",
        "position": { "type": "Point", "coordinates": [100.0, 340.0] }
      },
      {
        "id": "n3",
        "name": "จุดเชื่อมต่อหน้าบูธ A01",
        "type": "waypoint",
        "position": { "type": "Point", "coordinates": [120.0, 340.0] }
      }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "bidirectional": true },
      { "from": "n2", "to": "n3", "bidirectional": true }
    ]
  }
  ```
  *(หมายเหตุ: หากใน `edges` ไม่ได้ระบุ `weight` ระบบจะคำนวณระยะทางแบบ Euclidean Distance จากพิกัด x, y ให้โดยอัตโนมัติ)*
- **Response** (`200 OK`):
  ```json
  {
    "id": "63724ece-dc31-4085-95d5-b7b3b14dbca9",
    "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
    "totalNodes": 3,
    "totalEdges": 2,
    "nodes": [
      {
        "id": "n1",
        "name": "หน้าทางเข้าฮอลล์ 1",
        "type": "door",
        "position": { "type": "Point", "coordinates": [100, 200] }
      },
      {
        "id": "n2",
        "name": "ทางแยกหลัก",
        "type": "intersection",
        "position": { "type": "Point", "coordinates": [100, 340] }
      },
      {
        "id": "n3",
        "name": "จุดเชื่อมต่อหน้าบูธ A01",
        "type": "waypoint",
        "position": { "type": "Point", "coordinates": [120, 340] }
      }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "weight": 140, "bidirectional": true, "accessible": true },
      { "from": "n2", "to": "n3", "weight": 20, "bidirectional": true, "accessible": true }
    ],
    "createdAt": "2026-09-18T04:53:37.653Z",
    "updatedAt": "2026-09-18T05:03:04.837Z"
  }
  ```

---

#### 3.2 อัปเดตโครงข่ายเส้นทางเดินบางส่วน (Partial Update / Safe PATCH)
- **Method / URL**: `PATCH /maps/:mapId/paths`
- **คำอธิบาย**: แก้ไขโครงข่ายเส้นทางเดินเฉพาะจุด เช่น ย้ายพิกัด Node, ลบจุด, เพิ่มจุด หรือลบเส้นเชื่อม โดยระบบจะรักษา **Data Integrity** ให้อัตโนมัติ:
  - **`moveNodes`**: ย้ายพิกัด x, y ของจุด และ **คำนวณระยะทาง weight ของ Edges ที่เชื่อมต่ออยู่ใหม่ให้อัตโนมัติทันที**
  - **`deleteNodeIds`**: ลบจุด พร้อม **Cascade ลบ Edges ที่เชื่อมต่ออยู่ทั้งหมด** ป้องกันเส้นทางขาดหรือลอย (Dangling edges)
  - **`addNodes` / `addEdges`**: เพิ่มจุดหรือเส้นเชื่อมโยงใหม่ พร้อม Validation ป้องกัน Self-loop และ Duplicate
  - **`deleteEdges`**: ลบเส้นเชื่อมโยงเฉพาะเส้น
- **Request Body** (`application/json`):
  ```json
  {
    "moveNodes": [
      { "id": "n1", "x": 100.0, "y": 150.0 }
    ],
    "deleteNodeIds": ["n3"],
    "addEdges": [
      { "from": "n1", "to": "n2", "bidirectional": true }
    ]
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "id": "63724ece-dc31-4085-95d5-b7b3b14dbca9",
    "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
    "totalNodes": 2,
    "totalEdges": 1,
    "isolatedNodesCount": 0,
    "isolatedNodeIds": [],
    "nodes": [...],
    "edges": [...]
  }
  ```

---

#### 3.3 ดึงโครงข่ายเส้นทางเดินของแผนที่ (Get Path Graph for A* Calculation)
- **Method / URL**: `GET /maps/:mapId/paths`
- **Path Parameters**:
  - `mapId` (string, required): UUID ของแผนที่
- **Response** (`200 OK`):
  ```json
  {
    "mapId": "1f17f7c7-f2c1-43f3-9768-2c4050c67873",
    "totalNodes": 3,
    "totalEdges": 2,
    "nodes": [
      {
        "id": "n1",
        "name": "หน้าทางเข้าฮอลล์ 1",
        "type": "door",
        "position": { "type": "Point", "coordinates": [100, 200] }
      },
      {
        "id": "n2",
        "name": "ทางแยกหลัก",
        "type": "intersection",
        "position": { "type": "Point", "coordinates": [100, 340] }
      },
      {
        "id": "n3",
        "name": "จุดเชื่อมต่อหน้าบูธ A01",
        "type": "waypoint",
        "position": { "type": "Point", "coordinates": [120, 340] }
      }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "weight": 140, "bidirectional": true, "accessible": true },
      { "from": "n2", "to": "n3", "weight": 20, "bidirectional": true, "accessible": true }
    ]
  }
  ```
  *(นอกจากนี้ยังสามารถดึงข้อมูลเส้นทางนี้พร้อมกับผังและบูธได้โดยตรงผ่าน `GET /maps/:id/full` ฟิลด์ `paths`)*

---

#### 3.3 ลบโครงข่ายเส้นทางเดิน (Delete Path Graph)
- **Method / URL**: `DELETE /maps/:mapId/paths`
- **Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Path graph for map \"Challenger Hall 1\" deleted"
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
