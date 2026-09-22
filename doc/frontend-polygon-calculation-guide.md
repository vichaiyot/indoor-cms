# คู่มือการคำนวณพิกัด Polygon รูปทรงเรขาคณิตสำหรับ Frontend (Client-Side Geometry Calculation Guide)

เอกสารนี้จัดทำขึ้นสำหรับทีมนักพัฒนา **Frontend (Web CMS / 2D Canvas / 3D Three.js)** เพื่อเป็นแนวทางในการคำนวณพิกัดรูปทรงเรขาคณิต (Rectangle, Circle, Hexagon, Custom Building Contours, Atrium Holes) และแปลงเป็นโครงสร้างมาตรฐาน **GeoJSON Polygon RFC 7946** เพื่อส่งมาจัดเก็บที่ Backend และนำไปเรนเดอร์ 3D ในแอปพลิเคชัน

---

## 1. ทำไมต้องคำนวณพิกัดที่ Frontend? (Architecture & Rationale)

ตามหลักสากลของการออกแบบระบบผังอาคารขนาดใหญ่ (Large-Scale Indoor Mapping System ที่รองรับมากกว่า 300 บูธ และผู้ใช้งานพร้อมกันจำนวนมาก):

1. **Write-time Computation vs Read-time Computation:**
   - การคำนวณเรขาคณิตตรีโกณมิติ ($\sin$, $\cos$, rotation matrix) จะเกิดขึ้นเพียง **ครั้งเดียว** ในขั้นตอนที่ User ลาก วาด ปรับขนาด หรือหมุนออบเจกต์ในหน้า CMS Editor (Write-time)
   - เมื่อกดบันทึก พิกัดจะถูกส่งมาเก็บเป็น GeoJSON Coordinates ใน MongoDB ทันที
2. **Zero Read Latency ($O(1)$):**
   - เมื่อผู้ใช้งานปลายทาง (End-user / Mobile / Web Viewer) เปิดดูแผนที่ Backend จะดึงพิกัดจาก Database แล้วส่งกลับได้ทันทีโดยไม่ต้องคำนวณลูปตรีโกณมิติซ้ำซ้อนสำหรับ 300+ บูธ ช่วยตัดคอขวด CPU ของเซิร์ฟเวอร์
3. **ความยืดหยุ่นของรูปทรงอิสระ (Total Freedom):**
   - Frontend สามารถปรับแต่งรูปทรงตามสถาปัตยกรรมอาคารจริงได้ไม่จำกัด (เช่น ปาดมุมโค้ง, ผนังเอียง, ช่องโถงเจาะทะลุ) โดยไม่ต้องผูกมัดกับสูตรสี่เหลี่ยม

---

## 2. โครงสร้างมาตรฐาน GeoJSON Polygon (RFC 7946)

Backend จัดเก็บพิกัดขอบเขต (`footprint`) ของบูธและอาคารในรูปแบบ **GeoJSON Polygon** ดังนี้:

```typescript
interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][]; // Array ของ Linear Rings
}
```

### กฎสำคัญตามมาตรฐาน GeoJSON:
1. **Outer Ring (ขอบเขตนอก):** คือ `coordinates[0]` ต้องมีจุดอย่างน้อย 4 จุด (สามเหลี่ยม + จุดปิด) และเรียงลำดับจุดแบบ **ทวนเข็มนาฬิกา (Counter-Clockwise - CCW)**
2. **Inner Rings (รูเจาะทะลุ / โถงกลางอาคาร / บันไดเลื่อน):** คือ `coordinates[1]` ถึง `coordinates[n]` เรียงลำดับจุดแบบ **ตามเข็มนาฬิกา (Clockwise - CW)**
3. **Closed Loop:** จุดแรกและจุดสุดท้ายของแต่ละ Ring **ต้องเป็นพิกัดเดียวกันเสมอ** (`firstPoint == lastPoint`)

```
      Outer Ring (ทวนเข็ม CCW)
  (0, 100) ◄────────────── (100, 100)
     │                         ▲
     │    Inner Hole (ตามเข็ม) │
     │    (20,80) ──► (80,80)  │
     │       ▲          │      │
     │       │          ▼      │
     │    (20,20) ◄── (80,20)  │
     ▼                         │
   (0, 0) ──────────────► (100, 0)
```

---

## 3. Utility Functions ภาษา TypeScript สำหรับ Frontend

