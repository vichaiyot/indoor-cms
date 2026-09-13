import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Map, MapSchema } from '../../entities/indoor-map/map.schema';
import { Booth, BoothSchema } from '../../entities/indoor-map/booth.schema';
import { IndoorMapService } from './indoor-map.service';
import { IndoorMapController } from './indoor-map.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Map.name, schema: MapSchema },
      { name: Booth.name, schema: BoothSchema },
    ]),
  ],
  controllers: [IndoorMapController],
  providers: [IndoorMapService],
  exports: [IndoorMapService],
})
export class IndoorMapModule { }
