import { Prisma } from '.prisma/client-tenant';

export type SaleWithItems = Prisma.SaleGetPayload<{
  include: { items: true };
}>;