คุณสามารถสร้างไฟล์ `geometry.utils.ts` ในฝั่ง Frontend แล้วคัดลอกฟังก์ชันต่อไปนี้ไปใช้งานได้ทันที:

```typescript
// geometry.utils.ts

export type Point2D = [number, number];

export interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: Point2D[][];
}

/**
 * 1. คำนวณพิกัดสี่เหลี่ยมมุมฉาก (Rectangle) พร้อมการหมุน (Rotation)
 * @param x พิกัดแกน X (จุดอ้างอิง)
 * @param y พิกัดแกน Y (จุดอ้างอิง)
 * @param width ความกว้าง
 * @param depth ความลึก/ความยาว
 * @param rotation องศาการหมุน (0 - 360)
 * @param origin จุดหมุน ('top-left' หรือ 'center') ค่าเริ่มต้นคือ 'top-left'
 */
export function calculateRectanglePolygon(params: {
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation?: number;
  origin?: 'top-left' | 'center';
}): GeoJsonPolygon {
  const { x, y, width, depth, rotation = 0, origin = 'top-left' } = params;

  // กำหนดจุดมุม 4 จุดรอบจุดกำเนิด
  let rawCorners: Point2D[];
  let pivotX = x;
  let pivotY = y;

  if (origin === 'center') {
    const halfW = width / 2;
    const halfD = depth / 2;
    rawCorners = [
      [-halfW, -halfD],
      [halfW, -halfD],
      [halfW, halfD],
      [-halfW, halfD],
    ];
  } else {
    // top-left
    rawCorners = [
      [0, 0],
      [width, 0],
      [width, depth],
      [0, depth],
    ];
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const rotated: Point2D[] = rawCorners.map(([dx, dy]) => {
    const rx = origin === 'center' ? x + (dx * cos - dy * sin) : pivotX + (dx * cos - dy * sin);
    const ry = origin === 'center' ? y + (dx * sin + dy * cos) : pivotY + (dx * sin + dy * cos);
    return [Number(rx.toFixed(4)), Number(ry.toFixed(4))];
  });

  // ปิด Ring ด้วยการเชื่อมจุดแรกกลับเข้ามา
  rotated.push([...rotated[0]]);

  return {
    type: "Polygon",
    coordinates: [rotated],
  };
}

/**
 * 2. คำนวณพิกัดวงกลม (Circle Approximation)
 * ใช้สำหรับเสากลม, เวทีวงกลม, หรือบูธดีไซน์โค้งมน
 * @param cx จุดกึ่งกลาง X
 * @param cy จุดกึ่งกลาง Y
 * @param radius รัศมี
 * @param segments จำนวนจุดโค้งรอบวง (แนะนำ 32 หรือ 48 จุด เพื่อความเนียนใน 3D)
 */
export function calculateCirclePolygon(params: {
  cx: number;
  cy: number;
  radius: number;
  segments?: number;
}): GeoJsonPolygon {
  const { cx, cy, radius, segments = 32 } = params;
  const ring: Point2D[] = [];

  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const px = cx + radius * Math.cos(theta);
    const py = cy + radius * Math.sin(theta);
    ring.push([Number(px.toFixed(4)), Number(py.toFixed(4))]);
  }

  // ปิด Ring (จุดแรก == จุดสุดท้าย)
  ring.push([...ring[0]]);

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

/**
 * 3. คำนวณพิกัดรูปหลายเหลี่ยมด้านเท่า (Regular Polygon เช่น หกเหลี่ยม Hexagon, แปดเหลี่ยม Octagon)
 * @param cx จุดกึ่งกลาง X
 * @param cy จุดกึ่งกลาง Y
 * @param radius รัศมีจากจุดศูนย์กลางถึงมุม
 * @param sides จำนวนเหลี่ยม (เช่น 6 = หกเหลี่ยม, 8 = แปดเหลี่ยม)
 * @param rotation องศาการหมุน (0 - 360)
 */
export function calculateRegularPolygon(params: {
  cx: number;
  cy: number;
  radius: number;
  sides?: number;
  rotation?: number;
}): GeoJsonPolygon {
  const { cx, cy, radius, sides = 6, rotation = 0 } = params;
  const ring: Point2D[] = [];
  const radOffset = (rotation * Math.PI) / 180;

  for (let i = 0; i < sides; i++) {
    const theta = (i / sides) * 2 * Math.PI + radOffset;
    const px = cx + radius * Math.cos(theta);
    const py = cy + radius * Math.sin(theta);
    ring.push([Number(px.toFixed(4)), Number(py.toFixed(4))]);
  }

  // ปิด Ring
  ring.push([...ring[0]]);

  return {
    type: "Polygon",
    coordinates: [ring],
  };
}

/**
 * 4. รวมพิกัดขอบเขตอาคาร + รูเจาะช่องโถง/บันไดเลื่อน (Polygon with Holes / Atrium)
 * ใช้สำหรับผังห้างสรรพสินค้า (เช่น Future Park / Zpell) ที่มีโถงกลางทะลุลงไปชั้นล่าง
 * @param outerBoundary ชุดพิกัดขอบเขตภายนอกอาคาร (ทวนเข็มนาฬิกา CCW)
 * @param holes ชุดพิกัดช่องโถงภายใน (ตามเข็มนาฬิกา CW)
 */
export function createPolygonWithHoles(params: {
  outerBoundary: Point2D[];
  holes: Point2D[][];
}): GeoJsonPolygon {
  const { outerBoundary, holes } = params;

  // ตรวจสอบว่า outer ring ปิดแล้วหรือยัง
  const closedOuter = [...outerBoundary];
  if (
    closedOuter[0][0] !== closedOuter[closedOuter.length - 1][0] ||
    closedOuter[0][1] !== closedOuter[closedOuter.length - 1][1]
  ) {
    closedOuter.push([...closedOuter[0]]);
  }

  // ตรวจสอบว่าแต่ละ hole ปิดแล้วหรือยัง
  const closedHoles = holes.map((hole) => {
    const closed = [...hole];
    if (
      closed[0][0] !== closed[closed.length - 1][0] ||
      closed[0][1] !== closed[closed.length - 1][1]
    ) {
      closed.push([...closed[0]]);
    }
    return closed;
  });

  return {
    type: "Polygon",
    coordinates: [closedOuter, ...closedHoles],
  };
}
```

