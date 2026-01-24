import { Prisma } from '.prisma/client-tenant';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const transferInclude = {
  from_kassa: {
    select: {
      id: true,
      name: true,
      currency: { select: { code: true } },
    },
  },
  to_kassa: {
    select: {
      id: true,
      name: true,
      currency: { select: { code: true } },
    },
  },
  from_currency: { select: { code: true } },
  to_currency: { select: { code: true } },
} satisfies Prisma.KassaTransferInclude;

// 2. Генерируем тип одной транзакции на основе этого include
export type KassaTransferWithRelations = Prisma.KassaTransferGetPayload<{
  include: typeof transferInclude;
}>;
