import { Role } from '@/generated/prisma/client';

/** Where a user lands after login, and the section proxy.ts confines them to. */
export function roleHomePath(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return '/admin';
    case Role.ENGINEER:
      return '/engineer';
    case Role.CUSTOMER:
      return '/portal';
  }
}
