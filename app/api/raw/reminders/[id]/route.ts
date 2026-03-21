import { NextRequest, NextResponse } from 'next/server';
import { routineReminder } from '../../_services';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  const reminders = await routineReminder.listReminders(userId);
  return NextResponse.json(reminders);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: reminderId } = await params;
  const { userId } = await req.json();
  await routineReminder.deleteReminder(reminderId, userId);
  return NextResponse.json({ deleted: true });
}
