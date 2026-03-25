import { NextRequest, NextResponse } from 'next/server';
import { routineReminder } from '../_services';

export async function POST(req: NextRequest) {
  const { userId, topic, scheduledTime } = await req.json();
  const reminder = await routineReminder.createReminder(topic, new Date(scheduledTime), userId);
  return NextResponse.json(reminder, { status: 201 });
}
