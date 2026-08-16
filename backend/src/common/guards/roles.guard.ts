import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<(OrgRole | `${OrgRole}`)[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.memberships) {
      throw new ForbiddenException('Access denied: user context missing or no active memberships');
    }

    // Determine target organization context if provided via header, param, or body
    const targetOrgId: string | undefined =
      request.headers['x-org-id'] ||
      request.params?.orgId ||
      request.body?.orgId ||
      request.orgId;

    if (targetOrgId) {
      // Check role specifically for this organization
      const membership = user.memberships.find(
        (m: { orgId: string; role: OrgRole }) => m.orgId === targetOrgId,
      );

      if (!membership) {
        throw new ForbiddenException('Access denied: not a member of the requested organization');
      }

      const hasRole = requiredRoles.includes(membership.role);
      if (!hasRole) {
        throw new ForbiddenException(`Access denied: requires role [${requiredRoles.join(', ')}] in organization`);
      }

      return true;
    }

    // If no specific org context requested, check if user has the role across any membership
    const hasAnyRole = user.memberships.some(
      (m: { role: OrgRole }) => requiredRoles.includes(m.role),
    );

    if (!hasAnyRole) {
      throw new ForbiddenException(`Access denied: requires role [${requiredRoles.join(', ')}]`);
    }

    return true;
  }
}
