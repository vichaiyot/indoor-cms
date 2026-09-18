import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Point2D, Point2DSchema } from '../booth/booth.schema';

export type PathGraphDocument = PathGraph & Document;

// Sub-schema: จุดเชื่อมต่อบนทางเดิน (Node / Waypoint)
@Schema({ _id: false })
export class PathNode {
  @Prop({ required: true, type: String })
  id: string; // เช่น "n1", "wp-01", "door-a01"

  @Prop({ type: String })
  name?: string; // ชื่อจุด เช่น "หน้าทางเข้าฮอลล์ 1", "สี่แยกกลาง"

  @Prop({ type: String, default: 'waypoint' })
  type?: string; // ประเภท เช่น "waypoint", "door", "intersection", "elevator", "stairs"

  // พิกัดตำแหน่งบนระนาบ 2D แปลนอาคาร: GeoJSON Point [x, y]
  @Prop({ type: Point2DSchema, required: true })
  position: Point2D;
}
export const PathNodeSchema = SchemaFactory.createForClass(PathNode);

// Sub-schema: เส้นทางเดินที่เชื่อมระหว่างสองจุด (Edge / Segment)
@Schema({ _id: false })
export class PathEdge {
  @Prop({ required: true, type: String })
  from: string; // Node ID ต้นทาง

  @Prop({ required: true, type: String })
  to: string; // Node ID ปลายทาง

  @Prop({ type: Number, default: 0 })
  weight: number; // ระยะทาง (คำนวณอัตโนมัติหากไม่ระบุ)

  @Prop({ type: Boolean, default: true })
  bidirectional: boolean; // เดินได้ 2 ฝั่งไป-กลับหรือไม่

  @Prop({ type: Boolean, default: true })
  accessible: boolean; // เหมาะสำหรับเก้าอี้เข็น/ทางลาดหรือไม่
}
export const PathEdgeSchema = SchemaFactory.createForClass(PathEdge);

@Schema({
  timestamps: true,
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
export class PathGraph {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  // ผูกกับแผนที่หลัก (UUID string)
  @Prop({ required: true, type: String })
  mapId: string;

  // รายการ Node ทั้งหมดในเครือข่ายทางเดิน
  @Prop({ type: [PathNodeSchema], default: [] })
  nodes: PathNode[];

  // รายการ Edge ที่เชื่อมโยงระหว่าง Node
  @Prop({ type: [PathEdgeSchema], default: [] })
  edges: PathEdge[];
}

export const PathGraphSchema = SchemaFactory.createForClass(PathGraph);

// 1. ค้นหากราฟทางเดินด้วย mapId อย่างรวดเร็ว (1 Map มี 1 Navigation Graph)
PathGraphSchema.index({ mapId: 1 }, { unique: true });
