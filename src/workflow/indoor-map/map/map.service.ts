import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Map, MapDocument } from '../../../schema/indoor-map/map/map.schema';
import {
  Booth,
  BoothDocument,
} from '../../../schema/indoor-map/booth/booth.schema';
import {
  PathNode,
  PathNodeDocument,
} from '../../../schema/indoor-map/path/path-graph.schema';
import { CreateMapDto } from '../../../dto/indoor-map/map/create-map.dto';
import { UpdateMapDto } from '../../../dto/indoor-map/map/update-map.dto';

@Injectable()
export class MapService {
  constructor(
    @InjectModel(Map.name)
    private readonly mapModel: Model<MapDocument>,
    @InjectModel(Booth.name)
    private readonly boothModel: Model<BoothDocument>,
    @InjectModel(PathNode.name)
    private readonly pathNodeModel: Model<PathNodeDocument>,
  ) {}

  /**
   * ตรวจสอบว่าพิกัดภูมิศาสตร์โลกจริงอยู่ในขอบเขต WGS84 หรือไม่
   */
  private isValidGeo(lng?: number, lat?: number): boolean {
    if (lng === undefined || lat === undefined) return false;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  /**
   * 1. สร้างแผนที่หลัก (Floor Plan / Hall Map)
   */
  async createMap(createMapDto: CreateMapDto): Promise<Map> {
    if (createMapDto.geo?.coordinates) {
      const [lng, lat] = createMapDto.geo.coordinates;
      if (!this.isValidGeo(lng, lat)) {
        throw new BadRequestException(
          'พิกัดภูมิศาสตร์ (geo) ไม่ถูกต้อง: Longitude ต้องอยู่ระหว่าง -180 ถึง 180 และ Latitude ต้องอยู่ระหว่าง -90 ถึง 90',
        );
      }
    }

    try {
      const createdMap = new this.mapModel(createMapDto);
      return await createdMap.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `แผนที่ชื่อ "${createMapDto.name}" ในอาคาร "${createMapDto.building ?? 'N/A'}" ชั้น "${createMapDto.floor ?? 'N/A'}" มีอยู่ในระบบแล้ว`,
        );
      }
      throw error;
    }
  }

  /**
   * 2. ดึงรายการแผนที่ทั้งหมด เรียงจากใหม่ไปเก่า
   */
  async findAllMaps(): Promise<Map[]> {
    return this.mapModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * 3. ดึงข้อมูลแผนที่เดี่ยวตาม UUID หรือชื่อ Hall
   */
  async findMapById(id: string): Promise<MapDocument> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );

    let map: MapDocument | null = null;
    if (isUuid) {
      map = await this.mapModel.findById(id).exec();
    } else {
      map = await this.mapModel.findOne({ name: id }).exec();
    }

    if (!map) {
      throw new NotFoundException(`Map with ID or Name "${id}" not found`);
    }

    return map;
  }

  /**
   * 4. แก้ไขข้อมูลแผนที่หลัก (Update Map Info / Dimensions / Image)
   */
  async updateMap(id: string, updateMapDto: UpdateMapDto): Promise<Map> {
    const map = await this.findMapById(id);

    if (updateMapDto.geo?.coordinates) {
      const [lng, lat] = updateMapDto.geo.coordinates;
      if (!this.isValidGeo(lng, lat)) {
        throw new BadRequestException(
          'พิกัดภูมิศาสตร์ (geo) ไม่ถูกต้อง: Longitude ต้องอยู่ระหว่าง -180 ถึง 180 และ Latitude ต้องอยู่ระหว่าง -90 ถึง 90',
        );
      }
    }

    try {
      Object.assign(map, updateMapDto);
      return await map.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new ConflictException(
          `แผนที่ชื่อ "${updateMapDto.name ?? map.name}" ในอาคาร "${updateMapDto.building ?? map.building ?? 'N/A'}" ชั้น "${updateMapDto.floor ?? map.floor ?? 'N/A'}" มีอยู่ในระบบแล้ว`,
        );
      }
      throw error;
    }
  }

  /**
   * 4. ดึงข้อมูลแผนที่หลักพร้อมรายการบูธทั้งหมดและโครงข่ายเส้นทางเดิน (Paths)
   */
  async findMapWithBooths(id: string): Promise<{
    id: string;
    name: string;
    building?: string;
    floor?: string;
    imageUrl?: string;
    width: number;
    height: number;
    geo?: any;
    boundary?: any;
    rotation?: number;
    createdAt?: Date;
    updatedAt?: Date;
    totalBooths: number;
    booths: any[];
    paths: {
      totalNodes: number;
      totalEdges: number;
      nodes: any[];
      edges: any[];
    } | null;
  }> {
    const map = await this.mapModel.findById(id).lean().exec();

    if (!map) {
      throw new NotFoundException(`Map with ID "${id}" not found`);
    }
    delete (map as any).z;
    delete (map as any)._id;
    delete (map as any).__v;

    const [booths, nodes] = await Promise.all([
      this.boothModel.find({ mapId: id }).lean().exec(),
      this.pathNodeModel.find({ mapId: id }).lean().exec(),
    ]);

    const formattedBooths = booths.map((booth) => this.formatBooth(booth));
    const formattedNodes = nodes.map((node) => ({
      id: node.nodeId,
      nodeId: node.nodeId,
      name: node.name,
      type: node.type,
      position: node.position,
      connectedNodeIds: node.connectedNodeIds || [],
    }));

    // คำนวณ edges อัตโนมัติจาก connectedNodeIds เพื่อให้ findRoute ของ Frontend ทำงานได้ 100%
    const edges = this.deriveEdges(formattedNodes);

    return {
      ...map,
      id,
      totalBooths: formattedBooths.length,
      booths: formattedBooths,
      paths: {
        totalNodes: formattedNodes.length,
        totalEdges: edges.length,
        nodes: formattedNodes,
        edges,
      },
    };
  }

  /**
   * Helper จัดรูปแบบการแสดงผล Booth
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
      geo,
      entryNodeId: booth.entryNodeId || null,
      createdAt: booth.createdAt,
      updatedAt: booth.updatedAt,
    };
  }

  /**
   * Helper คำนวณ Edge อัตโนมัติจาก connectedNodeIds ของแต่ละ Node
   */
  private deriveEdges(
    nodes: Array<{
      id: string;
      nodeId: string;
      name?: string;
      type?: string;
      position: { type?: string; coordinates: number[] };
      connectedNodeIds: string[];
    }>,
  ): any[] {
    const nodeMap = new globalThis.Map<
      string,
      {
        id: string;
        nodeId: string;
        name?: string;
        type?: string;
        position: { type?: string; coordinates: number[] };
        connectedNodeIds: string[];
      }
    >();
    for (const n of nodes) {
      nodeMap.set(n.nodeId, n);
    }

    const seen = new Set<string>();
    const edges: any[] = [];

    for (const n of nodes) {
      const fromId = n.nodeId;
      for (const toId of n.connectedNodeIds ?? []) {
        const targetNode = nodeMap.get(toId);
        if (!targetNode) continue;

        const edgeKey =
          fromId < toId ? `${fromId}<->${toId}` : `${toId}<->${fromId}`;
        if (seen.has(edgeKey)) continue;
        seen.add(edgeKey);

        edges.push({
          id: `edge-${fromId}-${toId}`,
          from: fromId,
          to: toId,
          kind: 'walk',
          bidirectional: true,
          accessible: true,
          open: true,
          verified: true,
        });
      }
    }

    return edges;
  }

  /**
   * 5. ลบแผนที่หลัก (พร้อม cascade ลบบูธและโครงข่ายเส้นทางเดินที่เกี่ยวข้องทั้งหมด)
   */
  async deleteMap(id: string): Promise<{ success: boolean; message: string }> {
    const map = await this.findMapById(id);
    const mapId = map._id;

    await Promise.all([
      this.mapModel.findByIdAndDelete(mapId).exec(),
      this.boothModel.deleteMany({ mapId }).exec(),
      this.pathNodeModel.deleteMany({ mapId }).exec(),
    ]);

    return {
      success: true,
      message: `Map "${map.name}" and its associated booths and path graph deleted successfully`,
    };
  }

  /**
   * 6. อัปโหลดรูปแปลนอาคาร (Blueprint Upload) และอัปเดต imageUrl ของ Map อัตโนมัติ
   */
  async uploadBlueprint(
    mapId: string,
    file: Express.Multer.File,
    width?: number,
    height?: number,
  ): Promise<Map> {
    const map = await this.findMapById(mapId);

    // เก็บ relative path สำหรับ static file serving
    map.imageUrl = `/uploads/${file.filename}`;

    if (width !== undefined && !isNaN(Number(width))) {
      map.width = Number(width);
    }
    if (height !== undefined && !isNaN(Number(height))) {
      map.height = Number(height);
    }

    return await map.save();
  }
}
