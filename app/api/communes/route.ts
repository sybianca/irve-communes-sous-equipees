import { NextResponse } from 'next/server';
import { getCommunesWithGeometry } from '@/lib/db';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const FALLBACK_DIR = path.join(process.cwd(), 'data', 'fallback');

// Fichier léger avec indicateurs pré-calculés (1.2 Mo au lieu de 200+ Mo)
const FALLBACK_GEOJSON = path.join(FALLBACK_DIR, 'communes_indicateurs.geojson');

export async function GET() {
  try {
    // Essayer la base DuckDB d'abord
    const communes = await getCommunesWithGeometry();
    if (communes) {
      return NextResponse.json(communes);
    }

    // Sinon, utiliser le jeu de secours léger
    try {
      const data = JSON.parse(await fs.readFile(FALLBACK_GEOJSON, 'utf8'));
      return NextResponse.json(data);
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'No data available. Run `npm run ingest --save-fallback` first.' },
        { status: 404 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load communes' },
      { status: 500 }
    );
  }
}