---

## 4. โครงสร้าง Payload ที่ต้องส่งไป Backend (API Payload Example)

เมื่อผู้ใช้แก้ไขหรือวาดบูธใน Frontend Editor ให้คำนวณ `footprint` ด้วยฟังก์ชันด้านบน แล้วส่งไปที่ Backend ผ่าน `POST /maps/:mapId/booths` หรือ `PATCH /booths/:id`

### 4.1 ตัวอย่างบูธสี่เหลี่ยม (`shapeType: 'rectangle'`)
```json
{
  "boothNumber": "A101",
  "name": "Samsung Flagship",
  "category": "Electronics",
  "shapeType": "rectangle",
  "position": {
    "type": "Point",
    "coordinates": [150.0, 300.0]
  },
  "rotation": 15,
  "size": {
    "width": 120.0,
    "depth": 80.0,
    "height": 45.0
  },
  "footprint": {
    "type": "Polygon",
    "coordinates": [
      [
        [150.0, 300.0],
        [265.911, 331.0583],
        [245.172, 408.3364],
        [129.261, 377.2781],
        [150.0, 300.0]
      ]
    ]
  },
  "entryNodeId": "n12"
}
```

### 4.2 ตัวอย่างบูธทรงกลม (`shapeType: 'circle'`)
```json
{
  "boothNumber": "C01",
  "name": "Central Coffee Pavilion",
  "category": "Food & Beverage",
  "shapeType": "circle",
  "radius": 40.0,
  "position": {
    "type": "Point",
    "coordinates": [500.0, 400.0]
  },
  "size": {
    "width": 80.0,
    "depth": 80.0,
    "height": 35.0
  },
  "footprint": {
    "type": "Polygon",
    "coordinates": [
      [
        [540.0, 400.0],
        [539.2312, 407.8037],
        [536.9552, 415.3073],
        [533.2592, 422.2224],
        "...อีก 28 จุด...",
        [540.0, 400.0]
      ]
    ]
  },
  "entryNodeId": "n45"
}
```

### 4.3 ตัวอย่างบูธหกเหลี่ยม (`shapeType: 'hexagon'`)
```json
{
  "boothNumber": "H01",
  "name": "VR Experience Dome",
  "category": "Entertainment",
  "shapeType": "hexagon",
  "radius": 35.0,
  "rotation": 30,
  "position": {
    "type": "Point",
    "coordinates": [700.0, 250.0]
  },
  "size": {
    "width": 70.0,
    "depth": 70.0,
    "height": 50.0
  },
  "footprint": {
    "type": "Polygon",
    "coordinates": [
      [
        [730.3109, 267.5],
        [700.0, 285.0],
        [669.6891, 267.5],
        [669.6891, 232.5],
        [700.0, 215.0],
        [730.3109, 232.5],
        [730.3109, 267.5]
      ]
    ]
  },
  "entryNodeId": "n60"
}
```

