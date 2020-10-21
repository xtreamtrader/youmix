import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { Repository } from 'typeorm';
import { ProjectMember } from '../project-member/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { assignPartialObjectToEntity } from 'src/common/helpers/entity.helper';
import { EProjectStatus, EProjectMemberRole } from './project.interfaces';
import { User } from 'src/user/user.entity';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { WithMeta } from 'src/common/interfaces/api-features';
import ApiCrud, { TExtendFromQueries } from 'src/common/helpers/api-crud';

@Injectable()
export class ProjectService extends ApiCrud<Project> {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    super(projectRepository, {
      alias: 'project',
      relations: {
        prop: 'members',
        alias: 'members',
      },
    });
  }

  async createProject(
    user: User,
    createProjectDto: CreateProjectDto,
  ): Promise<Project> {
    const project = new Project();
    assignPartialObjectToEntity(project, createProjectDto);

    const projectMember = new ProjectMember();
    projectMember.username = user.username;
    projectMember.role = EProjectMemberRole.OWNER;

    project.members = [projectMember];
    project.status = EProjectStatus.OPENING;

    return this.create(project);
  }

  /**
   * Return project with a list of members based on specfic user:
   *
   * If user is a member of a project (Role: OWNER | MEMBER): Return all members (includes: GUESTMEMBER, INVITED)
   *
   * If user is either GUESTMEMBER OR INVITED : Return only OWNER and MEMBER and its user's member data.
   *
   * If user is non-of these type (have no activity involed in joining the project): Return only OWNER and MEMBER
   * @param user
   * @param projectId
   */
  getProject(
    projectId: string,
    acl: TExtendFromQueries<any>,
  ): Promise<Project> {
    return this.findOneByParamsWithDefaultRelations({ id: projectId }, acl);
  }

  async getProjects(user: User, query: any): Promise<WithMeta<Project[]>> {
    // return await this.getManyByRelationsWithMeta(query, [
    //   {
    //     andWhere: `(members.username = :username OR members.role = :role)`,
    //   },
    //   {
    //     setParameters: {
    //       username: user.username,
    //       role: EProjectMemberRole.OWNER,
    //     },
    //   },
    // ]);

    return await this.getManyByRelationsWithMeta(query, qb => {
      qb.innerJoinAndSelect('members.profile', 'profile')
        .where(`members.username = :username OR members.role = :role`)
        .setParameters({
          username: user.username,
          role: EProjectMemberRole.OWNER,
        });
    });
  }

  /**
   * Soft delete specific project by given id
   * @param user
   * @param id
   */
  async deleteOne(user: User, id: string): Promise<void> {
    const project = await this.findOneById(id);

    if (!this.validateRole(project, user)) throw new ForbiddenException();

    await this.projectRepository.softDelete(project);
  }

  protected triggerOnPreValidation: undefined;

  validateRole(
    project: Project,
    user: User,
    role: 'OWNER' | 'MEMBER' = 'OWNER',
  ): boolean {
    const isOwner = (username: string) => (e: ProjectMember) =>
      e.username === username && e.role === EProjectMemberRole.OWNER;

    const isMember = (username: string) => (e: ProjectMember) =>
      e.username === username;

    return (
      (user.role === EAccountRole.ADMIN || role === 'OWNER'
        ? project.members.some(isOwner(user.username))
        : project.members.some(isMember(user.username))) &&
      delete project.members
    );
  }
}
