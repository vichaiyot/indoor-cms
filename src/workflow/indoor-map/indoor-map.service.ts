import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapEntity } from '../../entities/indoor-map/map.entity';
import { BoothEntity } from '../../entities/indoor-map/booth.entity';
import { CreateMapDto } from '../../dto/indoor-map/create-map.dto';
import { CreateBoothDto } from '../../dto/indoor-map/create-booth.dto';
import { UpdateBoothDto } from '../../dto/indoor-map/update-booth.dto';

@Injectable()
export class IndoorMapService {
  constructor(
    @InjectRepository(MapEntity)
    private readonly mapRepository: Repository<MapEntity>,
    @InjectRepository(BoothEntity)
    private readonly boothRepository: Repository<BoothEntity>,
  ) { }

  // ==========================================
  // MAP MANAGEMENT
  // ==========================================

  async createMap(createMapDto: CreateMapDto): Promise<MapEntity> {
    const map = this.mapRepository.create({
      ...createMapDto,
      width: createMapDto.width ?? 1000,
      height: createMapDto.height ?? 1000,
    });
    return await this.mapRepository.save(map);
  }

  async findAllMaps(): Promise<MapEntity[]> {
    return await this.mapRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findMapById(id: string): Promise<MapEntity> {
    const map = await this.mapRepository.findOne({ where: { id } });
    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }
    return map;
  }

  // เส้นดึงแผนที่หลักรวมข้อมูลบูธทั้งหมด
  async findMapWithBooths(id: string) {
    const map = await this.mapRepository.findOne({
      where: { id },
      relations: { booths: true },
    });

    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }

    // Format output with spatial coordinates convenience fields
    const formattedBooths = (map.booths || []).map((booth) => {
      const coords = booth.location?.coordinates;
      return {
        ...booth,
        spatialLocation: booth.location,
        coordinates: coords
          ? {
            longitude: coords[0],
            latitude: coords[1],
          }
          : null,
      };
    });

    return {
      ...map,
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
  ): Promise<BoothEntity> {
    const map = await this.findMapById(mapId);

    // Build PostGIS Point geometry
    let location: any = null;
    if (
      createBoothDto.longitude !== undefined &&
      createBoothDto.latitude !== undefined
    ) {
      location = {
        type: 'Point',
        coordinates: [createBoothDto.longitude, createBoothDto.latitude],
      };
    } else if (
      createBoothDto.x !== undefined &&
      createBoothDto.y !== undefined
    ) {
      location = {
        type: 'Point',
        coordinates: [createBoothDto.x, createBoothDto.y],
      };
    }

    const booth = this.boothRepository.create({
      ...createBoothDto,
      mapId: map.id,
      x: createBoothDto.x ?? 0,
      y: createBoothDto.y ?? 0,
      location,
    });

    return await this.boothRepository.save(booth);
  }

  async findBoothsByMapId(mapId: string): Promise<BoothEntity[]> {
    await this.findMapById(mapId);
    return await this.boothRepository.find({
      where: { mapId },
      order: { boothNumber: 'ASC' },
    });
  }

  async findBoothById(id: string): Promise<BoothEntity> {
    const booth = await this.boothRepository.findOne({
      where: { id },
      relations: { map: true },
    });
    if (!booth) {
      throw new NotFoundException(`Booth with ID "${id}" not found`);
    }
    return booth;
  }

  async updateBooth(
    id: string,
    updateBoothDto: UpdateBoothDto,
  ): Promise<BoothEntity> {
    const booth = await this.findBoothById(id);

    if (
      updateBoothDto.longitude !== undefined &&
      updateBoothDto.latitude !== undefined
    ) {
      booth.location = {
        type: 'Point',
        coordinates: [updateBoothDto.longitude, updateBoothDto.latitude],
      };
    } else if (
      updateBoothDto.x !== undefined &&
      updateBoothDto.y !== undefined
    ) {
      booth.location = {
        type: 'Point',
        coordinates: [updateBoothDto.x, updateBoothDto.y],
      };
    }

    Object.assign(booth, updateBoothDto);
    return await this.boothRepository.save(booth);
  }

  async deleteBooth(id: string): Promise<{ success: boolean; message: string }> {
    const booth = await this.findBoothById(id);
    await this.boothRepository.remove(booth);
    return { success: true, message: `Booth ${booth.boothNumber} deleted` };
  }
}
