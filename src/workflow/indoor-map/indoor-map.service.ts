import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Map, MapDocument } from '../../entities/indoor-map/map.schema';
import { Booth, BoothDocument } from '../../entities/indoor-map/booth.schema';
import { CreateMapDto } from '../../dto/indoor-map/create-map.dto';
import { CreateBoothDto } from '../../dto/indoor-map/create-booth.dto';
import { UpdateBoothDto } from '../../dto/indoor-map/update-booth.dto';

@Injectable()
export class IndoorMapService {
  constructor(
    @InjectModel(Map.name)
    private readonly mapModel: Model<MapDocument>,
    @InjectModel(Booth.name)
    private readonly boothModel: Model<BoothDocument>,
  ) { }

  // ==========================================
  // MAP MANAGEMENT
  // ==========================================

  // ==========================================
  // HELPER FUNCTIONS
  // ==========================================

  /**
   * ตรวจสอบว่าตัวเลขอยู่ในขอบเขตพิกัดลูกโลกจริง (WGS84 Spherical) หรือไม่
   * Longitude: [-180, 180], Latitude: [-90, 90]
   */
  private isValidGeo(lng?: number, lat?: number): boolean {
    if (lng === undefined || lat === undefined) return false;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  /**
   * คำนวณขอบเขต 2D (Footprint Polygon) อัตโนมัติจากตำแหน่ง ขนาด (width, depth) และมุมหมุน (rotation)
   */
  private calculateFootprint(
    x: number,
    y: number,
    width: number,
    depth: number,
    rotation: number = 0,
  ): { type: string; coordinates: number[][][] } {
    if (!width && !depth) {
      return {
        type: 'Polygon',
        coordinates: [[[x, y], [x, y], [x, y], [x, y], [x, y]]],
      };
    }

    if (!rotation) {
      return {
        type: 'Polygon',
        coordinates: [
          [
            [x, y],
            [Number((x + width).toFixed(4)), y],
            [Number((x + width).toFixed(4)), Number((y + depth).toFixed(4))],
            [x, Number((y + depth).toFixed(4))],
            [x, y],
          ],
        ],
      };
    }

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatePoint = (px: number, py: number): [number, number] => {
      const dx = px - x;
      const dy = py - y;
      return [
        Number((x + dx * cos - dy * sin).toFixed(4)),
        Number((y + dx * sin + dy * cos).toFixed(4)),
      ];
    };

    return {
      type: 'Polygon',
      coordinates: [
        [
          [x, y],
          rotatePoint(x + width, y),
          rotatePoint(x + width, y + depth),
          rotatePoint(x, y + depth),
          [x, y],
        ],
      ],
    };
  }

  /**
   * จัดรูปแบบการแสดงผล Booth ให้ตรงกับ Object Schema ใหม่ (ตัด hallId และ floorLevel ออก)
   */
  private formatBooth(booth: any) {
    let position = booth.position;
    if (Array.isArray(position) && position.length >= 2) {
      position = {
        type: 'Point',
        coordinates: [position[0], position[1]],
      };
    } else if (!position || !position.coordinates) {
      position = {
        type: 'Point',
        coordinates: [booth.x ?? 0, booth.y ?? 0],
      };
    }

    const size = booth.size || { width: 0, depth: 0, height: 0 };

    let footprint = booth.footprint;
    if (!footprint && position?.coordinates?.length >= 2 && (size.width || size.depth)) {
      footprint = this.calculateFootprint(
        position.coordinates[0],
        position.coordinates[1],
        size.width ?? 0,
        size.depth ?? 0,
        booth.rotation ?? 0,
      );
    }

    let geo = booth.geo;
    if (Array.isArray(geo) && geo.length >= 2) {
      geo = {
        type: 'Point',
        coordinates: [geo[0], geo[1]],
      };
    } else if (!geo && booth.location?.coordinates) {
      geo = {
        type: 'Point',
        coordinates: [booth.location.coordinates[0], booth.location.coordinates[1]],
      };
    }

    return {
      id: booth._id,
      boothNumber: booth.boothNumber,
      name: booth.name,
      description: booth.description,
      category: booth.category,
      status: booth.status,
      type: booth.type || 'room',
      mapId: booth.mapId,
      position: {
        type: 'Point',
        coordinates: position.coordinates,
      },
      rotation: booth.rotation ?? 0,
      size: {
        width: size.width ?? 0,
        depth: size.depth ?? 0,
        height: size.height ?? 0,
      },
      footprint: footprint || null,
      geo: geo || null,
      createdAt: booth.createdAt,
      updatedAt: booth.updatedAt,
    };
  }

  // ==========================================
  // MAP MANAGEMENT
  // ==========================================

  async createMap(createMapDto: CreateMapDto): Promise<MapDocument> {
    const map = new this.mapModel({
      ...createMapDto,
      width: createMapDto.width ?? 1000,
      height: createMapDto.height ?? 1000,
    });

    try {
      return await map.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `แผนที่ "${createMapDto.name}" ชั้น "${createMapDto.floor ?? '-'}" ในอาคาร "${createMapDto.building ?? '-'}" มีอยู่ในระบบแล้ว`,
        );
      }
      throw error;
    }
  }

  async findAllMaps(): Promise<MapDocument[]> {
    return await this.mapModel.find().sort({ createdAt: -1 }).exec();
  }

  async findMapById(id: string): Promise<MapDocument> {
    const map = await this.mapModel.findById(id).exec();
    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }
    return map;
  }

  // ==========================================
  // 2. แสดง แผนที่รวมบูธ (Full Map with Booths)
  // ==========================================

  async findMapWithBooths(id: string): Promise<{
    id: string;
    name: string;
    building?: string;
    floor?: string;
    imageUrl?: string;
    width: number;
    height: number;
    createdAt?: Date;
    updatedAt?: Date;
    totalBooths: number;
    booths: any[];
  }> {
    const map = await this.mapModel.findById(id).lean().exec();

    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }
    delete (map as any).z;

    const booths = await this.boothModel
      .find({ mapId: id })
      .lean()
      .exec();

    const formattedBooths = booths.map((booth) => this.formatBooth(booth));

    return {
      ...map,
      id: map._id,
      totalBooths: formattedBooths.length,
      booths: formattedBooths,
    };
  }

  // ==========================================
  // 3. BOOTH MANAGEMENT
  // ==========================================

  async createBooth(
    mapId: string,
    createBoothDto: CreateBoothDto,
  ): Promise<any> {
    // 1. ตรวจสอบว่า map มีอยู่จริง
    const map = await this.findMapById(mapId);
    const resolvedMapId = map._id;

    // 2. Position: รองรับทั้ง GeoJSON Object, Array [x, y], และ Flat x, y
    let position: any = createBoothDto.position;
    if (Array.isArray(position) && position.length >= 2) {
      position = {
        type: 'Point',
        coordinates: [Number(position[0]), Number(position[1])],
      };
    } else if (position && Array.isArray(position.coordinates) && position.coordinates.length >= 2) {
      position = {
        type: 'Point',
        coordinates: [Number(position.coordinates[0]), Number(position.coordinates[1])],
      };
    } else {
      position = {
        type: 'Point',
        coordinates: [createBoothDto.x ?? 0, createBoothDto.y ?? 0],
      };
    }

    // 3. Size: รองรับทั้ง Object size และ Flat width, depth, height
    const size = {
      width: createBoothDto.size?.width ?? createBoothDto.width ?? 0,
      depth: createBoothDto.size?.depth ?? createBoothDto.depth ?? 0,
      height: createBoothDto.size?.height ?? createBoothDto.height ?? 0,
    };

    // 4. Footprint: คำนวณจาก position และ size อัตโนมัติหากไม่ได้ส่งมา
    let footprint = createBoothDto.footprint;
    if (!footprint && (size.width || size.depth)) {
      footprint = this.calculateFootprint(
        position.coordinates[0],
        position.coordinates[1],
        size.width,
        size.depth,
        createBoothDto.rotation ?? 0,
      );
    }

    // 5. Geo: รองรับทั้ง GeoJSON Object, Array [lng, lat], และ Flat longitude, latitude
    let geo: any = createBoothDto.geo;
    if (Array.isArray(geo) && geo.length >= 2 && this.isValidGeo(geo[0], geo[1])) {
      geo = {
        type: 'Point',
        coordinates: [Number(geo[0]), Number(geo[1])],
      };
    } else if (geo && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2 && this.isValidGeo(geo.coordinates[0], geo.coordinates[1])) {
      geo = {
        type: 'Point',
        coordinates: [Number(geo.coordinates[0]), Number(geo.coordinates[1])],
      };
    } else if (this.isValidGeo(createBoothDto.longitude, createBoothDto.latitude)) {
      geo = {
        type: 'Point',
        coordinates: [createBoothDto.longitude!, createBoothDto.latitude!],
      };
    } else {
      geo = undefined;
    }

    const booth = new this.boothModel({
      boothNumber: createBoothDto.boothNumber,
      name: createBoothDto.name,
      description: createBoothDto.description,
      category: createBoothDto.category,
      status: createBoothDto.status,
      type: createBoothDto.type || 'room',
      mapId: resolvedMapId,
      position,
      rotation: createBoothDto.rotation ?? 0,
      size,
      footprint,
      geo,
    });

    try {
      await booth.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `รหัสบูธ "${createBoothDto.boothNumber}" มีอยู่ในแผนที่นี้แล้ว`,
        );
      }
      throw error;
    }
    return await this.findBoothById(booth._id);
  }

  async findBoothsByMapId(mapId: string): Promise<any[]> {
    await this.findMapById(mapId);
    const booths = await this.boothModel
      .find({ mapId })
      .sort({ boothNumber: 1 })
      .lean()
      .exec();

    return booths.map((booth) => this.formatBooth(booth));
  }

  async findBoothById(id: string): Promise<any> {
    const booth = await this.boothModel.findById(id).lean().exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    return this.formatBooth(booth);
  }

  async updateBooth(
    id: string,
    updateBoothDto: UpdateBoothDto,
  ): Promise<any> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }

    if (updateBoothDto.boothNumber !== undefined) booth.boothNumber = updateBoothDto.boothNumber;
    if (updateBoothDto.name !== undefined) booth.name = updateBoothDto.name;
    if (updateBoothDto.description !== undefined) booth.description = updateBoothDto.description;
    if (updateBoothDto.category !== undefined) booth.category = updateBoothDto.category;
    if (updateBoothDto.status !== undefined) booth.status = updateBoothDto.status;
    if (updateBoothDto.type !== undefined) booth.type = updateBoothDto.type;
    if (updateBoothDto.rotation !== undefined) booth.rotation = updateBoothDto.rotation;

    // Position: รองรับ Array, GeoJSON Object, และ Flat x, y
    if (Array.isArray(updateBoothDto.position) && updateBoothDto.position.length >= 2) {
      booth.position = {
        type: 'Point',
        coordinates: [Number(updateBoothDto.position[0]), Number(updateBoothDto.position[1])],
      };
    } else if (updateBoothDto.position?.coordinates) {
      booth.position = updateBoothDto.position;
    } else if (updateBoothDto.x !== undefined || updateBoothDto.y !== undefined) {
      booth.position = {
        type: 'Point',
        coordinates: [
          updateBoothDto.x ?? booth.position?.coordinates?.[0] ?? 0,
          updateBoothDto.y ?? booth.position?.coordinates?.[1] ?? 0,
        ],
      };
    }

    // Size: รองรับ Object size และ Flat width, depth, height
    const updatedWidth = updateBoothDto.size?.width ?? updateBoothDto.width;
    const updatedDepth = updateBoothDto.size?.depth ?? updateBoothDto.depth;
    const updatedHeight = updateBoothDto.size?.height ?? updateBoothDto.height;

    if (updatedWidth !== undefined || updatedDepth !== undefined || updatedHeight !== undefined) {
      booth.size = {
        width: updatedWidth ?? booth.size?.width ?? 0,
        depth: updatedDepth ?? booth.size?.depth ?? 0,
        height: updatedHeight ?? booth.size?.height ?? 0,
      };
    }

    // Footprint
    if (updateBoothDto.footprint) {
      booth.footprint = updateBoothDto.footprint;
    } else if (
      (updateBoothDto.position || updateBoothDto.size || updateBoothDto.x !== undefined || updateBoothDto.y !== undefined || updateBoothDto.width !== undefined || updateBoothDto.depth !== undefined || updateBoothDto.rotation !== undefined) &&
      booth.position?.coordinates &&
      booth.size
    ) {
      booth.footprint = this.calculateFootprint(
        booth.position.coordinates[0],
        booth.position.coordinates[1],
        booth.size.width ?? 0,
        booth.size.depth ?? 0,
        booth.rotation ?? 0,
      );
    }

    // Geo: รองรับ Array, GeoJSON Object, และ Flat longitude, latitude
    if (Array.isArray(updateBoothDto.geo) && updateBoothDto.geo.length >= 2 && this.isValidGeo(updateBoothDto.geo[0], updateBoothDto.geo[1])) {
      booth.geo = {
        type: 'Point',
        coordinates: [Number(updateBoothDto.geo[0]), Number(updateBoothDto.geo[1])],
      };
    } else if (updateBoothDto.geo?.coordinates && this.isValidGeo(updateBoothDto.geo.coordinates[0], updateBoothDto.geo.coordinates[1])) {
      booth.geo = updateBoothDto.geo;
    } else if (this.isValidGeo(updateBoothDto.longitude, updateBoothDto.latitude)) {
      booth.geo = {
        type: 'Point',
        coordinates: [updateBoothDto.longitude!, updateBoothDto.latitude!],
      };
    }

    try {
      await booth.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `รหัสบูธ "${updateBoothDto.boothNumber ?? booth.boothNumber}" มีอยู่ในแผนที่นี้แล้ว`,
        );
      }
      throw error;
    }
    return await this.findBoothById(id);
  }

  async deleteBooth(id: string): Promise<{ success: boolean; message: string }> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    await booth.deleteOne();
    return { success: true, message: `Booth ${booth.boothNumber} deleted` };
  }
}

