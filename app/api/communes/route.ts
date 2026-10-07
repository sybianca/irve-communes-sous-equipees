import { NextResponse } from 'next/server';
import { getCommunesWithGeometry } from '@/lib/db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname pour ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const FALLBACK_PATH = path.join(REPO_ROOT, 'data', 'fallback', 'communes_indicateurs.geojson');

export async function GET() {
  try {
    // Essayer la base DuckDB d'abord
    const communes = await getCommunesWithGeometry();
    if (communes) {
      return NextResponse.json(communes);
    }

    // Sinon, utiliser le jeu de secours
    try {
      const data = JSON.parse(await fs.readFile(FALLBACK_PATH, 'utf8'));
      return NextResponse.json(data);
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
      return NextResponse.json(
        { 
          error: 'No data available',
          hint: 'Run `npm run ingest --save-fallback` or check fallback files',
          fallbackPath: FALLBACK_PATH,
          cwd: process.cwd()
        },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to load communes', details: String(error) },
      { status: 500 }
    );
  }
}
