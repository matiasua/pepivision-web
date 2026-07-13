import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    logger.error('Health check failed: database unreachable', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
