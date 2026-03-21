import { NextRequest, NextResponse } from 'next/server';
import { analyticsEngine } from '../../../_services';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const insights = await analyticsEngine.generateInsights(userId);
  return NextResponse.json(insights);
}
