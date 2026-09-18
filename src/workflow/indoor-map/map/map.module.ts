import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Map, MapSchema } from '../../../schema/indoor-map/map/map.schema';
import { Booth, BoothSchema } from '../../../schema/indoor-map/booth/booth.schema';
import { PathGraph, PathGraphSchema } from '../../../schema/indoor-map/path/path-graph.schema';
import { MapService } from './map.service';
import { MapController } from './map.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Map.name, schema: MapSchema },
      { name: Booth.name, schema: BoothSchema },
      { name: PathGraph.name, schema: PathGraphSchema },
    ]),
  ],
  controllers: [MapController],
  providers: [MapService],
  exports: [MapService, MongooseModule],
})
export class MapModule { }
