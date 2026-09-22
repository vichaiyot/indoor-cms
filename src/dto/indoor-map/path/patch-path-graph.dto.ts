import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PathEdgeDto, PathNodeDto } from './save-path-graph.dto';

export class MoveNodeDto {
  @ApiProperty({ example: 'n1', description: 'ID ของ Node ที่ต้องการย้าย' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 150.5, description: 'พิกัด X ใหม่บนผังอาคาร' })
  @IsNumber()
  x: number;

  @ApiProperty({ example: 320.0, description: 'พิกัด Y ใหม่บนผังอาคาร' })
  @IsNumber()
  y: number;
}

export class DeleteEdgeDto {
  @ApiProperty({ example: 'n1', description: 'Node ID ต้นทาง' })
  @IsString()
  @IsNotEmpty()
  from: string;

  @ApiProperty({ example: 'n2', description: 'Node ID ปลายทาง' })
  @IsString()
  @IsNotEmpty()
  to: string;
}

export class PatchPathGraphDto {
  @ApiPropertyOptional({
    type: [MoveNodeDto],
    description:
      'ย้ายตำแหน่งพิกัดของ Node (ระบบจะคำนวณ weight ระยะทางของ Edges ที่เชื่อมอยู่ใหม่ให้อัตโนมัติ)',
    example: [{ id: 'n1', x: 150, y: 220 }],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MoveNodeDto)
  moveNodes?: MoveNodeDto[];

  @ApiPropertyOptional({
    type: [PathNodeDto],
    description: 'เพิ่มหรืออัปเดต Node ใหม่เข้าสู่โครงข่าย (ระบุ connectedNodeIds)',
    example: [
      {
        id: 'n4',
        name: 'บันไดเลื่อนชั้น 1',
        type: 'stairs',
        position: { type: 'Point', coordinates: [300, 450] },
        connectedNodeIds: ['n2'],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathNodeDto)
  addNodes?: PathNodeDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'ลบ Node ตาม ID (ระบบจะ cascade ลบ Edges ที่ต่อกับ Node นี้ทิ้งให้อัตโนมัติ ป้องกัน dangling edges)',
    example: ['n3'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  deleteNodeIds?: string[];

  // ซ่อน edges จาก Swagger Body Example ตามที่ร้องขอ เพื่อให้แสดงเฉพาะ node operations
  @ApiHideProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PathEdgeDto)
  addEdges?: PathEdgeDto[];

  @ApiHideProperty()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeleteEdgeDto)
  deleteEdges?: DeleteEdgeDto[];
}
