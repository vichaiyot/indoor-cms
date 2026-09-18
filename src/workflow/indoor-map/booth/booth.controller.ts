import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
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
import { BoothService } from './booth.service';
import { CreateBoothDto } from '../../../dto/indoor-map/booth/create-booth.dto';
import { UpdateBoothDto } from '../../../dto/indoor-map/booth/update-booth.dto';

@ApiTags('Booths')
@Controller()
export class BoothController {
  constructor(private readonly boothService: BoothService) { }

  // ==========================================
  // บูธและตำแหน่งพิกัด (Booths)
  // ==========================================
  @Post('maps/:mapId/booths')
  @ApiOperation({
    summary: 'สร้างบูธและเก็บข้อมูลพร้อมตำแหน่ง (Create Booth with Point Position)',
    description:
      'บันทึกข้อมูลบูธพร้อมพิกัดตำแหน่ง Point [x, y], ขนาดมิติ 3D (size), footprint polygon, type และพิกัดภูมิศาสตร์ geo [lng, lat]',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID ที่ต้องการผูกบูธไว้' })
  @ApiResponse({ status: 201, description: 'สร้างบูธและบันทึกพิกัดสำเร็จ' })
  createBooth(
    @Param('mapId') mapId: string,
    @Body() createBoothDto: CreateBoothDto,
  ) {
    return this.boothService.createBooth(mapId, createBoothDto);
  }

  @Get('maps/:mapId/booths')
  @ApiOperation({
    summary: 'ดึงรายการบูธทั้งหมดในแผนที่ที่ระบุ',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID หรือชื่อ Hall' })
  findBoothsByMapId(@Param('mapId') mapId: string) {
    return this.boothService.findBoothsByMapId(mapId);
  }

  @Get('booths/:id')
  @ApiOperation({
    summary: 'ดึงข้อมูลบูธตาม ID',
  })
  @ApiParam({ name: 'id', description: 'Booth UUID' })
  findBoothById(@Param('id') id: string) {
    return this.boothService.findBoothById(id);
  }

  @Patch('booths/:id')
  @ApiOperation({
    summary: 'แก้ไขข้อมูลหรือขยับตำแหน่งบูธ (Update Booth Info or Coordinates)',
  })
  @ApiParam({ name: 'id', description: 'Booth UUID' })
  updateBooth(
    @Param('id') id: string,
    @Body() updateBoothDto: UpdateBoothDto,
  ) {
    return this.boothService.updateBooth(id, updateBoothDto);
  }

  @Delete('booths/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ลบบูธ (Delete Booth)',
  })
  @ApiParam({ name: 'id', description: 'Booth UUID' })
  deleteBooth(@Param('id') id: string) {
    return this.boothService.deleteBooth(id);
  }
}
