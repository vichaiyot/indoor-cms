import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndoorMapModule } from './workflow/indoor-map/indoor-map.module';
import { MapEntity } from './entities/indoor-map/map.entity';
import { BoothEntity } from './entities/indoor-map/booth.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('POSTGRES_HOST', 'localhost'),
        port: parseInt(configService.get<string>('POSTGRES_PORT', '5432'), 10),
        username: configService.get<string>('POSTGRES_USER', 'postgres'),
        password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
        database: configService.get<string>('POSTGRES_DB', 'indoor_cms'),
        entities: [MapEntity, BoothEntity],
        synchronize: true,
        logging: false,
      }),
    }),
    IndoorMapModule,
  ],
})
export class AppModule { }
