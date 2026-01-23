import { OrgUserRole } from '.prisma/client-tenant';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  // Опциональные поля
  orgId?: string;
  orgUserId?: string;
  role?: OrgUserRole;
  purpose?: 'ORG_SELECTION';
}

export interface JwtUser extends Omit<JwtPayload, 'sub'> {
  userId: string;
}
