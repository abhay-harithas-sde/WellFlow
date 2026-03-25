import { NextRequest, NextResponse } from 'next/server';
import { breathingGuide } from '../../_services';

export async function POST(req: NextRequest) {
  const { sessionId, techniqueId } = await req.json();
  const techniques = breathingGuide.listTechniques();
  const technique = techniques.find((t) => t.id === (techniqueId ?? 'BOX'));
  if (!technique) return NextResponse.json({ error: 'Unknown technique' }, { status: 400 });
  const session = breathingGuide.startExercise(technique, sessionId);
  return NextResponse.json(session);
}
