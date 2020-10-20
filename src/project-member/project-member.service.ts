import {
  Injectable,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ProjectMember } from './project-member.entity';
import { Repository, In } from 'typeorm';
import { EProjectMemberRole } from '../project/project.interfaces';
import ApiCrud, { TExtendFromQueries } from 'src/common/helpers/api-crud';
import { User } from 'src/user/user.entity';
import { EAccountRole } from 'src/common/interfaces/account-role.interface';
import { WithMeta } from 'src/common/interfaces/api-features';

@Injectable()
export class ProjectMemberService extends ApiCrud<ProjectMember> {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly projectMemberRepository: Repository<ProjectMember>,
  ) {
    super(projectMemberRepository, {
      alias: 'members',
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
    projectId: string,
    username?: string,
  ): Promise<ProjectMember> {
    return username
      ? this.findOneByProjectIdAndUsername(projectId, username)
      : this.findOwnerByProjectId(projectId);
  }

  /**
   * @override A function to validate for role access
   * @param owner
   * @param user
   * @param forMember
   */
  validateRole(
    projectMember: ProjectMember,
    user: User,
    roles: EProjectMemberRole[],
  ): boolean {
    if (user.role === EAccountRole.ADMIN) return true;

    if (Array.isArray(roles) && roles.includes(projectMember.role)) return true;

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

          return `${subQuery} > 0 AND  members.projectId = '${projectId}'`;
        })
        .orWhere(
          'members.projectId = :projectId AND members.role IN (:...roles)',
        )
        .orWhere(
          `members.projectId = :projectId AND members.username = :username`,
        )
        .setParameters({
          projectId: projectId,
          username: user.username,
          roles: [EProjectMemberRole.MEMBER, EProjectMemberRole.OWNER],
        });
    };
  }

  async findMembers(
    user: User,
    projectId: string,
  ): Promise<WithMeta<ProjectMember[]>> {
    return this.getManyByRelationsWithMeta(
      { projectId },
      this.accessMembersListByUserRoleOption(user, projectId)
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
      triggerParams: [projectId],
      validatorParams: [user, true],
    });
  }

  /**
   * A normal user ask to join a project
   * @param user
   * @param projectId
   */
  async requestToJoin(user: User, projectId: string): Promise<ProjectMember> {
    try {
      const member = await this.findOneByProjectIdAndUsername(
        projectId,
        user.username,
      );

      if (member)
        throw new ConflictException(
          `The username ${user.username} has already joined in project ${projectId} as ${member.role}`,
        );
    } catch (error) {
      if (error instanceof NotFoundException) {
        console.log('goto here');
        return this.create({
          projectId,
          username: user.username,
          role: EProjectMemberRole.GUESTMEMBER,
        });
      }

      throw error;
    }
  }

  async leaveProject(user: User, projectId: string): Promise<void> {
    await this.deleteOneByConditions(
      {
        projectId,
        username: user.username,
      },
      null,
      {
        triggerParams: [projectId, user.username],
        validatorParams: [
          user,
          [
            EProjectMemberRole.GUESTMEMBER,
            EProjectMemberRole.INVITED,
            EProjectMemberRole.MEMBER,
          ],
        ],
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
        triggerParams: [user.username],
        validatorParams: [user, [EProjectMemberRole.OWNER]],
        postValidator: () => {
          if (user.username === username)
            throw new BadRequestException(
              "You can't not kick yourself out of this project because you are now an owner. Try to transfer ownership to another and use leave project function instead",
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
        triggerParams: [projectId],
        validatorParams: [user, [EProjectMemberRole.OWNER]],
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

    // Check is targetUsername has already joined in current project
    const targetMember = await this.findOneByProjectIdAndUsername(
      projectId,
      targetUsername,
    );

    userAsMember.role = EProjectMemberRole.MEMBER;
    targetMember.role = EProjectMemberRole.OWNER;

    return this.projectMemberRepository.save([userAsMember, targetMember]);
  }
}