import { NextRequest, NextResponse } from 'next/server';
import { calendarSync } from '../../_services';

export async function POST(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const { title, startTime, endTime, description } = await req.json();
  const results = await calendarSync.createEvent(userId, {
    title,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    description,
  });
  return NextResponse.json(results);
}
