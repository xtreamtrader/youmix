import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { ProjectMemberModule } from 'src/project-member/project-member.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project]),
    ProjectMemberModule,
  ],
  providers: [ProjectService],
  controllers: [ProjectController],
})
export class ProjectModule {}
