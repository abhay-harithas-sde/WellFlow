import { NextRequest, NextResponse } from 'next/server';
import { analyticsEngine } from '../../../../raw/_services';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const streak = await analyticsEngine.computeStreak(userId);
  return NextResponse.json(streak);
}
