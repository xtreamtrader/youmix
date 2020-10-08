import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { EAccountStatus } from 'src/common/interfaces/account-status.interface';
import { Exclude } from 'class-transformer';
import { File } from 'src/file/file.entity';
import * as bcrypt from 'bcrypt';
import { Profile } from 'src/profile/profile.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index({ unique: true })
  username: string;

  @Column()
  @Exclude({ toPlainOnly: true })
  password: string;

  @Column()
  @Index({ unique: true })
  email: string;

  @Column()
  role: EAccountRole;

  @Column()
  status: EAccountStatus;

  @Column({ nullable: true })
  @Exclude({ toPlainOnly: true })
  verificationToken?: string;

  @OneToMany(
    type => File,
    file => file.user,
  )
  file?: File[];

  /** AUTO GENERATED FIELDS */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @OneToOne(
    type => Profile,
    profile => profile.user,
    { eager: true, cascade: true, onDelete: 'CASCADE' },
  ) // specify inverse side as a second parameter
  // @JoinColumn()
  profile: Profile;
}
