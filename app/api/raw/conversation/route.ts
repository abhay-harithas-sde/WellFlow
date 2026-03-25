import { NextRequest, NextResponse } from 'next/server';
import { conversationEngine } from '../_services';

export async function POST(req: NextRequest) {
  const { userId, sessionId, text, language } = await req.json();
  if (language) conversationEngine.setLanguage(sessionId, language);
  const response = await conversationEngine.processInput(text, sessionId);
  console.log(`[BJP:conversation] [${sessionId}] intent=${response.intent.type}`);
  return NextResponse.json(response);
}
