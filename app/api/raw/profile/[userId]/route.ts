import { NextRequest, NextResponse } from 'next/server';
import { store } from '../../_services';
import type { UserProfile } from '../../../../../src/types';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const profile = store.getProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const update: Partial<UserProfile> = await req.json();
  const profile = store.upsertProfile(userId, update);
  return NextResponse.json(profile);
}
