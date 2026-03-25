import { NextResponse } from 'next/server';
import { communityManager } from '../../../raw/_services';

export async function GET() {
  const feed = await communityManager.getFeed();
  return NextResponse.json(feed);
}
