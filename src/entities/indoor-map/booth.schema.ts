import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type BoothDocument = Booth & Document;

export enum BoothStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
}

// GeoJSON Point sub-schema (compatible with MongoDB 2dsphere index)
@Schema({ _id: false })
class GeoPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number] }) // [longitude, latitude]
  coordinates: number[];
}

const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

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

  // 2D/3D coordinates for canvas/rendering
  @Prop({ type: Number, default: 0 })
  x: number;

  @Prop({ type: Number, default: 0 })
  y: number;

  @Prop({ type: Number, default: 0 })
  z: number;

  // GeoJSON Point (MongoDB 2dsphere compatible: [lon, lat, altitude] or [x, y, z])
  @Prop({ type: GeoPointSchema })
  location?: GeoPoint;

  // Reference to parent Map (UUID string)
  @Prop({ required: true, type: String })
  mapId: string;
}

export const BoothSchema = SchemaFactory.createForClass(Booth);

// 1. ป้องกันรหัสบูธซ้ำในแผนที่เดียวกัน (ใน map เดียวกัน ห้ามมี boothNumber ซ้ำกันแบบ case-insensitive)
// และช่วยให้ findBoothsByMapId (.sort({ boothNumber: 1 })) ทำงานได้เร็วที่สุด
BoothSchema.index(
  { mapId: 1, boothNumber: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

// 2. Geospatial index (sparse allows booths without spherical coordinates)
BoothSchema.index({ location: '2dsphere' }, { sparse: true });
