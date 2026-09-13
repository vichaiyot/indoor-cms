import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MapEntity } from './map.entity';

export enum BoothStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  OCCUPIED = 'OCCUPIED',
}

@Entity('booths')
export class BoothEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  boothNumber: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string;

  @Column({
    type: 'enum',
    enum: BoothStatus,
    default: BoothStatus.AVAILABLE,
  })
  status: BoothStatus;

  // 2D coordinate for canvas/pixel rendering
  @Column({ type: 'float', default: 0 })
  x: number;

  @Column({ type: 'float', default: 0 })
  y: number;

  // PostGIS Spatial Point (SRID 4326)
  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location?: any;

  @Column({ type: 'uuid' })
  mapId: string;

  @ManyToOne(() => MapEntity, (map) => map.booths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mapId' })
  map: MapEntity;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
