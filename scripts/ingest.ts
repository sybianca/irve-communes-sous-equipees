/**
 * CLI `npm run ingest` — Pipeline ETL pour EVChargeSync (itération 1)
 * 
 * Lire d'abord : docs/00-brief.md, docs/10-data-contract.md, docs/20-decisions.md (règle 1)
 * 
 * Usage :
 *   npm run ingest                          # territoire par défaut (EPCI 200066751)
 *   npm run ingest --epci CODE              # EPCI spécifique
 *   npm run ingest --offline                # utilise les données en cache
 *   npm run ingest --save-fallback          # génère data/fallback/
 *
 * Territoire par défaut : CC Xaintrie Val'Dordogne (200066751, Corrèze, 30 communes).
 * Sortie : base DuckDB `data/irve.duckdb` (remplace l'ancienne).
 */

import * as duckdb from '@duckdb/node-api';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// __dirname pour ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const FALLBACK_DIR = path.join(DATA_DIR, 'fallback');
const DB_PATH = path.join(DATA_DIR, 'irve.duckdb');

const DEFAULT_EPCI_CODE = '200066751';
const TAMPON_KM = 40;
const now = new Date().toISOString();

// ---- Types ---------------------------------------------------------------

interface Args {
  epci: string;
  offline: boolean;
  saveFallback: boolean;
}

interface CommuneFeature {
  type: 'Feature';
  geometry: { type: string; coordinates: unknown };
  properties: {
    code: string;
    nom: string;
    population: number;
    codeDepartement?: string;
    codeRegion?: string;
  };
}

// ---- Parsing des arguments CLI ---------------------------------------------

function parseArgs(): Args {
  const args: Args = {
    epci: DEFAULT_EPCI_CODE,
    offline: false,
    saveFallback: false,
  };
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--epci' && raw[i + 1]) {
      args.epci = raw[++i].trim();
    } else if (arg === '--offline') {
      args.offline = true;
    } else if (arg === '--save-fallback') {
      args.saveFallback = true;
    } else if (arg.startsWith('--epci=')) {
      args.epci = arg.split('=')[1].trim();
    }
  }
  return args;
}

// ---- Helpers -----------------------------------------------------------

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

function expandBBox(
  bbox: [number, number, number, number] | undefined,
  km: number
): [number, number, number, number] {
  if (!bbox) return [-5.5, 41.0, 9.9, 51.5];
  const deg = km / 111.0;
  return [bbox[0] - deg, bbox[1] - deg, bbox[2] + deg, bbox[3] + deg];
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`  → ${url}`);
  execSync(`curl -sSfL "${url}" -o "${dest}"`, { stdio: 'inherit' });
}

async function cleanupDB(): Promise<void> {
  for (const f of ['irve.duckdb', 'irve.duckdb.wal', 'irve.duckdb-shm']) {
    try { await fs.unlink(path.join(DATA_DIR, f)); } catch {}
  }
}

// ---- Main ------------------------------------------------------------------

const args = parseArgs();

