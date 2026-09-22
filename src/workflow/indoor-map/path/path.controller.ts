import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PathService } from './path.service';
import { SavePathGraphDto } from '../../../dto/indoor-map/path/save-path-graph.dto';
import { PatchPathGraphDto } from '../../../dto/indoor-map/path/patch-path-graph.dto';

@ApiTags('Paths & Navigation')
@Controller()
export class PathController {
  constructor(private readonly pathService: PathService) {}

  // ==========================================
  // เส้นทางเดินและโครงข่ายนำทาง (Paths / Navigation Graph for A*)
  // ==========================================
  @Post('maps/:mapId/paths')
  @ApiOperation({
    summary:
      'บันทึกหรืออัปเดตโครงข่ายเส้นทางเดินทั้งก้อน (Save / Upsert Navigation Path Graph)',
    description:
      'บันทึกจุดทางเดิน (Nodes/Waypoints) ประจำแผนที่ โดยแต่ละ Node จะระบุจุดที่เชื่อมต่อกันด้วย connectedNodeIds (ไม่จำเป็นต้องมี edges แยก)',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID ที่ต้องการผูกเส้นทางเดิน' })
  @ApiBody({
    type: SavePathGraphDto,
    description:
      'รายการจุดทางเดินทั้งหมด (Nodes/Waypoints) ในรูปแบบ 1 Node = 1 Document พร้อม Adjacency List (connectedNodeIds)',
    examples: {
      nodeOnlyExample: {
        summary: 'รูปแบบแนะนำ: เก็บเฉพาะ Nodes พร้อม connectedNodeIds',
        value: {
          nodes: [
            {
              id: 'n1',
              name: 'หน้าทางเข้าฮอลล์ 1',
              type: 'door',
              position: { type: 'Point', coordinates: [100.0, 200.0] },
              connectedNodeIds: ['n2'],
            },
            {
              id: 'n2',
              name: 'ทางแยกหลัก',
              type: 'intersection',
              position: { type: 'Point', coordinates: [100.0, 340.0] },
              connectedNodeIds: ['n1', 'n3'],
            },
            {
              id: 'n3',
              name: 'จุดเชื่อมต่อหน้าบูธ A01',
              type: 'waypoint',
              position: { type: 'Point', coordinates: [120.0, 340.0] },
              connectedNodeIds: ['n2'],
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'บันทึกโครงข่ายเส้นทางเดินสำเร็จ' })
  savePathGraph(
    @Param('mapId') mapId: string,
    @Body() savePathGraphDto: SavePathGraphDto,
  ) {
    return this.pathService.savePathGraph(mapId, savePathGraphDto);
  }

  @Patch('maps/:mapId/paths')
  @ApiOperation({
    summary: 'อัปเดตโครงข่ายเส้นทางเดินบางส่วน (Partial Update / Safe PATCH)',
    description:
      'รองรับการย้ายพิกัด Node (moveNodes), ลบจุด (deleteNodeIds: พร้อม cascade ลบออกจาก connectedNodeIds ของโหนดอื่นอัตโนมัติ), และเพิ่มจุดใหม่ (addNodes)',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID' })
  @ApiBody({
    type: PatchPathGraphDto,
    description: 'อัปเดตเฉพาะบางส่วนในระดับ Node',
    examples: {
      patchNodeExample: {
        summary: 'ตัวอย่างการอัปเดตบางส่วน (Move / Add / Delete Nodes)',
        value: {
          moveNodes: [{ id: 'n1', x: 150.0, y: 220.0 }],
          addNodes: [
            {
              id: 'n4',
              name: 'บันไดเลื่อนชั้น 1',
              type: 'stairs',
              position: { type: 'Point', coordinates: [300.0, 450.0] },
              connectedNodeIds: ['n2'],
            },
          ],
          deleteNodeIds: ['n3'],
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'อัปเดตโครงข่ายเส้นทางเดินสำเร็จ' })
  patchPathGraph(
    @Param('mapId') mapId: string,
    @Body() patchPathGraphDto: PatchPathGraphDto,
  ) {
    return this.pathService.patchPathGraph(mapId, patchPathGraphDto);
  }

  @Get('maps/:mapId/paths')
  @ApiOperation({
    summary:
      'ดึงโครงข่ายเส้นทางเดินของแผนที่ (Get Path Graph for A* Calculation)',
    description:
      'ดึงรายการจุดทางเดิน (Nodes) และเส้นเชื่อม (Edges) ทั้งหมดของแผนที่ เพื่อให้ Frontend นำไปรันอัลกอริทึม A* ได้ทันที',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID หรือชื่อ Hall' })
  findPathGraphByMapId(@Param('mapId') mapId: string) {
    return this.pathService.findPathGraphByMapId(mapId);
  }

  @Delete('maps/:mapId/paths')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ลบโครงข่ายเส้นทางเดินของแผนที่ (Delete Path Graph)',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID' })
  deletePathGraph(@Param('mapId') mapId: string) {
    return this.pathService.deletePathGraph(mapId);
  }
}
