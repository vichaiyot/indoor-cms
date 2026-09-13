import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BoothStatus } from '../../entities/indoor-map/booth.entity';

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
    example: 100.5489,
    description: 'GPS Longitude for PostGIS spatial coordinates (optional)',
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({
    example: 13.9113,
    description: 'GPS Latitude for PostGIS spatial coordinates (optional)',
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;
}
