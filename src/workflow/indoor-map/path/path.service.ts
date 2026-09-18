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
import { PatchPathGraphDto } from '../../../dto/indoor-map/path/patch-path-graph.dto';

@Injectable()
export class PathService {
  constructor(
    @InjectModel(PathGraph.name)
    private readonly pathGraphModel: Model<PathGraphDocument>,
    private readonly mapService: MapService,
  ) { }

  /**
   * Helper: ตรวจสอบความถูกต้องของ Nodes พร้อมเช็ค Boundary และป้องกัน Duplicate ID
   */
  private processAndValidateNodes(
    nodes: any[],
    map: { width?: number; height?: number },
  ): { processedNodes: any[]; nodeMap: Record<string, { x: number; y: number }> } {
    const nodeMap: Record<string, { x: number; y: number }> = {};
    const seenIds = new Set<string>();

    const processedNodes = nodes.map((node) => {
      if (seenIds.has(node.id)) {
        throw new BadRequestException(`พบ Node ID ซ้ำซ้อนในรายการ: "${node.id}"`);
      }
      seenIds.add(node.id);

      let position: any = node.position;
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

      nodeMap[node.id] = { x, y };

      return {
        id: node.id,
        name: node.name,
        type: node.type || 'waypoint',
        position: {
          type: 'Point',
          coordinates: [x, y],
        },
      };
    });

    return { processedNodes, nodeMap };
  }

