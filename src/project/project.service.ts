import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { Repository } from 'typeorm';
import { ProjectMember } from '../project-member/project-member.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { assignPartialObjectToEntity } from 'src/common/helpers/entity.helper';
import { EProjectStatus, EProjectMemberRole, IProjectValidatorContext } from './project.interfaces';
import { User } from 'src/user/user.entity';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { WithMeta, TApiFeaturesDto } from 'src/common/interfaces/api-features';
import ApiCrud, { TExtendFromQueries } from 'src/common/helpers/api-crud';

@Injectable()
export class ProjectService extends ApiCrud<Project, IProjectValidatorContext> {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {
    super(projectRepository, {
      alias: 'project',
      relations: {
        prop: 'members',
        alias: 'members',
        nestedRelation: [
          {
            prop: 'profile',
            alias: 'profile',
          },
        ],
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
   * Return project with by with allowed members
   * @param user
   * @param projectId
   */
  getProject(
    projectId: string,
    acl: TExtendFromQueries<any>,
  ): Promise<Project> {
    return this.findOneByParamsWithDefaultRelations({ id: projectId }, acl, [
      'profile',
    ]);
  }

  async getProjects(
    query: TApiFeaturesDto<Project>,
    acl: TExtendFromQueries<any>,
  ): Promise<WithMeta<Project[]>> {
    return this.getManyByRelationsWithMeta(query, acl, {
      exclude: ['profile'],
      usePaginationOnParent: true,
      useGetManyAndCount: true,
    });
  }

  /**
   * Soft delete specific project by given id
   * @param user
   * @param id
   */
  async deleteOne(user: User, id: string): Promise<void> {
    const project = await this.findOneById(id);

    if (!this.validateRole({
      entity: project,
      user,
    })) throw new ForbiddenException();

    await this.projectRepository.softDelete(project);
  }

  protected triggerOnPreValidation: undefined;

  validateRole(
    ctx: IProjectValidatorContext
  ): boolean {
    const { user, role = EProjectMemberRole.OWNER, entity:project} = ctx;
    const isOwner = (username: string) => (e: ProjectMember) =>
      e.username === username && e.role === EProjectMemberRole.OWNER;

    const isMember = (username: string) => (e: ProjectMember) =>
      e.username === username;

    return (
      (user.role === EAccountRole.ADMIN || role === EProjectMemberRole.OWNER
        ? project.members.some(isOwner(user.username))
        : project.members.some(isMember(user.username))) &&
      delete project.members
    );
  }
}
