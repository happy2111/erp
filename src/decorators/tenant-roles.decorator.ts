import { SetMetadata } from '@nestjs/common';
import { OrgUserRole } from '.prisma/client-tenant';

export const ROLES_KEY = 'orgUserRoles';
export const Roles = (...roles: OrgUserRole[]) => SetMetadata(ROLES_KEY, roles);
