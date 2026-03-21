import { NextResponse } from 'next/server';
import { murfFetch } from '../../../raw/_services';

export async function GET() {
  try {
    const { status, data } = await murfFetch('GET', '/v1/speech/voices');
    return NextResponse.json(data, { status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
