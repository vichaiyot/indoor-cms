import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { PathService } from './path.service';
import { SavePathGraphDto } from '../../../dto/indoor-map/path/save-path-graph.dto';

@ApiTags('Paths & Navigation')
@Controller()
export class PathController {
  constructor(private readonly pathService: PathService) { }

  // ==========================================
  // เส้นทางเดินและโครงข่ายนำทาง (Paths / Navigation Graph for A*)
  // ==========================================
  @Post('maps/:mapId/paths')
  @ApiOperation({
    summary: 'บันทึกหรืออัปเดตโครงข่ายเส้นทางเดิน (Save / Upsert Navigation Path Graph)',
    description:
      'บันทึกจุดทางเดิน (Nodes/Waypoints) และเส้นเชื่อมโยง (Edges/Walkways) ประจำแผนที่ เพื่อนำไปใช้คำนวณอัลกอริทึม A* (หากไม่ระบุ weight ระบบจะคำนวณระยะทาง Euclidean ให้โดยอัตโนมัติ)',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID ที่ต้องการผูกเส้นทางเดิน' })
  @ApiResponse({ status: 200, description: 'บันทึกโครงข่ายเส้นทางเดินสำเร็จ' })
  savePathGraph(
    @Param('mapId') mapId: string,
    @Body() savePathGraphDto: SavePathGraphDto,
  ) {
    return this.pathService.savePathGraph(mapId, savePathGraphDto);
  }

  @Get('maps/:mapId/paths')
  @ApiOperation({
    summary: 'ดึงโครงข่ายเส้นทางเดินของแผนที่ (Get Path Graph for A* Calculation)',
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
