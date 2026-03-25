import { NextRequest, NextResponse } from 'next/server';
import { mindfulnessGuide } from '../../_services';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  mindfulnessGuide.pause(sessionId);
  return NextResponse.json({ stopped: true });
}
