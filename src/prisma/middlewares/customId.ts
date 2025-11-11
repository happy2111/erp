// // prisma/middlewares/customId.ts
// import { Prisma } from ".prisma/client-tenant";
//
//
// export function productIdMiddleware() {
//   return async (params: Prisma.MiddlewareParams, next: Prisma.MiddlewareNext) => {
//     if (params.model === "Product" && params.action === "create") {
//       // Получаем последний продукт
//       const last = await params.args.context?.prisma?.product.findFirst({
//         orderBy: { createdAt: "desc" },
//         select: { id: true },
//       });
//
//       let newIdNumber = 1;
//
//       if (last?.id) {
//         const numPart = parseInt(last.id.replace(/\D+/g, ""), 10);
//         if (!isNaN(numPart)) newIdNumber = numPart + 1;
//       }
//
//       const newId = `PR${String(newIdNumber).padStart(3, "0")}`;
//       params.args.data.id = newId;
//     }
//
//     return next(params);
//   };
// }
//
//
//
//
// // const client = this.prismaTenant.getTenantPrismaClient(tenant);
// // client.$use(productIdMiddleware());