import { Module } from '@nestjs/common';
import { MapModule } from './map/map.module';
import { BoothModule } from './booth/booth.module';
import { PathModule } from './path/path.module';

@Module({
  imports: [MapModule, BoothModule, PathModule],
  exports: [MapModule, BoothModule, PathModule],
})
export class IndoorMapModule {}
