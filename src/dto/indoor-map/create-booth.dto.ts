import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BoothStatus } from '../../entities/indoor-map/booth.schema';

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
    example: 350.5,
    description: 'X position coordinate on the floor plan canvas',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  x?: number;

  @ApiPropertyOptional({
    example: 420.0,
    description: 'Y position coordinate on the floor plan canvas',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  y?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Z position coordinate / height / floor elevation (optional: automatically determined by the floor of the map if omitted)',
  })
  @IsNumber()
  @IsOptional()
  z?: number;

  @ApiPropertyOptional({
    example: 100.5489,
    description: 'GPS Longitude for spatial coordinates (optional)',
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 13.9113,
    description: 'GPS Latitude for spatial coordinates (optional)',
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({
    example: 10.0,
    description:
      'GPS Altitude / Elevation (Z) for 3D spatial coordinates (optional: defaults to z or floor level)',
  })
  @IsNumber()
  @IsOptional()
  altitude?: number;
}
