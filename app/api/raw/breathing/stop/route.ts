import { NextRequest, NextResponse } from 'next/server';
import { breathingGuide } from '../../_services';

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();
  breathingGuide.stopExercise(sessionId);
  return NextResponse.json({ stopped: true });
}
