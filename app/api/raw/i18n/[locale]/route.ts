import { NextRequest, NextResponse } from 'next/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!['en', 'es'].includes(locale)) {
    return NextResponse.json({ error: 'Unsupported locale. Use en or es.' }, { status: 400 });
  }
  try {
    const messages = await import(`../../../../../messages/${locale}.json`);
    return NextResponse.json(messages.default);
  } catch {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}
