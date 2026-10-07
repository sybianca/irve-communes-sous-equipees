import * as duckdb from '@duckdb/node-api';

// Chemin de la base DuckDB (lecture seule au runtime, voir docs/10-data-contract.md).
const DB_PATH = process.env.IRVE_DB_PATH ?? 'data/irve.duckdb';

export interface IngestStats {
  territoire: string;
  nbCommunes: number;
  nbBornes: number;
  nbPointsCharge: number;
  dateIngest: string;
}

type Row = Record<string, unknown>;

/**
 * Ouvre la base DuckDB en lecture seule et retourne les compteurs de l'ingest.
 * Retourne null si la base n'existe pas (ingest pas encore lancé).
 */
export async function getIngestStats(): Promise<IngestStats | null> {
  let instance: duckdb.DuckDBInstance;
  try {
    instance = await duckdb.DuckDBInstance.create(DB_PATH, { access_mode: 'read_only' });
  } catch {
    return null;
  }

  const connection = await instance.connect();
  try {
    const metaReader = await connection.runAndReadAll(
      "SELECT cle, valeur FROM meta WHERE cle IN ('territoire_nom', 'date_ingest')"
    );
    const meta = new Map<string, string>();
    for (const row of metaReader.getRowObjects() as Row[]) {
      meta.set(String(row.cle), String(row.valeur));
    }

    const countsReader = await connection.runAndReadAll(`
      SELECT
        (SELECT count(*) FROM bornes) AS nb_bornes,
        (SELECT count(*) FROM communes_indicateurs) AS nb_communes,
        (SELECT coalesce(sum(nb_points_charge), 0) FROM communes_indicateurs) AS nb_points
    `);
    const counts = countsReader.getRowObjects()[0] as Row;

    return {
      territoire: meta.get('territoire_nom') ?? '—',
      nbCommunes: Number(counts.nb_communes),
      nbBornes: Number(counts.nb_bornes),
      nbPointsCharge: Number(counts.nb_points),
      dateIngest: meta.get('date_ingest') ?? '—',
    };
  } finally {
    connection.disconnectSync();
    instance.closeSync();
  }
}
