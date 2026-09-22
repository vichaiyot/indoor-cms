import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Booth,
  BoothSchema,
} from '../../../schema/indoor-map/booth/booth.schema';
import { MapModule } from '../map/map.module';
import { BoothService } from './booth.service';
import { BoothController } from './booth.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Booth.name, schema: BoothSchema }]),
    MapModule,
  ],
  controllers: [BoothController],
  providers: [BoothService],
  exports: [BoothService],
})
export class BoothModule {}
