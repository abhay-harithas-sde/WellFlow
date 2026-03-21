import { NextResponse } from 'next/server';
import { breathingGuide } from '../../_services';

export async function GET() {
  return NextResponse.json(breathingGuide.listTechniques());
}
