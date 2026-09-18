import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PointDto } from '../booth/create-booth.dto';

export class PathNodeDto {
  @ApiProperty({
    example: 'n1',
    description: 'Unique node/waypoint ID (เช่น n1, wp-01, door-a01)',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({
    type: PointDto,
    description: '2D Position Point [x, y] on floor plan canvas',
    example: {
      type: 'Point',
      coordinates: [100.0, 200.0],
    },
  })
  @IsOptional()
  position?: any;

  @ApiPropertyOptional({
    example: 'หน้าทางเข้าฮอลล์ 1',
    description: 'Readable node label / name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'door',
    default: 'waypoint',
    description:
      'Node category (e.g. waypoint, door, intersection, elevator, stairs)',
  })
  @IsString()
  @IsOptional()
  type?: string;

  // Backward-compatible / Flat fields (hidden from Swagger)
  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  y?: number;
}

export class PathEdgeDto {
  @ApiProperty({
    example: 'n1',
    description: 'Starting Node ID',
  })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({
    example: 'n2',
    description: 'Ending Node ID',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiPropertyOptional({
    example: 80.0,
    description:
      'Distance/weight between nodes (หากเว้นว่างไว้ ระบบจะคำนวณ Euclidean distance จากพิกัด x, y ให้โดยอัตโนมัติ)',
  })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether path allows traversal in both directions (สองทาง)',
  })
  @IsBoolean()
  @IsOptional()
  bidirectional?: boolean;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Accessible route for wheelchairs / strollers (ทางลาดคนพิการ)',
  })
  @IsBoolean()
  @IsOptional()
  accessible?: boolean;
}

export class SavePathGraphDto {
  @ApiProperty({
    type: [PathNodeDto],
    description: 'รายการจุดหมุด/ทางเลี้ยว/จุดแยกบนทางเดินทั้งหมด (Waypoints)',
    example: [
      {
        id: 'n1',
        name: 'หน้าทางเข้าฮอลล์ 1',
        type: 'door',
        position: { type: 'Point', coordinates: [100.0, 200.0] },
      },
      {
        id: 'n2',
        name: 'ทางแยกหลัก',
        type: 'intersection',
        position: { type: 'Point', coordinates: [100.0, 340.0] },
      },
      {
        id: 'n3',
        name: 'จุดเชื่อมต่อหน้าบูธ A01',
        type: 'waypoint',
        position: { type: 'Point', coordinates: [120.0, 340.0] },
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathNodeDto)
  nodes: PathNodeDto[];

  @ApiProperty({
    type: [PathEdgeDto],
    description: 'รายการเส้นเชื่อมต่อทางเดินระหว่างจุด (Walkway segments)',
    example: [
      { from: 'n1', to: 'n2', bidirectional: true, accessible: true },
      { from: 'n2', to: 'n3', bidirectional: true, accessible: true },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathEdgeDto)
  edges: PathEdgeDto[];
}
