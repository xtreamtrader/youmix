import { Entity, Column, OneToMany } from 'typeorm';
import { EMajor } from 'src/profile/profile.interfaces';
import { IProjectDescription, EProjectStatus } from './project.interfaces';
import { BaseModel } from 'src/common/helpers/entity.helper';
import { ProjectMember } from '../project-member/project-member.entity';

@Entity()
export class Project extends BaseModel(true) {
  @Column()
  name: string;

  @Column('text', { array: true, nullable: true })
  major?: EMajor[];

  @Column({ type: 'simple-array', nullable: true })
  expertises?: string[];

  @Column({ type: 'jsonb', nullable: true })
  description?: IProjectDescription;

  @Column()
  closeAt?: Date;

  @Column()
  status: EProjectStatus;

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
