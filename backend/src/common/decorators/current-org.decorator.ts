import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../context/tenant.context';

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    // Return explicit request orgId or fall back to TenantContext
    return request.orgId || request.headers['x-org-id'] || TenantContext.getOrgId();
  },
);
