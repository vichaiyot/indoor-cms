import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Booth,
  BoothDocument,
  BoothShapeType,
} from '../../../schema/indoor-map/booth/booth.schema';
import { MapService } from '../map/map.service';
import { CreateBoothDto } from '../../../dto/indoor-map/booth/create-booth.dto';
import { UpdateBoothDto } from '../../../dto/indoor-map/booth/update-booth.dto';

@Injectable()
export class BoothService {
  constructor(
    @InjectModel(Booth.name)
    private readonly boothModel: Model<BoothDocument>,
    private readonly mapService: MapService,
  ) {}

  /**
   * ตรวจสอบว่าตัวเลขอยู่ในขอบเขตพิกัดลูกโลกจริง (WGS84 Spherical) หรือไม่
   */
  private isValidGeo(lng?: number, lat?: number): boolean {
    if (lng === undefined || lat === undefined) return false;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }


  /**
   * จัดรูปแบบการแสดงผล Booth
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

    const size = booth.size || {
      width: booth.width ?? 0,
      depth: booth.depth ?? 0,
      height: booth.height ?? 0,
    };

    let geo = booth.geo;
    if (Array.isArray(geo) && geo.length >= 2) {
      geo = {
        type: 'Point',
        coordinates: [geo[0], geo[1]],
      };
    } else if (!geo && booth.location?.coordinates) {
      geo = {
        type: 'Point',
        coordinates: [
          booth.location.coordinates[0],
          booth.location.coordinates[1],
        ],
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
      footprint: booth.footprint,
      shapeType: booth.shapeType || BoothShapeType.RECTANGLE,
      radius: booth.radius,
      geo,
      entryNodeId: booth.entryNodeId || null,
      createdAt: booth.createdAt,
      updatedAt: booth.updatedAt,
    };
  }

  /**
   * 1. สร้างบูธและบันทึกพิกัดตำแหน่ง
   */
  async createBooth(
    mapId: string,
    createBoothDto: CreateBoothDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // Position: รองรับทั้ง GeoJSON Object, Array [x, y], และ Flat x, y
    let position: any = createBoothDto.position;
    if (Array.isArray(position) && position.length >= 2) {
      position = {
        type: 'Point',
        coordinates: [Number(position[0]), Number(position[1])],
      };
    } else if (
      position &&
      Array.isArray(position.coordinates) &&
      position.coordinates.length >= 2
    ) {
      position = {
        type: 'Point',
        coordinates: [
          Number(position.coordinates[0]),
          Number(position.coordinates[1]),
        ],
      };
    } else {
      position = {
        type: 'Point',
        coordinates: [createBoothDto.x ?? 0, createBoothDto.y ?? 0],
      };
    }

    // Size: รองรับทั้ง Object size และ Flat width, depth, height
    const size = {
      width: createBoothDto.size?.width ?? createBoothDto.width ?? 0,
      depth: createBoothDto.size?.depth ?? createBoothDto.depth ?? 0,
      height: createBoothDto.size?.height ?? createBoothDto.height ?? 0,
    };

    const shapeType = createBoothDto.shapeType || BoothShapeType.RECTANGLE;
    const radius = createBoothDto.radius;

    // Footprint: บันทึก GeoJSON Polygon ที่ผู้ใช้วาดมาจาก Frontend โดยตรง
    let footprint: any = createBoothDto.footprint;
    if (footprint) {
      if (Array.isArray(footprint)) {
        const coords =
          Array.isArray(footprint[0]) && Array.isArray(footprint[0][0])
            ? footprint
            : [footprint];
        footprint = {
          type: 'Polygon',
          coordinates: coords,
        };
      } else if (footprint.coordinates) {
        footprint = {
          type: 'Polygon',
          coordinates: footprint.coordinates,
        };
      }
    }

    // Geo: รองรับทั้ง GeoJSON Object, Array [lng, lat], และ Flat longitude, latitude
    let geo: any = createBoothDto.geo;
    if (
      Array.isArray(geo) &&
      geo.length >= 2 &&
      this.isValidGeo(geo[0], geo[1])
    ) {
      geo = {
        type: 'Point',
        coordinates: [Number(geo[0]), Number(geo[1])],
      };
    } else if (
      geo &&
      Array.isArray(geo.coordinates) &&
      geo.coordinates.length >= 2 &&
      this.isValidGeo(geo.coordinates[0], geo.coordinates[1])
    ) {
      geo = {
        type: 'Point',
        coordinates: [Number(geo.coordinates[0]), Number(geo.coordinates[1])],
      };
    } else if (
      this.isValidGeo(createBoothDto.longitude, createBoothDto.latitude)
    ) {
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
      shapeType,
      radius,
      geo,
      entryNodeId: createBoothDto.entryNodeId,
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

    return this.formatBooth(booth);
  }

  /**
   * 2. ดึงรายการบูธทั้งหมดในแผนที่ที่ระบุ
   */
  async findBoothsByMapId(mapId: string): Promise<any[]> {
    const map = await this.mapService.findMapById(mapId);
    const booths = await this.boothModel
      .find({ mapId: map._id })
      .sort({ boothNumber: 1 })
      .exec();

    return booths.map((booth) => this.formatBooth(booth));
  }

  /**
   * 3. ดึงข้อมูลบูธตาม ID
   */
  async findBoothById(id: string): Promise<any> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    return this.formatBooth(booth);
  }

