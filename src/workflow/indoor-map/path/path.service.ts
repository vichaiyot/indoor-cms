import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PathGraph, PathGraphDocument } from '../../../schema/indoor-map/path/path-graph.schema';
import { MapService } from '../map/map.service';
import { SavePathGraphDto } from '../../../dto/indoor-map/path/save-path-graph.dto';

@Injectable()
export class PathService {
  constructor(
    @InjectModel(PathGraph.name)
    private readonly pathGraphModel: Model<PathGraphDocument>,
    private readonly mapService: MapService,
  ) { }

  /**
   * 1. บันทึกหรืออัปเดตโครงข่ายเส้นทางเดิน (Save / Upsert Path Graph)
   */
  async savePathGraph(
    mapId: string,
    savePathGraphDto: SavePathGraphDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // ตรวจสอบความถูกต้องของ Nodes, สร้าง Lookup Dictionary และแปลงเป็น GeoJSON Point
    const nodeMap: Record<string, { x: number; y: number }> = {};
    const processedNodes = savePathGraphDto.nodes.map((node) => {
      let position: any = node.position;
      let x = 0;
      let y = 0;

      if (Array.isArray(position) && position.length >= 2) {
        x = Number(position[0]);
        y = Number(position[1]);
        position = {
          type: 'Point',
          coordinates: [x, y],
        };
      } else if (
        position?.coordinates &&
        Array.isArray(position.coordinates) &&
        position.coordinates.length >= 2
      ) {
        x = Number(position.coordinates[0]);
        y = Number(position.coordinates[1]);
        position = {
          type: 'Point',
          coordinates: [x, y],
        };
      } else {
        x = Number(node.x ?? 0);
        y = Number(node.y ?? 0);
        position = {
          type: 'Point',
          coordinates: [x, y],
        };
      }

      nodeMap[node.id] = { x, y };

      return {
        id: node.id,
        name: node.name,
        type: node.type || 'waypoint',
        position,
      };
    });

    // ตรวจสอบและคำนวณ weight (Euclidean Distance) สำหรับแต่ละ Edge
    const processedEdges = savePathGraphDto.edges.map((edge) => {
      const fromNode = nodeMap[edge.from];
      const toNode = nodeMap[edge.to];

      if (!fromNode) {
        throw new BadRequestException(
          `Edge ระบุจุดเริ่มต้น from: "${edge.from}" ที่ไม่มีอยู่ใน nodes`,
        );
      }
      if (!toNode) {
        throw new BadRequestException(
          `Edge ระบุจุดปลายทาง to: "${edge.to}" ที่ไม่มีอยู่ใน nodes`,
        );
      }

      let weight = edge.weight;
      if (weight === undefined || weight === null || weight <= 0) {
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        weight = Number(Math.hypot(dx, dy).toFixed(2));
      }

      return {
        from: edge.from,
        to: edge.to,
        weight,
        bidirectional: edge.bidirectional ?? true,
        accessible: edge.accessible ?? true,
      };
    });

    const pathGraph: any = await this.pathGraphModel
      .findOneAndUpdate(
        { mapId: resolvedMapId },
        {
          mapId: resolvedMapId,
          nodes: processedNodes,
          edges: processedEdges,
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .lean()
      .exec();

    return {
      id: pathGraph._id,
      mapId: pathGraph.mapId,
      totalNodes: pathGraph.nodes.length,
      totalEdges: pathGraph.edges.length,
      nodes: pathGraph.nodes,
      edges: pathGraph.edges,
      createdAt: pathGraph.createdAt,
      updatedAt: pathGraph.updatedAt,
    };
  }

  /**
   * 2. ดึงโครงข่ายเส้นทางเดินของแผนที่
   */
  async findPathGraphByMapId(mapId: string): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    const pathGraph = await this.pathGraphModel
      .findOne({ mapId: resolvedMapId })
      .lean()
      .exec();

    return {
      mapId: resolvedMapId,
      totalNodes: pathGraph?.nodes?.length ?? 0,
      totalEdges: pathGraph?.edges?.length ?? 0,
      nodes: pathGraph?.nodes ?? [],
      edges: pathGraph?.edges ?? [],
    };
  }

  /**
   * 3. ลบโครงข่ายเส้นทางเดินของแผนที่
   */
  async deletePathGraph(
    mapId: string,
  ): Promise<{ success: boolean; message: string }> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    await this.pathGraphModel.deleteOne({ mapId: resolvedMapId }).exec();
    return { success: true, message: `Path graph for map "${map.name}" deleted` };
  }
}
