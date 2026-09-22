import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PathNode,
  PathNodeSchema,
} from '../../../schema/indoor-map/path/path-graph.schema';
import { MapModule } from '../map/map.module';
import { PathService } from './path.service';
import { PathController } from './path.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PathNode.name, schema: PathNodeSchema },
    ]),
    MapModule,
  ],
  controllers: [PathController],
  providers: [PathService],
  exports: [PathService],
})
export class PathModule {}