  /**
   * Helper: ตรวจสอบ Edges, ป้องกัน Self-loop, ป้องกัน Duplicate Edge และคำนวณ Euclidean distance
   */
  private processAndValidateEdges(
    edges: any[],
    nodeMap: Record<string, { x: number; y: number }>,
  ): any[] {
    const seenEdges = new Set<string>();

    return edges.map((edge) => {
      // 1. ป้องกัน Self-loop
      if (edge.from === edge.to) {
        throw new BadRequestException(
          `เส้นทางเชื่อมโยง (Edge) ไม่สามารถเชื่อมจุดตัวเองได้ (Self-loop detected): "${edge.from}"`,
        );
      }

      // 2. ป้องกันจุดไม่มีอยู่จริง
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

      // 3. ป้องกัน Duplicate Edge
      const edgeKey = `${edge.from}->${edge.to}`;
      if (seenEdges.has(edgeKey)) {
        throw new BadRequestException(
          `พบเส้นทางเชื่อมโยงซ้ำซ้อน: จาก "${edge.from}" ไป "${edge.to}"`,
        );
      }
      seenEdges.add(edgeKey);

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
  }

  /**
   * Helper: คำนวณหา Isolated Nodes (จุดที่ไม่มีเส้นทางเชื่อมโยงเลย)
   */
  private findIsolatedNodes(nodes: any[], edges: any[]): string[] {
    const connectedNodeIds = new Set<string>();
    for (const edge of edges) {
      connectedNodeIds.add(edge.from);
      connectedNodeIds.add(edge.to);
    }
    return nodes
      .map((n) => n.id)
      .filter((id) => !connectedNodeIds.has(id));
  }

  /**
   * 1. บันทึกหรืออัปเดตโครงข่ายเส้นทางเดินทั้งก้อน (Save / Upsert Full Path Graph)
   */
  async savePathGraph(
    mapId: string,
    savePathGraphDto: SavePathGraphDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    // ตรวจสอบความถูกต้องของ Nodes และ Edges ด้วย Validator
    const { processedNodes, nodeMap } = this.processAndValidateNodes(
      savePathGraphDto.nodes,
      map,
    );
    const processedEdges = this.processAndValidateEdges(
      savePathGraphDto.edges,
      nodeMap,
    );
    const isolatedNodeIds = this.findIsolatedNodes(processedNodes, processedEdges);

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
      isolatedNodesCount: isolatedNodeIds.length,
      isolatedNodeIds,
      nodes: pathGraph.nodes,
      edges: pathGraph.edges,
      createdAt: pathGraph.createdAt,
      updatedAt: pathGraph.updatedAt,
    };
  }

  /**
   * 2. อัปเดตโครงข่ายเส้นทางเดินบางส่วน (Safe Partial Update / PATCH)
   */
  async patchPathGraph(
    mapId: string,
    patchDto: PatchPathGraphDto,
  ): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    const existing = await this.pathGraphModel.findOne({ mapId: resolvedMapId }).exec();
    if (!existing) {
      throw new NotFoundException(
        `ยังไม่มีโครงข่ายเส้นทางเดินสำหรับแผนที่ "${map.name}" กรุณาบันทึกเริ่มต้นด้วย POST ก่อน`,
      );
    }

    let nodes: any[] = existing.nodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      position: {
        type: 'Point',
        coordinates: [n.position.coordinates[0], n.position.coordinates[1]],
      },
    }));

    let edges: any[] = existing.edges.map((e) => ({
      from: e.from,
      to: e.to,
      weight: e.weight,
      bidirectional: e.bidirectional,
      accessible: e.accessible,
    }));

    // 1. ลบ Node (Safe Cascade: ลบทั้ง Node และ Edges ที่ต่ออยู่ทั้งหมดอัตโนมัติ)
    if (patchDto.deleteNodeIds && patchDto.deleteNodeIds.length > 0) {
      const deleteSet = new Set(patchDto.deleteNodeIds);
      nodes = nodes.filter((n) => !deleteSet.has(n.id));
      edges = edges.filter((e) => !deleteSet.has(e.from) && !deleteSet.has(e.to));
    }

    // 2. ลบ Edge เฉพาะเส้น
    if (patchDto.deleteEdges && patchDto.deleteEdges.length > 0) {
      for (const del of patchDto.deleteEdges) {
        edges = edges.filter(
          (e) =>
            !(e.from === del.from && e.to === del.to) &&
            !(e.bidirectional && e.from === del.to && e.to === del.from),
        );
      }
    }

    // 3. ย้ายตำแหน่ง Node (Move Nodes) + คำนวณระยะทาง weight ของ Edges ที่เชื่อมอยู่ใหม่ให้อัตโนมัติ!
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

        const targetNode = nodes.find((n) => n.id === move.id);
        if (!targetNode) {
          throw new NotFoundException(
            `ไม่พบ Node ID "${move.id}" ในโครงข่ายที่ต้องการย้ายตำแหน่ง`,
          );
        }
        targetNode.position.coordinates = [move.x, move.y];
      }

      // สร้าง currentMap ล่าสุดเพื่อคำนวณระยะทางใหม่
      const currentMap: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        currentMap[n.id] = {
          x: n.position.coordinates[0],
          y: n.position.coordinates[1],
        };
      }

      const movedIds = new Set(patchDto.moveNodes.map((m) => m.id));
      for (const edge of edges) {
        if (movedIds.has(edge.from) || movedIds.has(edge.to)) {
          const fromPt = currentMap[edge.from];
          const toPt = currentMap[edge.to];
          if (fromPt && toPt) {
            edge.weight = Number(
              Math.hypot(toPt.x - fromPt.x, toPt.y - fromPt.y).toFixed(2),
            );
          }
        }
      }
    }

    // 4. เพิ่มหรืออัปเดต Nodes ใหม่
    if (patchDto.addNodes && patchDto.addNodes.length > 0) {
      const { processedNodes: newNodes } = this.processAndValidateNodes(
        patchDto.addNodes,
        map,
      );
      for (const n of newNodes) {
        const idx = nodes.findIndex((existingNode) => existingNode.id === n.id);
        if (idx >= 0) {
          nodes[idx] = n;
        } else {
          nodes.push(n);
        }
      }
    }

    // 5. เพิ่ม Edges ใหม่
    if (patchDto.addEdges && patchDto.addEdges.length > 0) {
      const nodeMap: Record<string, { x: number; y: number }> = {};
      for (const n of nodes) {
        nodeMap[n.id] = {
          x: n.position.coordinates[0],
          y: n.position.coordinates[1],
        };
      }
      const newProcessedEdges = this.processAndValidateEdges(
        patchDto.addEdges,
        nodeMap,
      );
      for (const edge of newProcessedEdges) {
        const idx = edges.findIndex(
          (e) => e.from === edge.from && e.to === edge.to,
        );
        if (idx >= 0) {
          edges[idx] = edge;
        } else {
          edges.push(edge);
        }
      }
    }

    // ตรวจสอบความถูกต้องภาพรวมอีกครั้งก่อนบันทึก
    const finalNodeMap: Record<string, { x: number; y: number }> = {};
    for (const n of nodes) {
      finalNodeMap[n.id] = {
        x: n.position.coordinates[0],
        y: n.position.coordinates[1],
      };
    }
    const validatedEdges = this.processAndValidateEdges(edges, finalNodeMap);
    const isolatedNodeIds = this.findIsolatedNodes(nodes, validatedEdges);

    existing.nodes = nodes as any;
    existing.edges = validatedEdges as any;
    const saved: any = await existing.save();

    return {
      id: saved._id,
      mapId: saved.mapId,
      totalNodes: saved.nodes.length,
      totalEdges: saved.edges.length,
      isolatedNodesCount: isolatedNodeIds.length,
      isolatedNodeIds,
      nodes: saved.nodes,
      edges: saved.edges,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  /**
   * 3. ดึงโครงข่ายเส้นทางเดินของแผนที่
   */
  async findPathGraphByMapId(mapId: string): Promise<any> {
    const map = await this.mapService.findMapById(mapId);
    const resolvedMapId = map._id;

    const pathGraph = await this.pathGraphModel
      .findOne({ mapId: resolvedMapId })
      .lean()
      .exec();

    const nodes = pathGraph?.nodes ?? [];
    const edges = pathGraph?.edges ?? [];
    const isolatedNodeIds = this.findIsolatedNodes(nodes, edges);

    return {
      mapId: resolvedMapId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      isolatedNodesCount: isolatedNodeIds.length,
      isolatedNodeIds,
      nodes,
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

    await this.pathGraphModel.deleteOne({ mapId: resolvedMapId }).exec();
    return { success: true, message: `Path graph for map "${map.name}" deleted` };
  }
}
