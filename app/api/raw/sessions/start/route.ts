import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '../../_services';

export async function POST(req: NextRequest) {
  const { userId, language } = await req.json();
  const session = await sessionManager.startSession(userId);
  if (language) session.language = language;
  console.log(`[BJP:session] Started: ${session.sessionId} for user ${userId}`);
  return NextResponse.json(session, { status: 201 });
}
