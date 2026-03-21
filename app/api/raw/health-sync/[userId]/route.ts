import { NextRequest, NextResponse } from 'next/server';
import { healthSync } from '../../_services';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const snapshot = await healthSync.fetchSnapshot(userId);
  return NextResponse.json(snapshot);
}
