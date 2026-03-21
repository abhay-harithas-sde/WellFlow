import { NextRequest, NextResponse } from 'next/server';
import { communityManager } from '../../../_services';

export async function POST(req: NextRequest) {
  const { userId, groupCode } = await req.json();
  const group = await communityManager.joinGroup(userId, groupCode);
  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  return NextResponse.json(group);
}
