import {
  Controller,
  Get,
  Query,
  Param,
  ParseUUIDPipe,
  Post,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { WithMeta } from 'src/common/interfaces/api-features';
import { Project } from './project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { User } from 'src/user/user.entity';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectMemberService } from 'src/project-member/project-member.service';
import { ProjectMember } from 'src/project-member/project-member.entity';
import { ProjectQueryParamsDto } from './dto/project-query-params.dto';
import { SearchProjectMemberQueryParamsDto } from 'src/project-member/search-project-member-query-params.dto';
import { query } from 'express';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly projectMemberService: ProjectMemberService,
  ) {}

  // =========================================================================
  // Endpoint: /projects/:id/members
  // TODO Enable merge-params

  @Get('/:projectId/members')
  async getAllMembersOfProject(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query()
    searchProjectMemberQueryParamsDto: SearchProjectMemberQueryParamsDto,
  ): Promise<WithMeta<ProjectMember[]>> {
    return await this.projectMemberService.findMembers(user, projectId, searchProjectMemberQueryParamsDto);
  }

  @Get('/:projectId/members/:username')
  async getMemberOfProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('username') username: string,
  ): Promise<ProjectMember> {
    return await this.projectMemberService.findActiveMemberByProjectIdAndUsername(
      projectId,
      username,
    );
  }

  @Post('/:projectId/members/:username/invite')
  async inviteMember(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('username') username: string,
  ): Promise<ProjectMember> {
    return await this.projectMemberService.inviteMember(
      user,
      projectId,
      username,
    );
  }

  @Post('/:projectId/members/join')
  async requestToJoin(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectMember> {
    return await this.projectMemberService.requestToJoin(user, projectId);
  }

  @Post(`/:projectId/members/:username/transfer`)
  async transferOwnership(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('username') username: string,
  ): Promise<ProjectMember[]> {
    return this.projectMemberService.transferOwnership(
      user,
      projectId,
      username,
    );
  }

  @Post('/:projectId/members/accept')
  async invitedAcceptToJoin(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectMember> {
    return await this.projectMemberService.invitedAcceptToJoin(user, projectId);
  }

  @Post('/:projectId/members/:username/approve')
  async approveMemberJoiningRequest(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('username') username: string,
  ): Promise<ProjectMember> {
    return await this.projectMemberService.allowMemberToJoin(
      user,
      projectId,
      username,
    );
  }

  @Delete('/:projectId/members')
  async leaveProject(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.projectMemberService.leaveProject(user, id);
  }

  @Delete('/:projectId/members/:username')
  async kickMember(
    @GetUser() user: User,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('username') username: string,
  ): Promise<void> {
    await this.projectMemberService.kickOut(user, projectId, username);
  }

  // =========================================================================
  // Endpoint: /projects/

  @Get()
  async getAllProjects(
    @GetUser() user: User,
    @Query() query: ProjectQueryParamsDto,
  ): Promise<WithMeta<Project[]>> {
    console.log(query);
    return await this.projectService.getProjects(
      query,
      this.projectMemberService.selectOwnerAndMe(user),
    );
  }

  @Post()
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @GetUser() user: User,
  ): Promise<Project> {
    return await this.projectService.createProject(user, createProjectDto);
  }

  @Get('/:id')
  async getProject(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Project> {
    return await this.projectService.getProject(
      id,
      this.projectMemberService.selectOwnerAndMe(user),
    );
  }
  @Patch('/:id')
  async updateProject(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ): Promise<Project> {
    return await this.projectService.updateOneByConditions(
      updateProjectDto,
      { id },
      null,
      {
        validatorParams: [user],
      },
    );
  }

  @Delete('/:id')
  async delete(
    @GetUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.projectService.deleteOneByConditions({ id }, null, {
      validatorParams: [user],
    });
  }
}
