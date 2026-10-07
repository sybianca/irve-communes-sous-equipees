import { NextResponse } from 'next/server';
import { getCommunesWithGeometry } from '@/lib/db';

export async function GET() {
  try {
    const communes = await getCommunesWithGeometry();
    if (!communes) {
      return NextResponse.json(
        { error: 'No data available. Run `npm run ingest` first.' },
        { status: 404 }
      );
    }
    return NextResponse.json(communes);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load communes' },
      { status: 500 }
    );
  }
}
