import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MapEntity } from '../../entities/indoor-map/map.entity';
import { BoothEntity } from '../../entities/indoor-map/booth.entity';
import { IndoorMapService } from './indoor-map.service';
import { IndoorMapController } from './indoor-map.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MapEntity, BoothEntity])],
  controllers: [IndoorMapController],
  providers: [IndoorMapService],
  exports: [IndoorMapService],
})
export class IndoorMapModule { }
