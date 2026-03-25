import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ListingStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
}

@Entity('marketplace_listings')
export class MarketplaceListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'farmerId' })
  farmer: User;

  @Column()
  farmerId: string;

  @Column()
  cropId: string; // Foreign key conceptually mapped in service or relation

  @Column({ default: 'Все' })
  category: string;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('decimal')
  quantity: number;

  @Column()
  unit: string; // kg, tons

  @Column('decimal')
  price: number;

  @Column({ default: 'KZT' })
  currency: string;

  @Column('date')
  availableFrom: Date;

  @Column()
  location: string;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
