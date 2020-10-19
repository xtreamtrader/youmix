import { Module } from '@nestjs/common';
import { ProjectMemberService } from './project-member.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectMember } from 'src/project-member/project-member.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProjectMember])],
  providers: [ProjectMemberService],
  exports: [ProjectMemberService],
})
export class ProjectMemberModule {}
