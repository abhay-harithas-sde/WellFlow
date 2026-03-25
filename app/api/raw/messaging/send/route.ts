import { NextRequest, NextResponse } from 'next/server';
import { messagingGateway } from '../../../raw/_services';

export async function POST(req: NextRequest) {
  const msg = await req.json();
  await messagingGateway.sendNotification(msg);
  return NextResponse.json({ sent: true });
}
