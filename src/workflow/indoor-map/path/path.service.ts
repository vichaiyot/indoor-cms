import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  PathNode,
  PathNodeDocument,
  PathEdge,
} from '../../../schema/indoor-map/path/path-graph.schema';
import { MapService } from '../map/map.service';
import {
  SavePathGraphDto,
  PathNodeDto,
  PathEdgeDto,
} from '../../../dto/indoor-map/path/save-path-graph.dto';
import { PatchPathGraphDto } from '../../../dto/indoor-map/path/patch-path-graph.dto';

@Injectable()
export class PathService {
  constructor(
    @InjectModel(PathNode.name)
    private readonly pathNodeModel: Model<PathNodeDocument>,
    private readonly mapService: MapService,
  ) {}

  /**
   * Helper: ตรวจสอบความถูกต้องของ Nodes พร้อมเช็ค Boundary และป้องกัน Duplicate ID
   */
  private processAndValidateNodes(
    nodes: PathNodeDto[],
    map: { width?: number; height?: number },
  ): {
    processedNodes: Array<{
      id: string;
      name?: string;
      type: string;
      position: { type: string; coordinates: number[] };
      connectedNodeIds: string[];
    }>;
    nodeMap: Map<string, { x: number; y: number }>;
  } {
    const nodeMap = new Map<string, { x: number; y: number }>();
    const seenIds = new Set<string>();

    const processedNodes = nodes.map((node) => {
      if (seenIds.has(node.id)) {
        throw new BadRequestException(
          `พบ Node ID ซ้ำซ้อนในรายการ: "${node.id}"`,
        );
      }
      seenIds.add(node.id);

      const position: any = node.position;
      let x = 0;
      let y = 0;

      if (Array.isArray(position) && position.length >= 2) {
        x = Number(position[0]);
        y = Number(position[1]);
      } else if (
        position?.coordinates &&
        Array.isArray(position.coordinates) &&
        position.coordinates.length >= 2
      ) {
        x = Number(position.coordinates[0]);
        y = Number(position.coordinates[1]);
      } else {
        x = Number(node.x ?? 0);
        y = Number(node.y ?? 0);
      }

      // Boundary Check: ตรวจสอบว่าพิกัดไม่ออกนอกขอบเขตผังแผนที่
      if (map.width && (x < 0 || x > map.width)) {
        throw new BadRequestException(
          `พิกัด X ของ Node "${node.id}" (${x}) อยู่นอกขอบเขตแผนที่ (0 - ${map.width})`,
        );
      }
      if (map.height && (y < 0 || y > map.height)) {
        throw new BadRequestException(
          `พิกัด Y ของ Node "${node.id}" (${y}) อยู่นอกขอบเขตแผนที่ (0 - ${map.height})`,
        );
      }

      nodeMap.set(node.id, { x, y });

      return {
        id: node.id,
        name: node.name,
        type: node.type || 'waypoint',
        position: {
          type: 'Point',
          coordinates: [x, y],
        },
        connectedNodeIds: Array.isArray(node.connectedNodeIds)
          ? [...node.connectedNodeIds]
          : [],
      };
    });

    return { processedNodes, nodeMap };
  }

  /**
   * Helper: แปลง edges เป็น connectedNodeIds ในแต่ละ Node และตรวจสอบความสมบูรณ์ของการเชื่อมโยง
   */
  private mergeEdgesIntoNodes(
    nodes: Array<{
      id: string;
      name?: string;
      type: string;
      position: { type: string; coordinates: number[] };
      connectedNodeIds: string[];
    }>,
    edges?: PathEdgeDto[],
  ): void {
    const nodeDict = new Map<string, { connectedNodeIds: Set<string> }>();
    for (const n of nodes) {
      nodeDict.set(n.id, { connectedNodeIds: new Set(n.connectedNodeIds) });
    }

    if (edges && Array.isArray(edges)) {
      for (const edge of edges) {
        if (edge.from === edge.to) {
          throw new BadRequestException(
            `เส้นทางเชื่อมโยง (Edge) ไม่สามารถเชื่อมจุดตัวเองได้ (Self-loop): "${edge.from}"`,
          );
        }

        const fromNode = nodeDict.get(edge.from);
        const toNode = nodeDict.get(edge.to);

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

        fromNode.connectedNodeIds.add(edge.to);
        if (edge.bidirectional !== false) {
          toNode.connectedNodeIds.add(edge.from);
        }
      }
    }

    // Assign กลับและตัด self-loops หรือ id ที่ไม่มีอยู่จริง
    for (const n of nodes) {
      const entry = nodeDict.get(n.id);
      if (entry) {
        n.connectedNodeIds = Array.from(entry.connectedNodeIds).filter(
          (targetId) => targetId !== n.id && nodeDict.has(targetId),
        );
      }
    }
  }

