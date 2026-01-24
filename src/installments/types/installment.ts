import { Prisma } from '.prisma/client-tenant';

export type InstallmentWithCustomer = Prisma.InstallmentGetPayload<{
  include: {
    customer: {
      select: { firstName: true; lastName: true; phone: true };
    };
  };
}>;
