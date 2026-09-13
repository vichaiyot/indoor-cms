import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type MapDocument = Map & Document;

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

  @Prop({ type: Number, default: 0 })
  z?: number;
}

export const MapSchema = SchemaFactory.createForClass(Map);

// 1. ป้องกันการสร้างแผนที่ซ้ำ (อาคาร + ชื่อฮอลล์ + ชั้น ห้ามซ้ำกันแบบ case-insensitive)
MapSchema.index(
  { building: 1, name: 1, floor: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

// 2. Query แผนที่ล่าสุดเร็วขึ้น (CMS listing: sort by createdAt DESC)
MapSchema.index({ createdAt: -1 });

// 3. กรองแผนที่ตามอาคารและชั้น หรือระดับความสูง Z
MapSchema.index({ building: 1, floor: 1 });
MapSchema.index({ building: 1, z: 1 });
