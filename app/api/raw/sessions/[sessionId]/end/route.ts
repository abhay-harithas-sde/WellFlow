import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '../../../_services';

export async function POST(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const { stressRating } = await req.json().catch(() => ({}));
  const session = sessionManager.getSession(sessionId);
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  if (stressRating !== undefined) session.stressRatings.push(stressRating);
  await sessionManager.saveSession(session);
  console.log(`[BJP:session] Ended: ${sessionId}`);
  return NextResponse.json({ ended: true, sessionId });
}