  /**
   * Helper: คำนวณ Edges อัตโนมัติจาก Adjacency List (connectedNodeIds) ของแต่ละ Node
   * คืนค่า PathEdge[] ที่มี open: true, verified: true ครบถ้วน เพื่อให้ findRoute ของ Frontend ทำงานได้ทันที
   */
  deriveEdges(
    nodes: Array<{
      id?: string;
      nodeId?: string;
      position?: { type?: string; coordinates?: number[] };
      connectedNodeIds?: string[];
    }>,
  ): PathEdge[] {
    const nodeMap = new Map<
      string,
      {
        id?: string;
        nodeId?: string;
        position?: { type?: string; coordinates?: number[] };
        connectedNodeIds?: string[];
      }
    >();
    for (const n of nodes) {
      const id = n.nodeId || n.id || '';
      if (id) nodeMap.set(id, n);
    }

    const seen = new Set<string>();
    const edges: PathEdge[] = [];

    for (const n of nodes) {
      const fromId = n.nodeId || n.id || '';
      if (!fromId) continue;
      const targets = n.connectedNodeIds ?? [];

      for (const toId of targets) {
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
   * 1. บันทึกหรืออัปเดตโครงข่ายเส้นทางเดิน (1 Node = 1 Document ใน collection path_nodes)
   */
  async savePathGraph(
    mapId: string,
    savePathGraphDto: SavePathGraphDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // 1. ตรวจสอบความถูกต้องของ Nodes
    const { processedNodes } = this.processAndValidateNodes(
      savePathGraphDto.nodes,
      map,
    );

    // 2. หลอมรวม Edges เข้ากับ connectedNodeIds ของแต่ละโหนด
    this.mergeEdgesIntoNodes(processedNodes, savePathGraphDto.edges);

    // 3. บันทึกแบบ Bulk Upsert (1 Node = 1 MongoDB Document อิสระ)
    // ไม่เก็บเป็น Array ยัดก้อนเดียวใน Map Document ป้องกันข้อจำกัดเรื่องขนาด 16MB และรองรับ 300+ บูธได้ไม่จำกัด
    const bulkOps = processedNodes.map((node) => ({
      updateOne: {
        filter: { mapId: resolvedMapId, nodeId: node.id },
        update: {
          $set: {
            mapId: resolvedMapId,
            nodeId: node.id,
            name: node.name,
            type: node.type,
            position: node.position,
            connectedNodeIds: node.connectedNodeIds,
          },
          $setOnInsert: { _id: uuidv4() },
        },
        upsert: true,
      },
    }));

    if (bulkOps.length > 0) {
      await this.pathNodeModel.bulkWrite(bulkOps as any);
    }

    // 4. ลบ Node เดิมของแผนที่นี้ที่ไม่ได้ส่งมาในรอบนี้ (Synchronize state)
    const incomingNodeIds = processedNodes.map((n) => n.id);
    await this.pathNodeModel.deleteMany({
      mapId: resolvedMapId,
      nodeId: { $nin: incomingNodeIds },
    });

    // 5. ดึงข้อมูล Nodes ทั้งหมดของแผนที่นี้กลับมา
    const allNodes = await this.pathNodeModel
      .find({ mapId: resolvedMapId })
      .lean()
      .exec();

    const formattedNodes = allNodes.map((n) => ({
      id: n.nodeId,
      nodeId: n.nodeId,
      name: n.name,
      type: n.type,
      position: n.position,
      connectedNodeIds: n.connectedNodeIds || [],
    }));

    const edges = this.deriveEdges(formattedNodes);
    const isolatedNodes = formattedNodes.filter(
      (n) => !n.connectedNodeIds || n.connectedNodeIds.length === 0,
    );

    return {
      mapId: resolvedMapId,
      totalNodes: formattedNodes.length,
      totalEdges: edges.length,
      isolatedNodesCount: isolatedNodes.length,
      isolatedNodeIds: isolatedNodes.map((n) => n.id),
      nodes: formattedNodes,
      edges,
    };
  }

  /**
   * 2. อัปเดตโครงข่ายเส้นทางเดินบางส่วน (Partial Update / PATCH)
   */
  async patchPathGraph(
    mapId: string,
    patchDto: PatchPathGraphDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // 1. ลบ Node (Cascade ลบออกจาก connectedNodeIds ของโหนดอื่นๆ ด้วย)
    if (patchDto.deleteNodeIds && patchDto.deleteNodeIds.length > 0) {
      await this.pathNodeModel.deleteMany({
        mapId: resolvedMapId,
        nodeId: { $in: patchDto.deleteNodeIds },
      });
      await this.pathNodeModel.updateMany(
        { mapId: resolvedMapId },
        { $pull: { connectedNodeIds: { $in: patchDto.deleteNodeIds } } as any },
      );
    }

    // 2. ลบ Edges
    if (patchDto.deleteEdges && patchDto.deleteEdges.length > 0) {
      for (const del of patchDto.deleteEdges) {
        await this.pathNodeModel.updateOne(
          { mapId: resolvedMapId, nodeId: del.from },
          { $pull: { connectedNodeIds: del.to } as any },
        );
        await this.pathNodeModel.updateOne(
          { mapId: resolvedMapId, nodeId: del.to },
          { $pull: { connectedNodeIds: del.from } as any },
        );
      }
    }

    // 3. ย้ายตำแหน่ง Node (Move Nodes)
    if (patchDto.moveNodes && patchDto.moveNodes.length > 0) {
      for (const move of patchDto.moveNodes) {
        if (map.width && (move.x < 0 || move.x > map.width)) {
          throw new BadRequestException(
            `พิกัด X ใหม่ (${move.x}) ของ Node "${move.id}" อยู่นอกขอบเขตแผนที่ (0 - ${map.width})`,
          );
        }
        if (map.height && (move.y < 0 || move.y > map.height)) {
          throw new BadRequestException(
            `พิกัด Y ใหม่ (${move.y}) ของ Node "${move.id}" อยู่นอกขอบเขตแผนที่ (0 - ${map.height})`,
          );
        }

        const res = await this.pathNodeModel.updateOne(
          { mapId: resolvedMapId, nodeId: move.id },
          { $set: { 'position.coordinates': [move.x, move.y] } },
        );
        if (res.matchedCount === 0) {
          throw new NotFoundException(
            `ไม่พบ Node ID "${move.id}" ในแผนที่นี้ที่ต้องการย้ายตำแหน่ง`,
          );
        }
      }
    }

    // 4. เพิ่มหรืออัปเดต Nodes ใหม่
    if (patchDto.addNodes && patchDto.addNodes.length > 0) {
      const { processedNodes } = this.processAndValidateNodes(
        patchDto.addNodes,
        map,
      );
      const bulkOps = processedNodes.map((n) => ({
        updateOne: {
          filter: { mapId: resolvedMapId, nodeId: n.id },
          update: {
            $set: {
              mapId: resolvedMapId,
              nodeId: n.id,
              name: n.name,
              type: n.type,
              position: n.position,
              ...(n.connectedNodeIds.length > 0
                ? { connectedNodeIds: n.connectedNodeIds }
                : {}),
            },
            $setOnInsert: { _id: uuidv4() },
          },
          upsert: true,
        },
      }));
      await this.pathNodeModel.bulkWrite(bulkOps as any);
    }

    // 5. เพิ่ม Edges ใหม่
    if (patchDto.addEdges && patchDto.addEdges.length > 0) {
      for (const edge of patchDto.addEdges) {
        await this.pathNodeModel.updateOne(
          { mapId: resolvedMapId, nodeId: edge.from },
          { $addToSet: { connectedNodeIds: edge.to } as any },
        );
        if (edge.bidirectional !== false) {
          await this.pathNodeModel.updateOne(
            { mapId: resolvedMapId, nodeId: edge.to },
            { $addToSet: { connectedNodeIds: edge.from } as any },
          );
        }
      }
    }

    return this.findPathGraphByMapId(mapId);
  }

  /**
   * 3. ดึงโครงข่ายเส้นทางเดินของแผนที่ (100% Compatible กับ findRoute ของ Frontend)
   */
  async findPathGraphByMapId(mapId: string): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // ค้นหา Node ทั้งหมดในเสี้ยววินาทีด้วย Index { mapId: 1 }
    const nodes = await this.pathNodeModel
      .find({ mapId: resolvedMapId })
      .lean()
      .exec();

    const formattedNodes = nodes.map((n) => ({
      id: n.nodeId,
      nodeId: n.nodeId,
      name: n.name,
      type: n.type,
      position: n.position,
      connectedNodeIds: n.connectedNodeIds || [],
    }));

    const edges = this.deriveEdges(formattedNodes);
    const isolatedNodes = formattedNodes.filter(
      (n) => !n.connectedNodeIds || n.connectedNodeIds.length === 0,
    );

    return {
      mapId: resolvedMapId,
      totalNodes: formattedNodes.length,
      totalEdges: edges.length,
      isolatedNodesCount: isolatedNodes.length,
      isolatedNodeIds: isolatedNodes.map((n) => n.id),
      nodes: formattedNodes,
      edges,
    };
  }

  /**
   * 4. ลบโครงข่ายเส้นทางเดินของแผนที่
   */
  async deletePathGraph(
    mapId: string,
  ): Promise<{ success: boolean; message: string }> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    await this.pathNodeModel.deleteMany({ mapId: resolvedMapId }).exec();
    return {
      success: true,
      message: `Path nodes for map "${map.name}" deleted successfully`,
    };
  }
}
