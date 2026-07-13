'use server';

import { headers } from 'next/headers';
import { getClientIp } from '@/lib/request-ip';
import { login } from '@/modules/auth/service';
import { loginSchema } from '@/modules/auth/schemas';

export type LoginActionState = { status: 'idle' } | { status: 'error'; message: string } | { status: 'success' };

export async function loginAction(input: unknown): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'Revisa los datos ingresados.' };
  }

  const ip = await getClientIp();
  const headerList = await headers();
  const userAgent = headerList.get('user-agent');

  const result = await login(parsed.data, { ip, userAgent });
  if (!result.ok) return { status: 'error', message: result.message };
  return { status: 'success' };
}
