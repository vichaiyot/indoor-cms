import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { MapService } from './map.service';
import { CreateMapDto } from '../../../dto/indoor-map/map/create-map.dto';
import { UpdateMapDto } from '../../../dto/indoor-map/map/update-map.dto';

@ApiTags('Indoor Maps')
@Controller()
export class MapController {
  constructor(private readonly mapService: MapService) {}

  // ==========================================
  // 1. แผนที่หลัก (Maps)
  // ==========================================
  @Post('maps/:id/upload-plan')
  @ApiOperation({
    summary: 'อัปโหลดภาพแปลนอาคาร (Upload Blueprint Plan Image / File)',
    description:
      'อัปโหลดไฟล์ภาพแปลนอาคาร (PNG, JPG, WEBP, SVG) เพื่อใช้เป็นภาพพื้นหลังในการวาดผังบูธและเส้นทางเดินทับลงไป',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'ไฟล์รูปภาพแปลน (PNG, JPG, JPEG, WEBP, SVG)',
        },
        width: {
          type: 'number',
          description: 'ความกว้างของแปลน (canvas width)',
          example: 1920,
        },
        height: {
          type: 'number',
          description: 'ความยาว/สูงของแปลน (canvas height)',
          example: 1080,
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${uuidv4().substring(0, 8)}`;
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `blueprint-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|svg\+xml)$/)) {
          return cb(
            new BadRequestException(
              'รองรับเฉพาะไฟล์รูปภาพ (JPG, JPEG, PNG, WEBP, SVG) เท่านั้น',
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB max
      },
    }),
  )
  uploadBlueprint(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('width') width?: number,
    @Body('height') height?: number,
  ) {
    if (!file) {
      throw new BadRequestException('กรุณาเลือกไฟล์รูปภาพแปลน');
    }
    return this.mapService.uploadBlueprint(id, file, width, height);
  }
  @Post('maps')
  @ApiOperation({
    summary: 'สร้างแผนที่หลัก (Create Main Map / Floor Plan)',
    description:
      'บันทึกข้อมูลแปลนอาคาร/แผนที่หลัก เช่น ชื่อฮอลล์, อาคาร, ขนาด และภาพแปลน',
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

  @Patch('maps/:id')
  @ApiOperation({
    summary: 'แก้ไขข้อมูลแผนที่หลัก (Update Map Info / Dimensions)',
    description:
      'แก้ไขข้อมูลแผนที่ เช่น ชื่อฮอลล์, อาคาร, ชั้น, ภาพแปลน หรือขนาดของผัง',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  @ApiResponse({ status: 200, description: 'แก้ไขข้อมูลแผนที่สำเร็จ' })
  updateMap(@Param('id') id: string, @Body() updateMapDto: UpdateMapDto) {
    return this.mapService.updateMap(id, updateMapDto);
  }

  @Delete('maps/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'ลบแผนที่หลัก (Delete Map by ID)',
    description:
      'ลบแผนที่พร้อม cascade ลบข้อมูลบูธและโครงข่ายเส้นทางเดินทั้งหมดที่เกี่ยวข้องกับแผนที่นี้',
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
    summary:
      'แสดงแผนที่รวมบูธและเส้นทางทั้งหมด (Get Map with all Booths & Paths)',
    description:
      'ดึงข้อมูลแผนที่หลักพร้อมรายการบูธทั้งหมดและโครงข่ายเส้นทางเดินสำหรับคำนวณ A*',
  })
  @ApiParam({ name: 'id', description: 'Map UUID' })
  findMapWithBooths(@Param('id') id: string) {
    return this.mapService.findMapWithBooths(id);
  }
}
