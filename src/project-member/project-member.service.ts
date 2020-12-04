import {
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectMember } from './project-member.entity';
import { Repository, In } from 'typeorm';
import { EProjectMemberRole } from '../project/project.interfaces';
import ApiCrud, {
  TExtendFromQueries,
} from 'src/common/helpers/api-crud';
import { User } from 'src/user/user.entity';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { WithMeta, TApiFeaturesDto } from 'src/common/interfaces/api-features';
import {
  IProjectMemberValidatorContext,
  IProjectMemberTriggerOnPreValidationContext,
} from './project-member.interfaces';
@Injectable()
export class ProjectMemberService extends ApiCrud<
  ProjectMember,
  IProjectMemberValidatorContext,
  IProjectMemberTriggerOnPreValidationContext
> {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {
    super(projectMemberRepository, {
      alias: 'members',
      searchOnRelation: 'profile',
      relations: {
        prop: 'profile',
        alias: 'profile',
      },
    });
  }

  /**
   * @override A function to get entity and send to validation pipeline
   * @param projectId
   * @param username
   */
  triggerOnPreValidation(
    context: IProjectMemberTriggerOnPreValidationContext,
  ): Promise<ProjectMember> {
    const { username, projectId } = context;
    return username
      ? this.findOneByProjectIdAndUsername(projectId, username)
      : this.findOwnerByProjectId(projectId);
  }

  /**
   * @override A function to validate for role access
   * @param owner
   * @param user
   * @param roles
   */
  validateRole(ctx: IProjectMemberValidatorContext): boolean {
    const { user, entity: projectMember, roles } = ctx;
    if (user.role === EAccountRole.ADMIN) return true;

    if (Array.isArray(roles) && roles.includes(projectMember.role)) return true;

    // If no roles provided, check for OWNER by default
    if (
      typeof roles === undefined &&
      projectMember.role === EProjectMemberRole.OWNER &&
      projectMember.username === user.username
    )
      return true;
    return false;
  }

  accessMembersListByUserRoleOption(
    user: User,
    projectId: string,
  ): TExtendFromQueries<any> {
    return query => {
      query
        .orWhere(qb => {
          const subQuery = qb
            .subQuery()
            .select('COUNT(*)')
            .from('project_member', 'members')
            .where(`members.projectId = :projectId`)
            .andWhere(`members.username = :username`)
            .andWhere(`members.role IN (:...roles) `)
            .getQuery();

          return `(${subQuery} > 0 AND  members.projectId = '${projectId}'`;
        })
        .orWhere(
          'members.projectId = :projectId AND members.role IN (:...roles)',
        )
        .orWhere(
          `members.projectId = :projectId AND members.username = :username)`,
        )
        .addOrderBy(
          `CASE
            WHEN members.role = 'OWNER' THEN 0
            WHEN members.username = '${user.username}' then 1
            WHEN members.role = 'GUESTMEMBER' THEN 2
            WHEN members.role = 'OWNER' THEN 3
            WHEN members.role = 'INVITED' THEN 4
            ELSE 5
          END
          `,
          'ASC',
        )
        .setParameters({
          projectId: projectId,
          username: user.username,
          roles: [EProjectMemberRole.MEMBER, EProjectMemberRole.OWNER],
        });
    };
  }

  /**
   * Return an option to list the members whose either role is OWNER or username is equal to given user
   * @param user
   */
  selectOwnerAndMe(user: User): TExtendFromQueries<any> {
    return qb => {
      qb.innerJoinAndSelect('members.profile', 'profile')
        .andWhere(`(members.username = :username OR members.role = :role)`)
        .setParameters({
          username: user.username,
          role: EProjectMemberRole.OWNER,
        });
    };
  }

  async findMembers(
    user: User,
    projectId: string,
    query: TApiFeaturesDto<ProjectMember>,
  ): Promise<WithMeta<ProjectMember[]>> {
    return this.getManyByRelationsWithMeta(
      { ...query, projectId },
      this.accessMembersListByUserRoleOption(user, projectId),
      {
        usePaginationOnParent: true,
        useGetManyAndCount: true,
        useNativeSkipAndOffset: true,
      },
    );
  }
  /**
   * Return the owner of single project
   * @param projectId
   */
  async findOwnerByProjectId(projectId: string): Promise<ProjectMember> {
    return this.findOneByConditions({
      projectId,
      role: EProjectMemberRole.OWNER,
    });
  }

  /**
   * Return the only row matched to the projectId and username
   * @param projectId
   * @param username
   */
  async findOneByProjectIdAndUsername(
    projectId: string,
    username: string,
  ): Promise<ProjectMember> {
    return this.findOneByConditions({
      projectId,
      username,
    });
  }

  /**
   * Return an only active member (rolw: OWNER | MEMBER) of single project
   * @param projectId
   * @param username
   */
  async findActiveMemberByProjectIdAndUsername(
    projectId: string,
    username: string,
  ): Promise<ProjectMember> {
    return this.findOneByConditions({
      projectId,
      username,
      role: In([EProjectMemberRole.OWNER, EProjectMemberRole.MEMBER]),
    });
  }

  /**
   * Return a list of members participated in project
   * @param projectId
   */
  async findAllMembersByProjectId(projectId: string): Promise<ProjectMember[]> {
    return this.findByConditions({ projectId });
  }

  /**
   * Return a list of active members (role: OWNER | MEMBER) participated in project
   * @param projectId
   */
  async findAllActiveMembersByProjectId(
    projectId: string,
  ): Promise<ProjectMember[]> {
    return this.findByConditions({
      projectId,
      role: In([EProjectMemberRole.OWNER, EProjectMemberRole.MEMBER]),
    });
  }

  /**
   * Invite user to join in this project
   *
   * Only active members of the project can send the invitation
   * @param user
   * @param projectId
   * @param username
   */
  inviteMember(
    user: User,
    projectId: string,
    username: string,
  ): Promise<ProjectMember> {
    const member = new ProjectMember();

    member.projectId = projectId;
    member.username = username;
    member.role = EProjectMemberRole.INVITED;

    return this.create(member, {
      hasRoleValidator: true,
      triggerContext: {
        projectId,
        username: user.username,
      },
      findOneBeforeCreate: { projectId, username },
      validatorContext: {
        user,
        roles: [EProjectMemberRole.OWNER, EProjectMemberRole.MEMBER],
      },
    });
  }

  /**
   * A normal user ask to join a project
   * @param user
   * @param projectId
   */
  async requestToJoin(user: User, projectId: string): Promise<ProjectMember> {
    const member = new ProjectMember();
    member.username = user.username;
    member.projectId = projectId;
    member.role = EProjectMemberRole.GUESTMEMBER;

    return this.create(member, {
      findOneBeforeCreate: {
        username: user.username,
        projectId,
      },
    });
  }

  async leaveProject(user: User, projectId: string): Promise<void> {
    await this.deleteOneByConditions(
      {
        projectId,
        username: user.username,
      },
      null,
      {
        // triggerParams: [projectId, user.username],
        validatorContext: {
          user,
          roles: [
            EProjectMemberRole.GUESTMEMBER,
            EProjectMemberRole.INVITED,
            EProjectMemberRole.MEMBER,
          ],
        },
      },
      {
        softDelete: false,
      },
    );
  }

  async kickOut(
    user: User,
    projectId: string,
    username: string,
  ): Promise<void> {
    await this.deleteOneByConditions(
      {
        projectId,
        username: username,
      },
      null,
      {
        triggerContext: {
          projectId,
          username: user.username,
        },
        validatorContext: { user, roles: [EProjectMemberRole.OWNER] },
        postValidator: () => {
          if (user.username === username)
            throw new ForbiddenException(
              'You can not kick yourself out of this project because you are now an owner. Try to transfer ownership to another and use leave project function instead',
            );
        },
      },
    );
  }

  invitedAcceptToJoin(user: User, projectId: string): Promise<ProjectMember> {
    return this.updateOneByConditions(
      { role: EProjectMemberRole.MEMBER },
      {
        projectId,
        username: user.username,
        role: EProjectMemberRole.INVITED,
      },
      null,
      {
        hasRoleValidator: false,
      },
    );
  }

  allowMemberToJoin(
    user: User,
    projectId: string,
    username: string,
  ): Promise<ProjectMember> {
    return this.updateOneByConditions(
      {
        role: EProjectMemberRole.MEMBER,
      },
      {
        projectId,
        username,
        role: EProjectMemberRole.GUESTMEMBER,
      },
      null,
      {
        triggerContext: { projectId, username: user.username },
        validatorContext: { user, roles: [EProjectMemberRole.OWNER] },
      },
    );
  }

  async transferOwnership(
    user: User,
    projectId: string,
    targetUsername: string,
  ): Promise<ProjectMember[]> {
    const userAsMember = await this.findActiveMemberByProjectIdAndUsername(
      projectId,
      user.username,
    );

    if (userAsMember.role !== EProjectMemberRole.OWNER) {
      throw new ForbiddenException();
    }

    // Check if targetUsername has already joined in current project
    const targetMember = await this.findActiveMemberByProjectIdAndUsername(
      projectId,
      targetUsername,
    );

    userAsMember.role = EProjectMemberRole.MEMBER;
    targetMember.role = EProjectMemberRole.OWNER;

    return this.projectMemberRepository.save([userAsMember, targetMember]);
  }
}
