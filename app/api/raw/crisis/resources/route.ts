import { NextResponse } from 'next/server';
import { crisisDetector } from '../../_services';

export async function GET() {
  return NextResponse.json(crisisDetector.getEmergencyResources());
}
