import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    server: 'RAW',
    version: '1.0.0',
    integrations: [
      'murf-tts','murf-voices','conversation','breathing','mindfulness',
      'reminders','sessions','analytics','personalization','crisis',
      'community','integrations','health-sync','calendar-sync',
      'wearable-bridge','messaging-gateway','profile-store',
    ],
  });
}
