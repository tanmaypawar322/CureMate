import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContext } from '../context/tenant.context';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const rawOrgId =
      (request.headers['x-org-id'] as string) ||
      request.params?.orgId ||
      request.body?.orgId;
    const user = request.user;
    const userId = user?.id;

    let validatedOrgId: string | undefined = undefined;

    if (rawOrgId) {
      if (user) {
        // Strict verification: Ensure authenticated user actually belongs to this organization
        const hasMembership = user.memberships?.some(
          (m: { orgId: string }) => m.orgId === rawOrgId,
        );

        if (!hasMembership) {
          throw new ForbiddenException(
            `Access denied: You are not a member of organization ${rawOrgId}`,
          );
        }

        validatedOrgId = rawOrgId;
        request.orgId = validatedOrgId;
      }
      // If user is not yet authenticated (e.g. public auth routes), we do not trust or set rawOrgId
    }

    return new Observable((subscriber) => {
      TenantContext.run({ orgId: validatedOrgId, userId }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
