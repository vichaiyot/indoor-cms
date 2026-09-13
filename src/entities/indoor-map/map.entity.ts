import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BoothEntity } from './booth.entity';

@Entity('maps')
export class MapEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  building?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  floor?: string;

  @Column({ type: 'text', nullable: true })
  imageUrl?: string;

  @Column({ type: 'float', nullable: true, default: 1000 })
  width: number;

  @Column({ type: 'float', nullable: true, default: 1000 })
  height: number;

  @OneToMany(() => BoothEntity, (booth) => booth.map, { cascade: true })
  booths: BoothEntity[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
