import { NextRequest, NextResponse } from 'next/server';
import { integrationManager } from '../../../raw/_services';

export async function POST(req: NextRequest) {
  const { userId, platformId, accessToken, refreshToken, expiresAt } = await req.json();
  await integrationManager.authorize(platformId, userId, {
    platformId,
    userId,
    accessToken,
    refreshToken: refreshToken ?? null,
    expiresAt: new Date(expiresAt),
  });
  return NextResponse.json({ saved: true });
}
