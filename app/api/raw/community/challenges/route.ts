import { NextRequest, NextResponse } from 'next/server';
import { communityManager } from '../../../raw/_services';

export async function POST(req: NextRequest) {
  const { groupId, activityType, durationDays } = await req.json();
  const challenge = await communityManager.createChallenge(groupId, activityType, durationDays);
  return NextResponse.json(challenge, { status: 201 });
}
