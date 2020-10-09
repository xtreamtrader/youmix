import {
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import {
  EProfileJob,
  EMajor,
  IAchievement,
  EAccountGender,
} from './profile.interfaces';
import { User } from 'src/user/user.entity';
import { Transform, Exclude } from 'class-transformer';
import { pathToS3Url } from 'src/common/transforms/s3.transform';

@Entity()
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bio: string;

  @Column()
  @Transform(avatar => pathToS3Url(avatar))
  avatar: string;

  @Column()
  position: EProfileJob;

  @Column({ nullable: true })
  fullname: string;

  @Column({ type: 'simple-array', nullable: true })
  expertises?: string[];

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  studentId?: string;

  @Transform(major => EMajor[major])
  @Column({ nullable: true })
  major: EMajor;

  @Column({ nullable: true })
  yearBorn: number;

  @Column({ nullable: true })
  gender: EAccountGender;

  @Column({ nullable: true })
  address: string;

  @Column({ type: 'jsonb', nullable: true })
  achievements: IAchievement[];

  @OneToOne(type => User, { onDelete: 'CASCADE' })
  @JoinColumn({ referencedColumnName: 'username', name: 'username' })
  user: User;

  @Column()
  username: string;

  /** SEARCHING COLUMNS */
  @Column('tsvector', { select: false })
  searchWeights: any;

  /** AUTO GENERATED FIELDS */
  
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
