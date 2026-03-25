import { NextRequest, NextResponse } from 'next/server';
import { mindfulnessGuide } from '../../_services';

export async function POST(req: NextRequest) {
  const { sessionId, durationMinutes } = await req.json();
  const session = mindfulnessGuide.startSession(durationMinutes ?? 5, sessionId);
  return NextResponse.json(session);
}
