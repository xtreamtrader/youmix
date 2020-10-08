import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { EAccountRole } from '../interfaces/account-role.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const roles = this.reflector.get<EAccountRole[]>(
      'roles',
      context.getHandler(),
    );

    const user = context.switchToHttp().getRequest().user;

    return !roles || roles.includes(user.role);
  }
}
