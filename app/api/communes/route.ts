import { NextResponse } from 'next/server';
import { getCommunesWithGeometry } from '@/lib/db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const FALLBACK_PATH = path.join(process.cwd(), 'data', 'fallback', 'communes_indicateurs.geojson');

export async function GET() {
  try {
    // 1. Essayer la base DuckDB locale d'abord
    const communes = await getCommunesWithGeometry();
    if (communes) {
      return NextResponse.json(communes);
    }

    // 2. Sinon, utiliser le fallback statique
    try {
      const data = JSON.parse(await fs.readFile(FALLBACK_PATH, 'utf8'));
      return NextResponse.json(data);
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'No data available. Run `npm run ingest --save-fallback` first.' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load communes', details: String(error) },
      { status: 500 }
    );
  }
}
