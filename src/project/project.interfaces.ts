import { IBaseValidatorContext } from "src/common/helpers/api-crud";
import { Project } from "./project.entity";
import { User } from "src/user/user.entity";

export enum EProjectStatus {
  OPENING = 'OPENING',
  CLOSED = 'CLOSED',
  ENDED = 'ENDED',
}

export interface IProjectDescription {
  bio?: string;
  summary?: string;
  requirements?: string[];
}

export enum EProjectMemberRole {
  /**
   * The creator of one project or the one who has full access permission to all activities related to single project
   */
  OWNER = 'OWNER',

  /**
   * Normal user of one project
   */
  MEMBER = 'MEMBER',

  /**
   * A member who asked to join in the project.
   *
   * Need owner's acceptance to join in the project
   */
  GUESTMEMBER = 'GUESTMEMBER',

  /**
   * A user who has been invited to join the project
   *
   * Need user's acceptance to join in the project
   */
  INVITED = 'INVITED',
}

export interface IProjectValidatorContext
  extends IBaseValidatorContext<Project> {
  user: User;
  role?: EProjectMemberRole.OWNER | EProjectMemberRole.MEMBER;
}
