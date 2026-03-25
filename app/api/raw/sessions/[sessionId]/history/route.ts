import { NextRequest, NextResponse } from 'next/server';
import { store } from '../../../_services';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId: userId } = await params; // route is /sessions/:userId/history
  const history = store.getSessionHistory(userId);
  return NextResponse.json(history);
}
