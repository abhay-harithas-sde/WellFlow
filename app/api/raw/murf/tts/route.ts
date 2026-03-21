import { NextRequest, NextResponse } from 'next/server';
import { getMurfApiKey, ConfigurationError } from '../../../../../lib/murf-config';
import { murfFetch } from '../../_services';

function getAppOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  const host = req.headers.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get('origin');
  const appOrigin = getAppOrigin(req);

  if (!origin || origin !== appOrigin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const upgrade = req.headers.get('upgrade');
  if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
    return NextResponse.json({ error: 'Upgrade Required' }, { status: 426 });
  }

  try {
    const apiKey = getMurfApiKey();
    return NextResponse.json(
      { error: 'Upgrade Required' },
      { status: 426, headers: { 'X-Murf-Auth': `Bearer ${apiKey}` } }
    );
  } catch (err) {
    if (err instanceof ConfigurationError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const { status, data } = await murfFetch('POST', '/v1/speech/generate', body);
    return NextResponse.json(data, { status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
