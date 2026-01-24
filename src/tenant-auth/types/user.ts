import { Prisma, OrganizationUser } from '.prisma/client-tenant';

// Определяем тип, соответствующий вашему include
export type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    org_links: true;
    profile: true;
    phone_numbers: true;
  };
}>;

export type UserForSerialization = Prisma.UserGetPayload<{
  include: {
    profile: true;
    phone_numbers: true;
  };
}>;

export type OrganizationUserWithRelations = OrganizationUser;

export type UserWithAuthRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    phone_numbers: true;
    org_links: true; // Это нужно для orgUsers.length и выбора
  };
}>;

export type OrganizationUserWithRelationsUser =
  Prisma.OrganizationUserGetPayload<{
    include: {
      user: {
        include: {
          profile: true;
          phone_numbers: true;
        };
      };
    };
  }>;