### 4.4 ตัวอย่างผังอาคาร/โถงกลางที่มีรูเจาะ (`shapeType: 'custom'` with holes)
```json
{
  "boothNumber": "MALL-MAIN-HALL",
  "name": "Level 1 Main Atrium Zone",
  "shapeType": "custom",
  "position": {
    "type": "Point",
    "coordinates": [0.0, 0.0]
  },
  "size": {
    "width": 1000.0,
    "depth": 800.0,
    "height": 60.0
  },
  "footprint": {
    "type": "Polygon",
    "coordinates": [
      [
        [0.0, 0.0],
        [1000.0, 0.0],
        [1000.0, 800.0],
        [0.0, 800.0],
        [0.0, 0.0]
      ],
      [
        [400.0, 300.0],
        [600.0, 300.0],
        [600.0, 500.0],
        [400.0, 500.0],
        [400.0, 300.0]
      ]
    ]
  }
}
```

---

## 5. การนำพิกัด Polygon ไปเรนเดอร์ 3D ใน Three.js

เมื่อ Frontend ดึงข้อมูล `footprint` มาจาก Backend การสร้างวัตถุ 3D (3D Extruded Mesh) จะใช้ `THREE.Shape` และ `THREE.ExtrudeGeometry` ดังนี้:

### 5.1 Three.js Geometry Generator Helper
```typescript
// three-geometry.utils.ts
import * as THREE from 'three';

export interface BoothModelData {
  footprint?: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  size?: {
    width: number;
    depth: number;
    height: number;
  };
}

/**
 * สร้าง THREE.ExtrudeGeometry จาก GeoJSON Polygon Coordinates
 * รองรับทั้งขอบเขตภายนอก และรูเจาะโถงกลาง (Holes)
 */
export function createExtrudedGeometryFromGeoJSON(
  data: BoothModelData,
  defaultHeight: number = 30
): THREE.BufferGeometry {
  if (!data.footprint?.coordinates || data.footprint.coordinates.length === 0) {
    // Fallback เป็น BoxGeometry หากไม่มี footprint
    const w = data.size?.width || 50;
    const d = data.size?.depth || 50;
    const h = data.size?.height || defaultHeight;
    return new THREE.BoxGeometry(w, h, d);
  }

  const rings = data.footprint.coordinates;
  const outerRing = rings[0]; // [ [x, y], [x, y], ... ]

  // 1. สร้างเส้นขอบนอก (Outer Shape)
  const shape = new THREE.Shape();
  if (outerRing.length > 0) {
    shape.moveTo(outerRing[0][0], outerRing[0][1]);
    for (let i = 1; i < outerRing.length; i++) {
      shape.lineTo(outerRing[i][0], outerRing[i][1]);
    }
  }

  // 2. เจาะรูโถงกลาง/บันไดเลื่อน (Interior Holes) หากมี
  for (let r = 1; r < rings.length; r++) {
    const holeRing = rings[r];
    if (holeRing.length > 0) {
      const holePath = new THREE.Path();
      holePath.moveTo(holeRing[0][0], holeRing[0][1]);
      for (let i = 1; i < holeRing.length; i++) {
        holePath.lineTo(holeRing[i][0], holeRing[i][1]);
      }
      shape.holes.push(holePath);
    }
  }

  // 3. กำหนดความสูงของการดึงโมเดล 3D (Extrusion)
  const extrudeHeight = data.size?.height || defaultHeight;
  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: extrudeHeight,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 1,
    bevelThickness: 1,
  };

  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

  // 4. ปรับการหมุนระนาบ: Three.js ExtrudeGeometry ดึงความหนาในแนวแกน Z
  // แต่ในงาน Indoor Map ระนาบพื้นคือ X-Z และความสูงคือแกน Y
  // หมุน -90 องศารอบแกน X เพื่อให้ตั้งบนพื้นโลก 3D อย่างถูกต้อง
  geometry.rotateX(-Math.PI / 2);

  return geometry;
}
```

