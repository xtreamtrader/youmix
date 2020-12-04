import { IBaseValidatorContext, IBaseTriggerOnPreValidationContext } from "src/common/helpers/api-crud";
import { ProjectMember } from "./project-member.entity";
import { User } from "src/user/user.entity";
import { EProjectMemberRole } from "src/project/project.interfaces";

export interface IProjectMemberValidatorContext extends IBaseValidatorContext<ProjectMember> {
  user: User;
  roles: EProjectMemberRole[];
}

export interface IProjectMemberTriggerOnPreValidationContext
  extends IBaseTriggerOnPreValidationContext {
  projectId: string;
  username?: string;
}