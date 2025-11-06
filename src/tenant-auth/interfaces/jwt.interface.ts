import { OrgUserRole } from '.prisma/client-tenant'; // Или путь к вашему enum

export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: OrgUserRole;
}