### 5.2 ตัวอย่าง Component ใน React Three Fiber
```tsx
import React, { useMemo } from 'react';
import { createExtrudedGeometryFromGeoJSON } from './three-geometry.utils';

export function BoothMesh({ booth, onClick }) {
  const geometry = useMemo(() => {
    return createExtrudedGeometryFromGeoJSON(booth, 35);
  }, [booth.footprint, booth.size]);

  const color = booth.status === 'AVAILABLE' ? '#4ade80' : '#f87171';

  return (
    <mesh
      geometry={geometry}
      onClick={() => onClick?.(booth)}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  );
}
```

---

## 6. เวิร์กโฟลว์การอัปโหลดภาพแปลนและวาดทับ (Blueprint Tracing Workflow)

สำหรับการทำงานในโหมด **"อัปโหลดภาพแปลนอาคาร แล้วใช้เมาส์วาดทับขอบเขตบูธ/ผนัง (Trace Over Blueprint)"**:

### 6.1 การอัปโหลดไฟล์ภาพแปลนขึ้นสู่เซิร์ฟเวอร์
Frontend สามารถส่งไฟล์รูปแปลน (PNG, JPG, JPEG, WEBP, SVG) ไปยัง Backend ผ่าน Endpoint:
- **Method:** `POST /maps/:id/upload-plan`
- **Content-Type:** `multipart/form-data`
- **Body Fields:**
  - `file`: ไฟล์รูปภาพแปลนอาคาร (ขนาดไม่เกิน 25MB)
  - `width` (optional): ความกว้างของแปลน (canvas width เช่น 2000)
  - `height` (optional): ความยาว/สูงของแปลน (canvas height เช่น 1500)

**ตัวอย่าง Response ที่ได้กลับมา:**
```json
{
  "id": "8e1edfe9-79fa-4c6d-9b55-51ff709fb6c7",
  "name": "Main Hall Level 1",
  "width": 2000,
  "height": 1500,
  "imageUrl": "/uploads/blueprint-1790006315221-97f1b915.svg"
}
```
*URL รูปภาพสามารถเข้าถึงได้โดยตรงที่: `http://localhost:3001/uploads/blueprint-1790006315221-97f1b915.svg`*

### 6.2 การวางภาพแปลนบน 2D Canvas และวาดทับ
1. **Layer ล่าง (Background Blueprint):** โหลดรูปจาก `map.imageUrl` มาขยายให้เต็มผืนผ้าใบขนาด `width x height`
2. **Layer บน (Drawing Canvas):** เมื่อผู้ใช้คลิกเมาส์ลากเส้นตามขอบเขตบูธบนแปลน ให้บันทึกจุดยอด `[x, y]` สัมพัทธ์กับภาพแปลน
3. **การส่งบันทึก (Save Traced Booth):**
   - นำชุดพิกัดที่ได้มาปิด Loop (ใส่จุดแรกลงท้ายสุด) แล้วส่งไปที่ `POST /maps/:mapId/booths`
   - **Backend จะบันทึกชุดพิกัดที่คุณวาดมาตรงๆ 100% โดยไม่มีการคำนวณสูตรคณิตศาสตร์ใดๆ มาทับข้อมูล**

---

## 7. สรุป Checklist สำหรับ Frontend Developer

| ขั้นตอน | งานที่ต้องทำ | เครื่องมือ / ฟังก์ชัน |
| :--- | :--- | :--- |
| **1. Upload Blueprint** | อัปโหลดรูปภาพแปลนอาคาร (PNG/JPG/SVG) | `POST /maps/:id/upload-plan` |
| **2. Canvas Background** | แสดงภาพแปลนเป็นพื้นหลังบน Canvas | Image Element / Konva Image / Fabric Image |
| **3. Manual Tracing** | ผู้ใช้วาดจุดตามแนวเส้นของบูธบนภาพแปลน | Canvas Path / Polygon Drawing Tool |
| **4. Save Footprint** | ส่งพิกัด GeoJSON Polygon ที่วาดเสร็จแล้วเข้า Backend | `POST /maps/:mapId/booths` หรือ `PATCH /booths/:id` |
| **5. 3D Extrusion** | แปลง GeoJSON Polygon สู่ `THREE.Shape` และ Extrude เป็นโมเดล 3D | `THREE.ExtrudeGeometry` (ตามข้อ 5) |
| **6. Navigation Link** | กำหนด `entryNodeId` เพื่อเชื่อมต่อทางเดินหน้าบูธ | Node Editor / Dropdown เลือกโหนด |

