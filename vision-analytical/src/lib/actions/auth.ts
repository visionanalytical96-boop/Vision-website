'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { createSession, deleteSession } from '@/lib/session';
import { roleHomePath } from '@/lib/roles';
import { safeRedirectPath } from '@/lib/safe-redirect';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { Role } from '@/generated/prisma/client';

export interface AuthFormState {
  errors?: Record<string, string[] | undefined>;
  formError?: string;
}

const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const RATE_LIMIT_ERROR = 'Too many attempts. Please wait a few minutes and try again.';
const LOGIN_WINDOW_MS = 10 * 60 * 1000;

export async function login(_prevState: AuthFormState | undefined, formData: FormData): Promise<AuthFormState> {
  const validated = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const ip = await getClientIp();
  // Per-account limit blocks brute-forcing one target regardless of how many
  // IPs the attacker rotates through; per-IP limit blocks spraying many
  // different accounts from one source.
  const withinAccountLimit = checkRateLimit(`login:account:${email}`, 10, LOGIN_WINDOW_MS);
  const withinIpLimit = checkRateLimit(`login:ip:${ip}`, 30, LOGIN_WINDOW_MS);
  if (!withinAccountLimit || !withinIpLimit) {
    return { formError: RATE_LIMIT_ERROR };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    return { formError: GENERIC_LOGIN_ERROR };
  }

  await createSession({ userId: user.id, role: user.role });
  redirect(safeRedirectPath(formData.get('next')) ?? roleHomePath(user.role));
}

export async function registerCustomer(
  _prevState: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const validated = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    phone: String(formData.get('phone') ?? ''),
    companyName: String(formData.get('companyName') ?? ''),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const ip = await getClientIp();
  if (!checkRateLimit(`register:ip:${ip}`, 10, LOGIN_WINDOW_MS)) {
    return { formError: RATE_LIMIT_ERROR };
  }

  const { name, email, phone, companyName, password } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ['An account with this email already exists.'] } };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      companyName: companyName || null,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  await createSession({ userId: user.id, role: user.role });
  redirect(roleHomePath(user.role));
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect('/login');
}
