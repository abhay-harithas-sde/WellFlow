import { NextRequest, NextResponse } from 'next/server';
import { crisisDetector } from '../../_services';

export async function POST(req: NextRequest) {
  const { transcript, sessionId } = await req.json();
  const signal = crisisDetector.analyze(transcript, sessionId);
  const resources = signal ? crisisDetector.getEmergencyResources() : [];
  if (signal) console.log(`[BJP:crisis] Signal detected: ${signal} in session ${sessionId}`);
  return NextResponse.json({ signal, resources });
}
