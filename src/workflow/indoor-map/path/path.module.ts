import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PathGraph, PathGraphSchema } from '../../../schema/indoor-map/path/path-graph.schema';
import { MapModule } from '../map/map.module';
import { PathService } from './path.service';
import { PathController } from './path.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PathGraph.name, schema: PathGraphSchema }]),
    MapModule,
  ],
  controllers: [PathController],
  providers: [PathService],
  exports: [PathService],
})
export class PathModule { }
