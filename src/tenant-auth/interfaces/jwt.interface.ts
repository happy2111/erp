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

export type JwtOrgSelectionUser = {
  userId: string;
  tenantId: string;
  purpose: 'ORG_SELECTION';
};

export type JwtAuthenticatedUser = {
  userId: string;
  tenantId: string;
  orgId: string;
  orgUserId: string;
  role: OrgUserRole;
};

export type JwtUser = JwtOrgSelectionUser | JwtAuthenticatedUser;
