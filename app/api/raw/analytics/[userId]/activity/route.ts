import { NextRequest, NextResponse } from 'next/server';
import { analyticsEngine } from '../../../_services';

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const days = (req.nextUrl.searchParams.get('days') === '30' ? 30 : 7) as 7 | 30;
  const freq = await analyticsEngine.computeActivityFrequency(userId, days);
  return NextResponse.json(freq);
}