async function main() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  EVChargeSync — Pipeline ingest (itération 1)');
  console.log('═══════════════════════════════════════════════════\n');

  await ensureDir(CACHE_DIR);
  await ensureDir(FALLBACK_DIR);
  await cleanupDB();

  // 1. Récupérer EPCI et communes (API Géo)
  console.log('[1/5] Récupération EPCI et communes...');
  const epciUrl = `https://geo.api.gouv.fr/epcis/${args.epci}`;
  const epciDest = path.join(CACHE_DIR, `epci_${args.epci}.json`);
  const communesUrl = `https://geo.api.gouv.fr/epcis/${args.epci}/communes?fields=code,nom,population,codeDepartement,codeRegion&geometry=contour&format=geojson&page_size=100`;
  const communesDest = path.join(CACHE_DIR, `communes_${args.epci}.geojson`);

  if (!args.offline) {
    await downloadFile(epciUrl, epciDest);
    await downloadFile(communesUrl, communesDest);
  }

  const epciData = JSON.parse(await fs.readFile(epciDest, 'utf8'));
  const communesGeoJson = JSON.parse(await fs.readFile(communesDest, 'utf8'));
  const epciNom = epciData.nom;
  const communesFeatures = communesGeoJson.features as CommuneFeature[];
  
  // Calculer la bbox de l'EPCI à partir des communes (API Géo ne retourne pas de bbox pour les EPCI)
  // GeoJSON : Polygon = [[[lon,lat],...]], MultiPolygon = [[[[lon,lat],...],...],...]
  function getBBoxFromFeature(feature: CommuneFeature): [number, number, number, number] | null {
    const geom = feature.geometry as { type: string; coordinates: unknown };
    const coords = geom.coordinates as any;
    
    // Collect all [lon, lat] points from the geometry
    const points: [number, number][] = [];
    
    function extractPoints(c: any): void {
      if (!Array.isArray(c)) return;
      
      for (const item of c) {
        if (Array.isArray(item) && item.length === 2 && typeof item[0] === 'number' && typeof item[1] === 'number') {
          points.push([item[0], item[1]]);
        } else if (Array.isArray(item)) {
          extractPoints(item);
        }
      }
    }
    
    extractPoints(coords);
    
    if (points.length === 0) return null;
    
    let minLon = points[0][0], minLat = points[0][1];
    let maxLon = points[0][0], maxLat = points[0][1];
    for (const [lon, lat] of points.slice(1)) {
      minLon = Math.min(minLon, lon);
      minLat = Math.min(minLat, lat);
      maxLon = Math.max(maxLon, lon);
      maxLat = Math.max(maxLat, lat);
    }
    return [minLon, minLat, maxLon, maxLat];
  }
  
  let bbox: [number, number, number, number] | undefined = undefined;
  for (const feature of communesFeatures) {
    const fbox = getBBoxFromFeature(feature);
    if (fbox) {
      if (bbox === undefined) {
        bbox = fbox;
      } else {
        bbox = [
          Math.min(bbox[0], fbox[0]),
          Math.min(bbox[1], fbox[1]),
          Math.max(bbox[2], fbox[2]),
          Math.max(bbox[3], fbox[3])
        ];
      }
    }
  }
  console.log(`  ✓ EPCI : ${epciNom} (${args.epci})`);
  console.log(`  ✓ Communes : ${communesFeatures.length}`);

  // 2. Télécharger IRVE et VE ORE
  console.log('\n[2/5] Téléchargement des sources...');
  const irveUrl = 'https://static.data.gouv.fr/resources/base-nationale-des-irve-data-gouv-infrastructures-de-recharge-pour-vehicules-electriques-donnees-statiques/20261007-033608/consolidation-etalab-schema-irve-statique-v-2.3.1-20261007.csv';
  const veUrl = 'https://opendata.agenceore.fr/data-fair/api/v1/datasets/voitures-par-commune-par-energie/raw';
  const irveCsv = path.join(CACHE_DIR, 'irve.csv');
  const veRawCsv = path.join(CACHE_DIR, 've_ore_raw.csv');
  const veCsv = path.join(CACHE_DIR, 've_ore.csv');

  if (!args.offline) {
    await downloadFile(irveUrl, irveCsv);
    await downloadFile(veUrl, veRawCsv);
    console.log('  → Conversion VE Latin-1 → UTF-8');
    execSync(`iconv -f WINDOWS-1252 -t UTF-8 "${veRawCsv}" > "${veCsv}"`, { stdio: 'inherit' });
  }

  // 3. TOUT le traitement dans la base finale (plus simple, plus robuste)
  console.log('\n[3/5] Nettoyage, agrégation, scoring et écriture (DuckDB)...');
  const instance = await duckdb.DuckDBInstance.create(DB_PATH);
  const conn = await instance.connect();
  
  // Variable pour le finally
  let tempCommunes: string | undefined;

  try {
    await conn.run('INSTALL spatial');
    await conn.run('LOAD spatial');

    // ---- communes_raw (depuis GeoJSON) ---
    console.log('  → Chargement des communes...');
    const flatCommunes = communesFeatures.map(f => ({
      code_insee: f.properties.code,
      nom: f.properties.nom,
      population: f.properties.population,
      codeDepartement: f.properties.codeDepartement,
      codeRegion: f.properties.codeRegion,
      geom: f.geometry,
    }));
    const tempCommunes = path.join(CACHE_DIR, 'communes_flat.json');
    await fs.writeFile(tempCommunes, JSON.stringify(flatCommunes));

    await conn.run(`
      CREATE TABLE communes_raw AS
      SELECT
        code_insee,
        nom,
        CAST(population AS INTEGER) AS population,
        codeDepartement,
        codeRegion,
        '${args.epci}' AS code_epci,
        '${escapeSql(epciNom)}' AS epci_nom,
        ST_GeomFromGeoJSON(geom) AS geom
      FROM read_json('${tempCommunes}');
    `);
    await conn.run('CREATE INDEX idx_communes_geom ON communes_raw USING RTREE(geom);');

    // ---- ve (dernier trimestre par commune) ---
    console.log('  → Chargement VE...');
    await conn.run(`
      CREATE TABLE ve AS
      SELECT 
        CODGEO AS code_insee,
        CAST(NULLIF(NB_VP_RECHARGEABLES_EL, '') AS INTEGER) AS nb_ve
      FROM read_csv_auto('${veCsv}', header=true, all_varchar=true, strict_mode=false)
      WHERE NB_VP_RECHARGEABLES_EL ~ '^[0-9]+$' OR NB_VP_RECHARGEABLES_EL = ''
      QUALIFY ROW_NUMBER() OVER (PARTITION BY CODGEO ORDER BY DATE_ARRETE DESC) = 1;
    `);

    // ---- irve nettoyé et joint spatialement ---
    console.log('  → Nettoyage IRVE + jointure spatiale...');

    // 1. Charger le CSV IRVE
    await conn.run(`
      CREATE TABLE irve_raw AS
      SELECT * FROM read_csv_auto('${irveCsv}', header=true, auto_detect=true);
    `);

    // 2. Extraire coordonnées consolidées + puissance
    await conn.run(`
      CREATE TABLE irve_clean AS
      SELECT
        id_pdc_itinerance,
        id_station_itinerance,
        code_insee_commune,
        nom_operateur,
        nom_enseigne,
        adresse_station,
        condition_acces,
        horaires,
        CASE 
          WHEN puissance_nominale::VARCHAR ~ '^[0-9]+(\\. [0-9]+)?$' THEN CAST(puissance_nominale AS DOUBLE)
          ELSE NULL 
        END AS puissance_kw,
        consolidated_longitude AS lon,
        consolidated_latitude AS lat,
        consolidated_is_lon_lat_correct
      FROM irve_raw;
    `);

    // 3. Zone chargée : bbox EPCI + tampon 40 km
    const expandedBBox = expandBBox(bbox, TAMPON_KM);
    const [minLon, minLat, maxLon, maxLat] = expandedBBox;

    // Filtrer : coords valides + dans la zone
    // consolidated_is_lon_lat_correct=False = "non vérifié" → on garde si coords valides
    await conn.run(`
      CREATE TABLE irve_filtered AS
      SELECT * FROM irve_clean
      WHERE lon IS NOT NULL
        AND lat IS NOT NULL
        AND lon BETWEEN ${minLon} AND ${maxLon}
        AND lat BETWEEN ${minLat} AND ${maxLat};
    `);

    // 4. Dédoublonnage par id_pdc_itinerance
    await conn.run(`
      CREATE TABLE irve_dedup AS
      SELECT * FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY id_pdc_itinerance ORDER BY id_pdc_itinerance) AS rn
        FROM irve_filtered
      ) WHERE rn = 1;
    `);

    // 5. Jointure spatiale : remplissage code INSEE + assignation UNE SEULE commune
    await conn.run(`
      CREATE TABLE irve_final AS
      SELECT DISTINCT ON (id_pdc_itinerance)
        i.id_pdc_itinerance,
        i.id_station_itinerance,
        COALESCE(i.code_insee_commune, c.code_insee) AS code_insee,
        c.nom AS nom_commune,
        i.nom_operateur,
        i.nom_enseigne,
        i.adresse_station,
        i.puissance_kw,
        i.condition_acces,
        i.horaires,
        i.lon,
        i.lat,
        c.codeDepartement,
        c.codeRegion,
        c.code_epci,
        c.epci_nom,
        c.population,
        c.geom
      FROM irve_dedup i
      LEFT JOIN communes_raw c ON ST_Contains(c.geom, ST_Point(i.lon, i.lat))
      ORDER BY i.id_pdc_itinerance, c.code_insee;
    `);

    // ---- Stations (regroupement par station) ---
    console.log('  → Stations et agrégation...');
    await conn.run(`
      CREATE TABLE stations AS
      SELECT 
        code_insee,
        nom_commune,
        COALESCE(id_station_itinerance, CONCAT('GEN-', MD5(CONCAT(code_insee, lon, lat, nom_operateur)))) AS station_id,
        COUNT(*) AS nb_points_charge,
        SUM(puissance_kw) AS puissance_totale_kw,
        nom_operateur,
        nom_enseigne,
        adresse_station
      FROM irve_final
      GROUP BY code_insee, nom_commune, station_id, nom_operateur, nom_enseigne, adresse_station;
    `);

    // ---- communes_aggregees (par commune) ---
    await conn.run(`
      CREATE TABLE communes_aggregees AS
      SELECT 
        c.code_insee,
        c.nom AS commune,
        c.codeDepartement,
        c.codeRegion,
        c.code_epci,
        c.epci_nom,
        c.population,
        c.geom,
        COUNT(DISTINCT s.station_id) AS nb_bornes,
        SUM(s.nb_points_charge) AS nb_points_charge,
        SUM(s.puissance_totale_kw) AS puissance_totale_kw
      FROM communes_raw c
      LEFT JOIN stations s ON c.code_insee = s.code_insee
      GROUP BY c.code_insee, c.nom, c.codeDepartement, c.codeRegion, c.code_epci, c.epci_nom, c.population, c.geom;
    `);

    // ---- Jointure VE + indicateurs bruts ---
    console.log('  → Indicateurs...');
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN nb_ve INTEGER;`);
    await conn.run(`
      UPDATE communes_aggregees ca
      SET nb_ve = v.nb_ve
      FROM ve v WHERE ca.code_insee = v.code_insee;
    `);

    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN points_par_1000_hab DOUBLE;`);
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN kw_par_1000_hab DOUBLE;`);
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN kw_par_ve DOUBLE;`);
    await conn.run(`
      UPDATE communes_aggregees
      SET 
        points_par_1000_hab = CASE WHEN population > 0 THEN nb_points_charge::DOUBLE / population * 1000 ELSE NULL END,
        kw_par_1000_hab = CASE WHEN population > 0 THEN puissance_totale_kw::DOUBLE / population * 1000 ELSE NULL END,
        kw_par_ve = CASE WHEN nb_ve IS NOT NULL AND nb_ve > 0 THEN puissance_totale_kw::DOUBLE / nb_ve ELSE NULL END;
    `);

    // ---- Distance à la borne la plus proche hors commune ---
    console.log('  → Distances hors commune...');
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN distance_borne_hors_commune_km DOUBLE;`);
    await conn.run(`
      UPDATE communes_aggregees ca1
      SET distance_borne_hors_commune_km = subq.min_dist_km
      FROM (
        SELECT 
          ca.code_insee,
          MIN(ST_Distance_Sphere(ST_Centroid(ca.geom), ST_Point(i.lon, i.lat)) / 1000.0) AS min_dist_km
        FROM communes_aggregees ca
        JOIN irve_final i ON ca.code_insee != i.code_insee
        GROUP BY ca.code_insee
      ) subq
      WHERE ca1.code_insee = subq.code_insee;
    `);

    // ---- Score composite (contrat §5) ---
    console.log('  → Score composite...');
    const n = communesFeatures.length;

    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN s_points DOUBLE;`);
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN s_kw DOUBLE;`);
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN s_ve DOUBLE;`);
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN s_iso DOUBLE;`);

    // Table temporaire pour les ranks (DuckDB : pas de window functions dans UPDATE)
    await conn.run(`
      CREATE TEMP TABLE temp_ranks AS
      SELECT
        code_insee,
        100.0 * (RANK() OVER (ORDER BY points_par_1000_hab ASC NULLS LAST) - 1.0) / (${n} - 1.0) AS rk_points,
        100.0 * (RANK() OVER (ORDER BY kw_par_1000_hab ASC NULLS LAST) - 1.0) / (${n} - 1.0) AS rk_kw,
        100.0 * (RANK() OVER (ORDER BY kw_par_ve ASC NULLS LAST) - 1.0) / (${n} - 1.0) AS rk_ve,
        100.0 - (100.0 * (RANK() OVER (ORDER BY distance_borne_hors_commune_km ASC NULLS LAST) - 1.0) / (${n} - 1.0)) AS rk_iso
      FROM communes_aggregees;
    `);

    await conn.run(`
      UPDATE communes_aggregees ca
      SET 
        s_points = tr.rk_points,
        s_kw = tr.rk_kw,
        s_ve = tr.rk_ve,
        s_iso = tr.rk_iso
      FROM temp_ranks tr
      WHERE ca.code_insee = tr.code_insee;
    `);

    // Score composite avec renormalisation si des sous-scores sont NULL
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN score_equipement DOUBLE;`);
    await conn.run(`
      UPDATE communes_aggregees
      SET score_equipement = (
        0.40 * COALESCE(s_points, 0) +
        0.30 * COALESCE(s_kw, 0) +
        0.20 * COALESCE(s_ve, 0) +
        0.10 * COALESCE(s_iso, 0)
      ) / (
        0.40 * CASE WHEN s_points IS NOT NULL THEN 1 ELSE 0 END +
        0.30 * CASE WHEN s_kw IS NOT NULL THEN 1 ELSE 0 END +
        0.20 * CASE WHEN s_ve IS NOT NULL THEN 1 ELSE 0 END +
        0.10 * CASE WHEN s_iso IS NOT NULL THEN 1 ELSE 0 END
      );
    `);

    // Rang croissant : 1 = la plus sous-équipée
    await conn.run(`ALTER TABLE communes_aggregees ADD COLUMN rang_sous_equipe INTEGER;`);
    await conn.run(`
      CREATE TEMP TABLE temp_rang AS
      SELECT code_insee, RANK() OVER (ORDER BY score_equipement ASC NULLS LAST) AS rk
      FROM communes_aggregees;
    `);
    await conn.run(`
      UPDATE communes_aggregees ca
      SET rang_sous_equipe = tr.rk
      FROM temp_rang tr
      WHERE ca.code_insee = tr.code_insee;
    `);

    // ---- Écriture finale : tables du contrat ---
    console.log('  → Tables finales...');

    // Table bornes (contrat §3)
    await conn.run(`
      CREATE TABLE bornes AS
      SELECT
        id_pdc_itinerance AS id,
        code_insee,
        nom_commune AS commune,
        nom_operateur AS operateur,
        nom_enseigne AS enseigne,
        adresse_station AS adresse,
        puissance_kw,
        condition_acces,
        horaires,
        ST_Point(lon, lat) AS geom,
        'reseau' AS source
      FROM irve_final;
    `);
    await conn.run('CREATE INDEX idx_bornes_geom ON bornes USING RTREE(geom);');

    // Table communes_indicateurs (contrat §3)
    await conn.run(`
      CREATE TABLE communes_indicateurs AS
      SELECT
        code_insee,
        commune,
        codeDepartement,
        codeRegion,
        code_epci,
        epci_nom,
        population,
        NULL AS superficie_km2,
        nb_bornes,
        nb_points_charge,
        puissance_totale_kw,
        points_par_1000_hab,
        kw_par_1000_hab,
        nb_ve,
        kw_par_ve,
        distance_borne_hors_commune_km,
        score_equipement,
        rang_sous_equipe,
        geom
      FROM communes_aggregees;
    `);

    // Table meta (contrat §3)
    await conn.run(`
      CREATE TABLE meta AS
      SELECT 'date_ingest' AS cle, '${now}' AS valeur UNION ALL
      SELECT 'territoire_code_epci', '${args.epci}' UNION ALL
      SELECT 'territoire_nom', '${escapeSql(epciNom)}' UNION ALL
      SELECT 'source', 'reseau' UNION ALL
      SELECT 'nb_communes', '${communesFeatures.length}' UNION ALL
      SELECT 'nb_bornes', CAST((SELECT COUNT(*) FROM bornes) AS VARCHAR);
    `);

    // Vérification
    const countBornes = await conn.runAndReadAll('SELECT COUNT(*) AS cnt FROM bornes');
    const cnt = Number(countBornes.getRowObjects()[0].cnt);
    const countCommunes = await conn.runAndReadAll('SELECT COUNT(*) AS cnt FROM communes_indicateurs');
    const ccnt = Number(countCommunes.getRowObjects()[0].cnt);

    console.log(`  ✓ Base : ${DB_PATH}`);
    console.log(`  ✓ Bornes : ${cnt}`);
    console.log(`  ✓ Communes : ${ccnt}`);

    // 5. Mode secours
    if (args.saveFallback) {
      console.log('\n[4/5] Génération du jeu de secours (data/fallback/)...');
      await ensureDir(FALLBACK_DIR);
      execSync(`cp "${irveCsv}" "${path.join(FALLBACK_DIR, 'irve_zone.csv')}"`, { stdio: 'inherit' });
      execSync(`cp "${veCsv}" "${path.join(FALLBACK_DIR, 've_ore_zone.csv')}"`, { stdio: 'inherit' });
      const communesJson = JSON.stringify(communesGeoJson);
      await fs.writeFile(path.join(FALLBACK_DIR, 'communes.geojson'), communesJson);
      const meta = { epci_code: args.epci, epci_nom: epciNom, date: now, url_irve: irveUrl, url_ve: veUrl };
      await fs.writeFile(path.join(FALLBACK_DIR, 'meta.json'), JSON.stringify(meta, null, 2));
      console.log('  ✓ Jeux de secours générés');
    }

    console.log('\n✅ Ingest terminé');
    console.log(`   SELECT count(*) FROM bornes = ${cnt}`);
    console.log(`   SELECT count(*) FROM communes_indicateurs = ${ccnt}`);

  } finally {
    conn.disconnectSync();
    instance.closeSync();
    if (tempCommunes) {
      try { await fs.unlink(tempCommunes); } catch {}
    }
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale :', err);
  process.exit(1);
});
