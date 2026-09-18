import {
  Controller,
  Get,
  Post,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MapService } from './map.service';
import { CreateMapDto } from '../../../dto/indoor-map/map/create-map.dto';

@ApiTags('Indoor Maps')
@Controller()
export class MapController {
  constructor(private readonly mapService: MapService) { }

  // ==========================================
  // 1. แผนที่หลัก (Maps)
  // ==========================================
  @Post('maps')
  @ApiOperation({
    summary: 'สร้างแผนที่หลัก (Create Main Map / Floor Plan)',
    description: 'บันทึกข้อมูลแปลนอาคาร/แผนที่หลัก เช่น ชื่อฮอลล์, อาคาร, ขนาด และภาพแปลน',
  })
  @ApiResponse({ status: 201, description: 'สร้างแผนที่สำเร็จ' })
  createMap(@Body() createMapDto: CreateMapDto) {
    return this.mapService.createMap(createMapDto);
  }

  @Get('maps')
  @ApiOperation({
    summary: 'ดึงรายการแผนที่ทั้งหมด (List all maps)',
  })
  findAllMaps() {
    return this.mapService.findAllMaps();
  }

  @Get('maps/:id')
  @ApiOperation({
    summary: 'ดึงข้อมูลแผนที่เดี่ยว (Get single map by ID)',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  findMapById(@Param('id') id: string) {
    return this.mapService.findMapById(id);
  }

  @Delete('maps/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ลบแผนที่หลัก (Delete Map by ID)',
    description: 'ลบแผนที่พร้อม cascade ลบข้อมูลบูธและโครงข่ายเส้นทางเดินทั้งหมดที่เกี่ยวข้องกับแผนที่นี้',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  deleteMap(@Param('id') id: string) {
    return this.mapService.deleteMap(id);
  }

  // ==========================================
  // 2. แสดงแผนที่รวมบูธ (Full Map with Booths & Paths)
  // ==========================================
  @Get('maps/:id/full')
  @ApiOperation({
    summary: 'แสดงแผนที่รวมบูธและเส้นทางทั้งหมด (Get Map with all Booths & Paths)',
    description: 'ดึงข้อมูลแผนที่หลักพร้อมรายการบูธทั้งหมดและโครงข่ายเส้นทางเดินสำหรับคำนวณ A*',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  findMapWithBooths(@Param('id') id: string) {
    return this.mapService.findMapWithBooths(id);
  }
}
