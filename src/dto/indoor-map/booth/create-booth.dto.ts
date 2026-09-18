import { ApiProperty, ApiPropertyOptional, ApiHideProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { BoothStatus } from '../../../schema/indoor-map/booth/booth.schema';

export class PointDto {
  @ApiProperty({
    example: 'Point',
    enum: ['Point'],
    default: 'Point',
    description: 'GeoJSON geometry type',
  })
  @IsString()
  type: string = 'Point';

  @ApiProperty({
    example: [120.0, 340.0],
    description: '2D coordinates array: [x, y] on floor plan canvas or [longitude, latitude] for GPS',
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @IsNumber({}, { each: true })
  coordinates: number[];
}

export class PolygonDto {
  @ApiProperty({
    example: 'Polygon',
    enum: ['Polygon'],
    default: 'Polygon',
    description: 'GeoJSON geometry type',
  })
  @IsString()
  type: string = 'Polygon';

  @ApiProperty({
    example: [
      [
        [120.0, 340.0],
        [470.5, 340.0],
        [470.5, 760.0],
        [120.0, 760.0],
        [120.0, 340.0],
      ],
    ],
    description: 'GeoJSON Polygon coordinates: array of linear ring coordinate arrays',
  })
  @IsArray()
  coordinates: number[][][];
}

export class SizeDto {
  @ApiPropertyOptional({
    example: 350.5,
    description: 'Width of the object (e.g. in cm or canvas units)',
  })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({
    example: 420.0,
    description: 'Depth / Length of the object (e.g. in cm or canvas units)',
  })
  @IsNumber()
  @IsOptional()
  depth?: number;

  @ApiPropertyOptional({
    example: 300.0,
    description: 'Height of the object (e.g. in cm or canvas units)',
  })
  @IsNumber()
  @IsOptional()
  height?: number;
}

export class CreateBoothDto {
  @ApiProperty({
    example: 'A01',
    description: 'Booth identification number/code',
  })
  @IsString()
  @IsNotEmpty()
  boothNumber: string;

  @ApiProperty({
    example: 'DeepMind AI Showcase',
    description: 'Booth or exhibitor name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Showcasing the latest in AI and robotics technology',
    description: 'Booth description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'Technology & AI',
    description: 'Category or industry sector',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    enum: BoothStatus,
    default: BoothStatus.AVAILABLE,
    description: 'Current status of the booth',
  })
  @IsEnum(BoothStatus)
  @IsOptional()
  status?: BoothStatus;

  @ApiPropertyOptional({
    example: 'room',
    default: 'room',
    description: 'Type of object (e.g. room, booth, facility, stage)',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({
    type: PointDto,
    description: '2D Position Point [x, y] on the floor plan canvas',
    example: {
      type: 'Point',
      coordinates: [120.0, 340.0],
    },
  })
  @IsOptional()
  position?: any;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Rotation angle in degrees (0 - 360)',
  })
  @IsNumber()
  @IsOptional()
  rotation?: number;

  @ApiPropertyOptional({
    type: SizeDto,
    description: 'Object 3D dimensions (width, depth, height)',
    example: {
      width: 350.5,
      depth: 420.0,
      height: 300.0,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SizeDto)
  size?: SizeDto;

  @ApiPropertyOptional({
    type: PolygonDto,
    description:
      '2D Footprint polygon coordinates on canvas: GeoJSON Polygon (บันทึกขอบเขตพื้นที่บูธ 2D)',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [120.0, 340.0],
          [470.5, 340.0],
          [470.5, 760.0],
          [120.0, 760.0],
          [120.0, 340.0],
        ],
      ],
    },
  })
  @IsOptional()
  footprint?: any;

  @ApiPropertyOptional({
    type: PointDto,
    description: 'Real-world GPS coordinates: GeoJSON Point [longitude, latitude]',
    example: {
      type: 'Point',
      coordinates: [100.5489, 13.9113],
    },
  })
  @IsOptional()
  geo?: any;

  // ============================================================
  // Flat / backward-compatibility fields (hidden from Swagger to keep docs clean)
  // ============================================================
  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  depth?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  height?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  y?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiHideProperty()
  @IsNumber()
  @IsOptional()
  latitude?: number;
}
