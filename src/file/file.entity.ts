import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { User } from 'src/user/user.entity';
import { awsConfig } from 'src/config/aws.config';
import { Transform } from 'class-transformer';

@Entity()
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  originalName: string;

  @Column()
  @Transform(
    path =>
      `https://${awsConfig.bucketName}.s3-${awsConfig.region}.amazonaws.com/${path}`,
  )
  path: string;

  @ManyToOne(
    type => User,
    user => user.file,
  )
  user: User;

  @Column()
  userId: string;

  /** AUTO GENERATED FIELDS */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
