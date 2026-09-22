import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PointDto, PolygonDto } from '../booth/create-booth.dto';

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

  @ApiPropertyOptional({
    type: PointDto,
    description:
      'พิกัดภูมิศาสตร์โลกจริง (GPS WGS84 GeoJSON Point [longitude, latitude])',
    example: {
      type: 'Point',
      coordinates: [100.5489, 13.9113],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PointDto)
  geo?: PointDto;

  @ApiPropertyOptional({
    type: PolygonDto,
    description:
      'ขอบเขตอาณาเขตผังอาคารบนแผนที่โลกจริง (GeoJSON Polygon [[[longitude, latitude], ...]])',
    example: {
      type: 'Polygon',
      coordinates: [
        [
          [100.548, 13.911],
          [100.55, 13.911],
          [100.55, 13.9125],
          [100.548, 13.9125],
          [100.548, 13.911],
        ],
      ],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PolygonDto)
  boundary?: PolygonDto;

  @ApiPropertyOptional({
    example: 0,
    description: 'องศาการหมุนของแผนที่เทียบกับทิศเหนือ (0 - 360 องศา)',
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  rotation?: number;
}
