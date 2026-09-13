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
   * แปลงข้อความระบุชั้น (Floor Label) เป็นระดับแกน Z (ตัวเลขความสูง/ชั้น)
   * รองรับ:
   *  - "1", "2", "10" -> 1, 2, 10
   *  - "B1", "B2", "Basement 1", "-1" -> -1, -2, -1 (ชั้นใต้ดินเป็นค่าลบ)
   *  - "G", "Ground" -> 0 (ชั้นระดับพื้นดิน)
   *  - "M", "Mezzanine" -> 0.5 (ชั้นลอย)
   */
  private parseFloorToZ(floor?: string): number {
    if (!floor) return 0;
    const trimmed = floor.trim();

    // ชั้น Ground
    if (/^[gG](round)?$/i.test(trimmed)) return 0;

    // ชั้น Mezzanine (ชั้นลอย)
    if (/^[mM](ezzanine)?$/i.test(trimmed)) return 0.5;

    // ชั้นใต้ดิน Basement
    const isBasement = /^[bB]|basement/i.test(trimmed) || trimmed.startsWith('-');
    const match = trimmed.match(/\d+(\.\d+)?/);
    if (!match) return 0;

    const num = parseFloat(match[0]);
    return isBasement ? -Math.abs(num) : num;
  }

  /**
   * ตรวจสอบว่าตัวเลขอยู่ในขอบเขตพิกัดลูกโลกจริง (WGS84 Spherical) หรือไม่
   * Longitude: [-180, 180], Latitude: [-90, 90]
   */
  private isValidGeo(lng?: number, lat?: number): boolean {
    if (lng === undefined || lat === undefined) return false;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  // ==========================================
  // MAP MANAGEMENT
  // ==========================================

  async createMap(createMapDto: CreateMapDto): Promise<MapDocument> {
    const floorZ = this.parseFloorToZ(createMapDto.floor);
    // ถ้าผู้ใช้ไม่ส่ง z หรือส่งมาเป็น 0 แต่มีการระบุ floor ให้ใช้ floorZ
    const determinedZ =
      createMapDto.z !== undefined && createMapDto.z !== 0
        ? createMapDto.z
        : floorZ;

    const map = new this.mapModel({
      ...createMapDto,
      width: createMapDto.width ?? 1000,
      height: createMapDto.height ?? 1000,
      z: determinedZ,
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
  // 3. แสดง แผนที่รวมบูธ (Full Map with Booths)
  // ==========================================

  async findMapWithBooths(id: string): Promise<{
    id: string;
    name: string;
    building?: string;
    floor?: string;
    imageUrl?: string;
    width: number;
    height: number;
    z?: number;
    createdAt?: Date;
    updatedAt?: Date;
    totalBooths: number;
    booths: any[];
  }> {
    const map = await this.mapModel.findById(id).lean().exec();

    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }

    const booths = await this.boothModel
      .find({ mapId: id })
      .lean()
      .exec();

    // Format output: แยกพิกัดในอาคาร (Local 3D: x, y, z) และพิกัดบนโลกจริง (GPS: longitude, latitude, altitude)
    const formattedBooths = booths.map((booth) => {
      const coords = booth.location?.coordinates;
      return {
        ...booth,
        id: booth._id,
        // พิกัด 3D ภายในอาคารสำหรับ Frontend Canvas / Three.js
        position: {
          x: booth.x ?? 0,
          y: booth.y ?? 0,
          z: booth.z ?? 0,
        },
        // GeoJSON Point สำหรับ GIS (มีเฉพาะเมื่อมีการกรอก GPS จริง)
        spatialLocation: booth.location ?? null,
        coordinates: coords
          ? {
            longitude: coords[0],
            latitude: coords[1],
            altitude: coords.length > 2 ? coords[2] : (booth.z ?? 0),
          }
          : null,
      };
    });

    return {
      ...map,
      id: map._id,
      totalBooths: formattedBooths.length,
      booths: formattedBooths,
    };
  }

  // ==========================================
  // BOOTH MANAGEMENT
  // ==========================================

  async createBooth(
    mapId: string,
    createBoothDto: CreateBoothDto,
  ): Promise<any> {
    // 1. ตรวจสอบว่า map มีอยู่จริง
    const map = await this.findMapById(mapId);

    // 2. กำหนดแกน Z ในอาคาร:
    //    - หาค่าระดับชั้นของ Map ก่อน (จาก map.z หรือ parse จาก map.floor)
    const mapFloorZ =
      map.z !== undefined && map.z !== 0
        ? map.z
        : this.parseFloorToZ(map.floor);

    //    - ถ้าผู้ใช้ระบุ z ใน Booth มาเอง และไม่ใช่ 0 -> ใช้ค่านั้น
    //    - ถ้าไม่ระบุ หรือส่งมาเป็น 0 (เช่น Swagger default) -> ดึงค่าจากระดับชั้นของ Map
    const determinedZ =
      createBoothDto.z !== undefined && createBoothDto.z !== 0
        ? createBoothDto.z
        : mapFloorZ;

    // 3. จัดการพิกัดดาวเทียม (GPS World Coordinates):
    let location: any = undefined;
    if (this.isValidGeo(createBoothDto.longitude, createBoothDto.latitude)) {
      const altitude = createBoothDto.altitude ?? determinedZ;
      location = {
        type: 'Point',
        coordinates: [createBoothDto.longitude!, createBoothDto.latitude!, altitude],
      };
    }

    const booth = new this.boothModel({
      ...createBoothDto,
      mapId,
      x: createBoothDto.x ?? 0,
      y: createBoothDto.y ?? 0,
      z: determinedZ,
      location,
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

    return booths.map((booth) => {
      const coords = booth.location?.coordinates;
      return {
        ...booth,
        id: booth._id,
        position: {
          x: booth.x ?? 0,
          y: booth.y ?? 0,
          z: booth.z ?? 0,
        },
        spatialLocation: booth.location ?? null,
        coordinates: coords
          ? {
            longitude: coords[0],
            latitude: coords[1],
            altitude: coords.length > 2 ? coords[2] : (booth.z ?? 0),
          }
          : null,
      };
    });
  }

  async findBoothById(id: string): Promise<any> {
    const booth = await this.boothModel.findById(id).lean().exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    const coords = booth.location?.coordinates;
    return {
      ...booth,
      id: booth._id,
      position: {
        x: booth.x ?? 0,
        y: booth.y ?? 0,
        z: booth.z ?? 0,
      },
      spatialLocation: booth.location ?? null,
      coordinates: coords
        ? {
          longitude: coords[0],
          latitude: coords[1],
          altitude: coords.length > 2 ? coords[2] : (booth.z ?? 0),
        }
        : null,
    };
  }

  async updateBooth(
    id: string,
    updateBoothDto: UpdateBoothDto,
  ): Promise<any> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }

    const currentZ =
      updateBoothDto.z !== undefined ? updateBoothDto.z : (booth.z ?? 0);

    // อัปเดตพิกัด GPS เฉพาะเมื่อมีการส่ง longitude & latitude มาจริง
    if (this.isValidGeo(updateBoothDto.longitude, updateBoothDto.latitude)) {
      const altitude = updateBoothDto.altitude ?? currentZ;
      booth.location = {
        type: 'Point',
        coordinates: [updateBoothDto.longitude!, updateBoothDto.latitude!, altitude],
      };
    } else if (updateBoothDto.z !== undefined && booth.location?.coordinates) {
      booth.location = {
        type: 'Point',
        coordinates: [
          booth.location.coordinates[0],
          booth.location.coordinates[1],
          updateBoothDto.z,
        ],
      };
    }

    Object.assign(booth, updateBoothDto);
    if (updateBoothDto.z !== undefined) {
      booth.z = updateBoothDto.z;
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