  /**
   * 4. แก้ไขข้อมูลหรืออัปเดตตำแหน่งบูธ
   */
  async updateBooth(id: string, updateBoothDto: UpdateBoothDto): Promise<any> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }

    if (updateBoothDto.boothNumber)
      booth.boothNumber = updateBoothDto.boothNumber;
    if (updateBoothDto.name) booth.name = updateBoothDto.name;
    if (updateBoothDto.description !== undefined)
      booth.description = updateBoothDto.description;
    if (updateBoothDto.category !== undefined)
      booth.category = updateBoothDto.category;
    if (updateBoothDto.status) booth.status = updateBoothDto.status;
    if (updateBoothDto.type !== undefined) booth.type = updateBoothDto.type;
    if (updateBoothDto.rotation !== undefined)
      booth.rotation = updateBoothDto.rotation;
    if (updateBoothDto.shapeType !== undefined)
      booth.shapeType = updateBoothDto.shapeType;
    if (updateBoothDto.radius !== undefined)
      booth.radius = updateBoothDto.radius;
    if (updateBoothDto.entryNodeId !== undefined)
      booth.entryNodeId = updateBoothDto.entryNodeId;

    // Position
    let newX = updateBoothDto.x;
    let newY = updateBoothDto.y;
    if (
      Array.isArray(updateBoothDto.position) &&
      updateBoothDto.position.length >= 2
    ) {
      newX = Number(updateBoothDto.position[0]);
      newY = Number(updateBoothDto.position[1]);
    } else if (
      updateBoothDto.position?.coordinates &&
      Array.isArray(updateBoothDto.position.coordinates) &&
      updateBoothDto.position.coordinates.length >= 2
    ) {
      newX = Number(updateBoothDto.position.coordinates[0]);
      newY = Number(updateBoothDto.position.coordinates[1]);
    }

    if (newX !== undefined || newY !== undefined) {
      const currentX = booth.position?.coordinates?.[0] ?? 0;
      const currentY = booth.position?.coordinates?.[1] ?? 0;
      booth.position = {
        type: 'Point',
        coordinates: [newX ?? currentX, newY ?? currentY],
      };
    }

    // Size
    const updatedWidth = updateBoothDto.size?.width ?? updateBoothDto.width;
    const updatedDepth = updateBoothDto.size?.depth ?? updateBoothDto.depth;
    const updatedHeight = updateBoothDto.size?.height ?? updateBoothDto.height;

    if (
      updatedWidth !== undefined ||
      updatedDepth !== undefined ||
      updatedHeight !== undefined
    ) {
      booth.size = {
        width: updatedWidth ?? booth.size?.width ?? 0,
        depth: updatedDepth ?? booth.size?.depth ?? 0,
        height: updatedHeight ?? booth.size?.height ?? 0,
      };
    }

    // Footprint: อัปเดตเมื่อ Frontend ส่งพิกัดที่แก้ไขมา
    if (updateBoothDto.footprint !== undefined) {
      const fp: any = updateBoothDto.footprint;
      if (!fp) {
        booth.footprint = undefined;
      } else if (Array.isArray(fp)) {
        const coords =
          Array.isArray(fp[0]) && Array.isArray(fp[0][0]) ? fp : [fp];
        booth.footprint = {
          type: 'Polygon',
          coordinates: coords,
        };
      } else if (fp.coordinates) {
        booth.footprint = {
          type: 'Polygon',
          coordinates: fp.coordinates,
        };
      } else {
        booth.footprint = fp;
      }
    }

    // Geo
    if (
      Array.isArray(updateBoothDto.geo) &&
      updateBoothDto.geo.length >= 2 &&
      this.isValidGeo(updateBoothDto.geo[0], updateBoothDto.geo[1])
    ) {
      booth.geo = {
        type: 'Point',
        coordinates: [
          Number(updateBoothDto.geo[0]),
          Number(updateBoothDto.geo[1]),
        ],
      };
    } else if (
      updateBoothDto.geo?.coordinates &&
      this.isValidGeo(
        updateBoothDto.geo.coordinates[0],
        updateBoothDto.geo.coordinates[1],
      )
    ) {
      booth.geo = updateBoothDto.geo;
    } else if (
      this.isValidGeo(updateBoothDto.longitude, updateBoothDto.latitude)
    ) {
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

  /**
   * 5. ลบบูธ
   */
  async deleteBooth(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const booth = await this.boothModel.findById(id).exec();
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    await booth.deleteOne();
    return { success: true, message: `Booth ${booth.boothNumber} deleted` };
  }
}
