import { headers } from 'next/headers';

/** Reads the client IP from the headers Nginx sets (see nginx/dev.conf). */
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() ?? null;
  return headerList.get('x-real-ip');
}
