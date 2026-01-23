import { OrgUserRole } from '.prisma/client-tenant'; // Или путь к вашему enum

export interface JwtPayload {
  sub: string; // ID пользователя (user.id)
  tenantId: string; // ID тенанта (tenants.id)
  organizationId: string; // ID организации внутри тенанта (organizations.id)
  role: OrgUserRole;
}
