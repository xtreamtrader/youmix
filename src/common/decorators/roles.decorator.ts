import { EAccountRole } from '../interfaces/account-role.interface';
import { SetMetadata } from '@nestjs/common';

export const Roles = (...roles: EAccountRole[]) => SetMetadata('roles', roles);
