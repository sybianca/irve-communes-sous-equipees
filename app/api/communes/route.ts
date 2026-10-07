import { NextResponse } from 'next/server';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// Sur Vercel, on utilise toujours le fallback car DuckDB n'est pas disponible
// (pas de filesystem persistant, pas de binaires natifs)
const FALLBACK_PATH = path.join(process.cwd(), 'data', 'fallback', 'communes_indicateurs.geojson');

export async function GET() {
  try {
    // Lire directement le fallback (toujours disponible sur Vercel)
    const data = JSON.parse(await fs.readFile(FALLBACK_PATH, 'utf8'));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fallback error:', error);
    return NextResponse.json(
      { 
        error: 'No data available',
        hint: 'Fallback file missing: ' + FALLBACK_PATH,
        cwd: process.cwd()
      },
      { status: 500 }
    );
  }
}
