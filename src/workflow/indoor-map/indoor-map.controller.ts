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
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IndoorMapService } from './indoor-map.service';
import { CreateMapDto } from '../../dto/indoor-map/create-map.dto';
import { CreateBoothDto } from '../../dto/indoor-map/create-booth.dto';
import { UpdateBoothDto } from '../../dto/indoor-map/update-booth.dto';

@ApiTags('Indoor Maps & Booths')
@Controller()
export class IndoorMapController {
  constructor(private readonly indoorMapService: IndoorMapService) { }

  // ==========================================
  // 1. สร้าง แผนที่หลัก
  // ==========================================
  @Post('maps')
  @ApiOperation({
    summary: 'สร้างแผนที่หลัก (Create Main Map / Floor Plan)',
    description: 'บันทึกข้อมูลแปลนอาคาร/แผนที่หลัก เช่น ชื่อฮอลล์, อาคาร, ขนาด และภาพแปลน',
  })
  @ApiResponse({ status: 201, description: 'สร้างแผนที่สำเร็จ' })
  createMap(@Body() createMapDto: CreateMapDto) {
    return this.indoorMapService.createMap(createMapDto);
  }

  @Get('maps')
  @ApiOperation({
    summary: 'ดึงรายการแผนที่ทั้งหมด (List all maps)',
  })
  findAllMaps() {
    return this.indoorMapService.findAllMaps();
  }

  @Get('maps/:id')
  @ApiOperation({
    summary: 'ดึงข้อมูลแผนที่เดี่ยว (Get single map by ID)',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  findMapById(@Param('id') id: string) {
    return this.indoorMapService.findMapById(id);
  }

  // ==========================================
  // 3. แสดง แผนที่รวมบูธ (Full Map with Booths)
  // ==========================================
  @Get('maps/:id/full')
  @ApiOperation({
    summary: 'แสดงแผนที่รวมบูธทั้งหมด (Get Map with all Booths & Positions)',
    description: 'ดึงข้อมูลแผนที่หลักพร้อมรายการบูธทั้งหมดและพิกัดตำแหน่ง (ทั้ง 2D Canvas และ PostGIS spatial coordinates)',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  findMapWithBooths(@Param('id') id: string) {
    return this.indoorMapService.findMapWithBooths(id);
  }

  // ==========================================
  // 2. สร้าง บูธเก็บข้อมูลของบูธเก็บตำแหน่ง
  // ==========================================
  @Post('maps/:mapId/booths')
  @ApiOperation({
    summary: 'สร้างบูธและเก็บข้อมูลพร้อมตำแหน่ง (Create Booth with Position)',
    description: 'บันทึกข้อมูลบูธ (รหัสบูธ, ชื่อ, สถานะ) พร้อมพิกัดตำแหน่ง x, y และ PostGIS Point (longitude, latitude)',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID ที่ต้องการผูกบูธไว้' })
  @ApiResponse({ status: 201, description: 'สร้างบูธและบันทึกพิกัดสำเร็จ' })
  createBooth(
    @Param('mapId') mapId: string,
    @Body() createBoothDto: CreateBoothDto,
  ) {
    return this.indoorMapService.createBooth(mapId, createBoothDto);
  }

  @Get('maps/:mapId/booths')
  @ApiOperation({
    summary: 'ดึงรายการบูธทั้งหมดในแผนที่ที่ระบุ',
  })
  @ApiParam({ name: 'mapId', description: 'Map UUID' })
  findBoothsByMapId(@Param('mapId') mapId: string) {
    return this.indoorMapService.findBoothsByMapId(mapId);
  }

  @Get('booths/:id')
  @ApiOperation({
    summary: 'ดึงข้อมูลบูธตาม ID',
  })
  @ApiParam({ name: 'id', description: 'Booth UUID' })
  findBoothById(@Param('id') id: string) {
    return this.indoorMapService.findBoothById(id);
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
    return this.indoorMapService.updateBooth(id, updateBoothDto);
  }

  @Delete('booths/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ลบบูธ (Delete Booth)',
  })
  @ApiParam({ name: 'id', description: 'Booth UUID' })
  deleteBooth(@Param('id') id: string) {
    return this.indoorMapService.deleteBooth(id);
  }
}
