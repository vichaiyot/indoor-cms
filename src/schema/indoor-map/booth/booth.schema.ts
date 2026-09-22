import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BoothDocument = Booth & Document;

export enum BoothStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
}

export enum BoothShapeType {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  HEXAGON = 'hexagon',
  CUSTOM = 'custom',
}

// 2D Point sub-schema (GeoJSON Point format [x, y] or [lng, lat])
@Schema({ _id: false })
export class Point2D {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true })
  coordinates: number[];
}
export const Point2DSchema = SchemaFactory.createForClass(Point2D);

// 2D Footprint Polygon sub-schema (GeoJSON Polygon format [[[x, y], ...]])
@Schema({ _id: false })
export class Polygon2D {
  @Prop({ type: String, enum: ['Polygon'], default: 'Polygon' })
  type: string;

  @Prop({ type: [[[Number]]], required: true })
  coordinates: number[][][];
}
export const Polygon2DSchema = SchemaFactory.createForClass(Polygon2D);

// Object 3D Dimensions sub-schema
@Schema({ _id: false })
export class ObjectSize {
  @Prop({ type: Number, default: 0 })
  width: number;

  @Prop({ type: Number, default: 0 })
  depth: number;

  @Prop({ type: Number, default: 0 })
  height: number;
}
export const ObjectSizeSchema = SchemaFactory.createForClass(ObjectSize);

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
export class Booth {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, type: String, maxlength: 50 })
  boothNumber: string;

  @Prop({ required: true, type: String, maxlength: 255 })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: String, maxlength: 100 })
  category?: string;

  @Prop({
    type: String,
    enum: BoothStatus,
    default: BoothStatus.AVAILABLE,
  })
  status: BoothStatus;

  // ประเภทของออบเจกต์ (e.g. 'room', 'booth', 'facility', 'restroom')
  @Prop({ type: String, default: 'room' })
  type: string;

  // Reference to parent Map (UUID string)
  @Prop({ required: true, type: String })
  mapId: string;

  // พิกัดตำแหน่งบนระนาบ 2D ผังอาคาร: GeoJSON Point [x, y]
  @Prop({ type: Point2DSchema, required: true })
  position: Point2D;

  // องศาการหมุนของออบเจกต์
  @Prop({ type: Number, default: 0 })
  rotation: number;

  // ขนาดมิติ 3D (กว้าง x ลึก x สูง)
  @Prop({
    type: ObjectSizeSchema,
    default: () => ({ width: 0, depth: 0, height: 0 }),
  })
  size: ObjectSize;

  // รูปทรงขอบเขตระนาบ 2D บน Canvas (GeoJSON Polygon)
  @Prop({ type: Polygon2DSchema })
  footprint?: Polygon2D;

  // ประเภทรูปทรงเรขาคณิต (rectangle, circle, hexagon, custom)
  @Prop({
    type: String,
    enum: BoothShapeType,
    default: BoothShapeType.RECTANGLE,
  })
  shapeType?: BoothShapeType;

  // รัศมีสำหรับรูปทรงกลม หรือรูปทรงหลายเหลี่ยมด้านเท่า (circle, hexagon)
  @Prop({ type: Number })
  radius?: number;

  // พิกัดภูมิศาสตร์โลกจริง (GPS WGS84 GeoJSON Point [longitude, latitude])
  @Prop({ type: Point2DSchema })
  geo?: Point2D;

  // รหัสโหนดทางเข้าสำหรับระบบนำทาง (Waypoint/Node ID) - ใช้สำหรับ findRoute ใน Frontend
  @Prop({ type: String })
  entryNodeId?: string;
}

export const BoothSchema = SchemaFactory.createForClass(Booth);

// 1. ป้องกันรหัสบูธซ้ำในแผนที่เดียวกัน
BoothSchema.index(
  { mapId: 1, boothNumber: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

// 2. Geospatial index สำหรับการค้นหาพิกัดโลกจริง (GPS 2dsphere)
BoothSchema.index({ geo: '2dsphere' }, { sparse: true });
