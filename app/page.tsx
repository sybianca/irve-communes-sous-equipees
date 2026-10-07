import { getIngestStats } from '@/lib/db';

// Page dynamique : les compteurs sont lus dans DuckDB à chaque requête.
export const dynamic = 'force-dynamic';

export default async function Page() {
  const stats = await getIngestStats();

  return (
    <main>
      <h1>EVChargeSync — Communes sous-équipées en bornes de recharge</h1>
      <p className="muted">
        Détecteur de communes sous-équipées en IRVE — page d&apos;accueil provisoire
        (itération 1 : preuve que le pipeline de données fonctionne).
      </p>
      <hr />
      {stats === null ? (
        <>
          <h2>Base de données non chargée</h2>
          <p>
            Aucune base DuckDB trouvée à <code>data/irve.duckdb</code>. Lancez{' '}
            <code>npm run ingest</code> pour télécharger les données open data et
            construire la base.
          </p>
        </>
      ) : (
        <>
          <h2>Données chargées</h2>
          <dl className="stats">
            <dt>Territoire</dt>
            <dd>{stats.territoire}</dd>
            <dt>Communes chargées</dt>
            <dd>{stats.nbCommunes}</dd>
            <dt>Bornes chargées (points de charge)</dt>
            <dd>{stats.nbBornes}</dd>
            <dt>Points de charge dans le territoire</dt>
            <dd>{stats.nbPointsCharge}</dd>
            <dt>Dernier ingest</dt>
            <dd>{stats.dateIngest}</dd>
          </dl>
          <p className="muted">
            Requête de preuve : <code>SELECT count(*) FROM bornes</code> → {stats.nbBornes}.
          </p>
        </>
      )}
      <hr />
      <p className="muted">
        Prochaines itérations : sélection d&apos;une intercommunalité, carte choroplèthe
        du score, tableau des communes, fiche commune, simulateur.
      </p>
    </main>
  );
}
