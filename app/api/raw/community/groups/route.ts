import { NextRequest, NextResponse } from 'next/server';
import { communityManager } from '../../_services';

export async function POST(req: NextRequest) {
  const { userId, name } = await req.json();
  const group = await communityManager.createGroup(userId, name);
  return NextResponse.json(group, { status: 201 });
}
