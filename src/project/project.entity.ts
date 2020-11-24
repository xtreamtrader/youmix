import { Entity, Column, OneToMany } from 'typeorm';
import { EMajor } from 'src/profile/profile.interfaces';
import { IProjectDescription, EProjectStatus } from './project.interfaces';
import { BaseModel } from 'src/common/helpers/entity.helper';
import { ProjectMember } from '../project-member/project-member.entity';
import { Transform } from 'class-transformer';

@Entity()
export class Project extends BaseModel(true) {
  @Column()
  name: string;

  @Column('text', { array: true, nullable: true })
  @Transform(major => major.map(e => EMajor[e]))
  major?: EMajor[];

  @Column({ type: 'simple-array', nullable: true })
  expertises?: string[];

  @Column({ type: 'jsonb', nullable: true })
  description?: IProjectDescription;

  @Column()
  closeAt?: Date;

  @Column()
  status: EProjectStatus;

  /** SEARCHING COLUMNS */
  @Column('tsvector', { select: false })
  searchWeights: any;

  @OneToMany(
    () => ProjectMember,
    member => member.project,
    {
      cascade: ['insert'],
      onDelete: 'CASCADE',
      eager: true,
      nullable: true,
    },
  )
  members!: ProjectMember[];
}
