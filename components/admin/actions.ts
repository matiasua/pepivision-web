'use server';

import { redirect } from 'next/navigation';
import { getClientIp } from '@/lib/request-ip';
import { logout } from '@/modules/auth/service';

export async function logoutAction() {
  const ip = await getClientIp();
  await logout({ ip });
  redirect('/admin');
}
