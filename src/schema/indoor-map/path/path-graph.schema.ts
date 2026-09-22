import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Point2D, Point2DSchema } from '../booth/booth.schema';

export type PathNodeDocument = PathNode & Document;

// จุดเชื่อมต่อบนทางเดิน (Node / Waypoint) - 1 Node = 1 Document ใน collection path_nodes
// ไม่เก็บเป็น Array ก้อนเดียวใน Map เพื่อรองรับมากกว่า 300 บูธ และจุดเชื่อมต่อหลักพันจุดอย่างไร้ขีดจำกัด
@Schema({
  timestamps: true,
  collection: 'path_nodes',
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class PathNode {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  // ผูกกับแผนที่หลัก (UUID string)
  @Prop({ required: true, type: String })
  mapId: string;

  // รหัสอ้างอิง Node ในแผนที่ (เช่น "n1", "wp-01", "door-a01")
  @Prop({ required: true, type: String })
  nodeId: string;

  @Prop({ type: String })
  name?: string; // ชื่อจุด เช่น "หน้าทางเข้าฮอลล์ 1", "สี่แยกกลาง"

  @Prop({ type: String, default: 'waypoint' })
  type?: string; // ประเภท เช่น "waypoint", "door", "intersection", "elevator", "stairs"

  // พิกัดตำแหน่งบนระนาบ 2D แปลนอาคาร: GeoJSON Point [x, y]
  @Prop({ type: Point2DSchema, required: true })
  position: Point2D;

  // รายการรหัส Node ID ที่เชื่อมต่อกับจุดนี้โดยตรง (Adjacency List)
  // ไม่ต้องมี Collection Edge แยก แต่ละจุดจะรู้ว่าตนเองเดินไปจุดไหนได้บ้าง
  @Prop({ type: [String], default: [] })
  connectedNodeIds: string[];
}

export const PathNodeSchema = SchemaFactory.createForClass(PathNode);

// 1. Index ค้นหาโหนดทั้งหมดของแผนที่ (mapId) ได้อย่างรวดเร็ว (IXSCAN แทน COLLSCAN)
PathNodeSchema.index({ mapId: 1 });

// 2. Compound Unique Index: ป้องกันรหัส nodeId ซ้ำกันในแผนที่เดียวกัน
PathNodeSchema.index(
  { mapId: 1, nodeId: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

// 3. Geospatial Index (2dsphere): รองรับการค้นหาจุดพิกัดเชิงพื้นที่และ Nearest Node
PathNodeSchema.index({ position: '2dsphere' }, { sparse: true });

// Type definition สำหรับ Edge ที่คำนวณแบบ Dynamic เพื่อส่งให้ Frontend findRoute ใช้
export class PathEdge {
  id?: string;
  from: string;
  to: string;
  kind?: string;
  bidirectional?: boolean;
  accessible?: boolean;
  open: boolean;
  verified: boolean;
}
