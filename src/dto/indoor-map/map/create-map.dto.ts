import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMapDto {
  @ApiProperty({
    example: 'string',
    description: 'Name of the map or hall',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'string',
    description: 'Building or venue name',
  })
  @IsString()
  @IsOptional()
  building?: string;

  @ApiPropertyOptional({
    example: 'string',
    description: 'Floor level / identifier',
  })
  @IsString()
  @IsOptional()
  floor?: string;

  @ApiPropertyOptional({
    example: 'URL',
    description: 'Image URL of floor plan background',
  })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({
    example: 1920,
    description: 'Width of the floor plan (pixels or meters)',
    default: 1000,
  })
  @IsNumber()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({
    example: 1080,
    description: 'Height of the floor plan (pixels or meters)',
    default: 1000,
  })
  @IsNumber()
  @IsOptional()
  height?: number;
}
