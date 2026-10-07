# Journal des décisions (ADR léger)

Format : `date | décision | raison`. Une ligne par décision. Les décisions sont prises
AVANT le changement de code (règle 3 du brief).

| Date | Décision | Raison |
|---|---|---|
| 2026-10-07 | Territoire test itération 1 : CC Xaintrie Val'Dordogne (SIREN 200066751, Corrèze, 30 communes) | Itération 1 sur un territoire test rural, reproductible, réutilisable comme jeu de secours |
| 2026-10-07 | Population, contours et composition EPCI via API Géo (geo.api.gouv.fr) au lieu de CSV INSEE + GeoJSON séparés | Source officielle (INSEE/IGN), sans clé API, cohérente ; évite les jointures fragiles entre fichiers |
| 2026-10-07 | Parc VE par commune : Agence ORE (voitures particulières immatriculées par commune et par type de recharge) | Source ouverte, maille communale, mise à jour trimestrielle ; couvre la source optionnelle n°3 du brief |
| 2026-10-07 | DuckDB via le binding Node officiel `@duckdb/node-api`, extension `spatial` | Runtime 100 % local, lecture seule, extension spatiale pour géométries et distances |
| 2026-10-07 | Score : percentiles de rang intra-territoire chargé, pondérations 0,40 / 0,30 / 0,20 / 0,10 | Robuste aux valeurs extrêmes ; comparabilité relative au territoire ; pondérations documentées dans le contrat de données |
| 2026-10-07 | Zone de chargement = bbox EPCI + tampon 40 km pour la table `bornes` | L'indicateur de distance a besoin des points de charge hors EPCI proches de la bordure |
| 2026-10-07 | Jeu de secours = extraits bruts de la zone (IRVE + communes + VE) versionnés dans `data/fallback/` | Démo robuste sans réseau (Wi-Fi de conférence) ; même pipeline de nettoyage en mode secours |
| 2026-10-07 | Un territoire par base DuckDB (rebuild complet à chaque ingest) | Fichier local unique (stack figée) ; le multi-territoires est prévu par le schéma (`code_epci`) pour l'itération 2 |
| 2026-10-07 | `bornes` au niveau point de charge (1 ligne = 1 point de charge) | Niveau le plus fin de la source consolidée (schéma IRVE v2.3.1) ; le nombre de stations est dérivé par regroupement |
| 2026-10-07 | Next.js 16 + React 19 + TypeScript 5.9 (versions du registre npm au 2026-10-07) | Stack Next.js App Router + TS du brief ; TS 5.9 pour la compatibilité éprouvée avec Next 16 |
| 2026-10-07 | Déploiement Vercel : `outputFileTracingIncludes` des binaires natifs `@duckdb/node-bindings-*` + import dynamique de `@duckdb/node-api` avec repli gracieux (retour null) | Vercel ne trace pas le `.so`/`.dylib` des packages externalisés (erreur `libduckdb.so` au runtime → 500) ; l'import dynamique garantit que l'absence de base ou de natif affiche le repli prévu au lieu d'une erreur |
| 2026-10-07 | Cible prioritaire MVP : Jean Dupont, maire d'une commune rurale (décideur budgétaire), à la place de l'élue mobilité EPCI (persona Claire du document personas) | Détient le budget et valide les investissements ; son adoption entraîne les autres communes ; besoin de justifier chaque euro avec des données claires |
| 2026-10-07 | Nom du produit : EVChargeSync (nom du défi A11), affiché dans l'UI ; le repo GitHub et le projet Vercel gardent leur nom technique | Les documents de cadrage du défi (personas, vision) nomment le produit EVChargeSync ; le livrable du hackathon doit porter ce nom |
| 2026-10-07 | Seuils de lecture du PRD adoptés comme couche de lisibilité : < 0,3 / 0,3–0,6 / > 0,6 points/1000 hab (rouge / orange / vert) | Lisibilité pour un décideur non technique (persona Jean Dupont) ; le classement officiel reste le score composite (contrat §5) |
| 2026-10-07 | Stack conservée (Next.js + DuckDB) malgré l'esquisse Python/pandas du PRD §7 | Le brief fige la stack ; le PRD est un cadrage amont, le pipeline est déjà en TypeScript/DuckDB |
| 2026-10-07 | Correction du contrat de nettoyage IRVE : `consolidated_is_lon_lat_correct=False` = « non vérifié » (garder la ligne si coords valides + France + bbox) + remplissage code INSEE par jointure spatiale + assignation à une seule commune en cas de chevauchement | Le profiling a révélé que « False » ≠ invalide (perte de 50 % des stations réelles du territoire) ; les contours API Géo se chevauchent légèrement (26 paires / 24 points distincts) |
