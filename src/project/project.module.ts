import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectMember } from '../project-member/project-member.entity';
import { ProjectMemberModule } from 'src/project-member/project-member.module';
import { ProjectMemberService } from 'src/project-member/project-member.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, ProjectMember]),
    ProjectMemberModule,
  ],
  providers: [ProjectService, ProjectMemberService],
  controllers: [ProjectController],
})
export class ProjectModule {}
