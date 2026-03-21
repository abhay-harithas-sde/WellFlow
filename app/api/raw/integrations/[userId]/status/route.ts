import { NextRequest, NextResponse } from 'next/server';
import { integrationManager } from '../../../_services';

const PLATFORMS = [
  'APPLE_HEALTH','GOOGLE_FIT','FITBIT','GARMIN','GOOGLE_CALENDAR',
  'APPLE_CALENDAR','OUTLOOK','APPLE_WATCH','WEAR_OS','OURA',
  'SLACK','WHATSAPP','TELEGRAM',
] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const status: Record<string, string> = {};
  for (const p of PLATFORMS) {
    status[p] = integrationManager.getStatus(p, userId);
  }
  return NextResponse.json(status);
}
