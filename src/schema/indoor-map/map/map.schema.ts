import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  Point2D,
  Point2DSchema,
  Polygon2D,
  Polygon2DSchema,
} from '../booth/booth.schema';

export type MapDocument = Map & Document;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.z;
      return ret;
    },
  },
})
export class Map {
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @Prop({ required: true, type: String, maxlength: 255 })
  name: string;

  @Prop({ type: String, maxlength: 255 })
  building?: string;

  @Prop({ type: String, maxlength: 50 })
  floor?: string;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: Number, default: 1000 })
  width: number;

  @Prop({ type: Number, default: 1000 })
  height: number;

  // พิกัดภูมิศาสตร์โลกจริง (GPS WGS84 GeoJSON Point [longitude, latitude])
  @Prop({ type: Point2DSchema })
  geo?: Point2D;

  // ขอบเขตอาณาเขตผังอาคารบนแผนที่โลกจริง (GeoJSON Polygon [[[lng, lat], ...]])
  @Prop({ type: Polygon2DSchema })
  boundary?: Polygon2D;

  // องศาการหมุนของแผนที่เทียบกับทิศเหนือ (0 - 360 องศา)
  @Prop({ type: Number, default: 0 })
  rotation?: number;
}

export const MapSchema = SchemaFactory.createForClass(Map);

// 1. ป้องกันการสร้างแผนที่ซ้ำ (อาคาร + ชื่อฮอลล์ + ชั้น ห้ามซ้ำกันแบบ case-insensitive)
MapSchema.index(
  { building: 1, name: 1, floor: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

// 2. Query แผนที่ล่าสุดเร็วขึ้น (CMS listing: sort by createdAt DESC)
MapSchema.index({ createdAt: -1 });

// 3. กรองแผนที่ตามอาคารและชั้น
MapSchema.index({ building: 1, floor: 1 });

// 4. พิกัดภูมิศาสตร์โลกจริง (2dsphere index) สำหรับการวาดและค้นหาเชิงพื้นที่บนแผนที่โลกจริง
MapSchema.index({ geo: '2dsphere' }, { sparse: true });
