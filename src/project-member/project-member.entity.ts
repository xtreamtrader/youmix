import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { EProjectMemberRole } from '../project/project.interfaces';
import { BaseModel } from 'src/common/helpers/entity.helper';
import { Profile } from 'src/profile/profile.entity';
import { Project } from '../project/project.entity';

@Entity()
export class ProjectMember extends BaseModel() {
  @Column()
  role: EProjectMemberRole;

  @ManyToOne(
    () => Profile,
    profile => profile.username,
    // { eager: true },
  )
  @JoinColumn({ referencedColumnName: 'username', name: 'username' })
  profile: Profile;

  @ManyToOne(
    () => Project,
    project => project.members,
  )
  project: Project;

  @PrimaryColumn()
  projectId!: string;

  @PrimaryColumn()
  username: string;
}
