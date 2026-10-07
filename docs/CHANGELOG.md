# CHANGELOG

## Hors itération — 2026-10-07 — Publication GitHub + déploiement Vercel

### Ce qui marche

- Repo public sur GitHub : https://github.com/sybianca/irve-communes-sous-equipees (branche `main`)
- Déploiement Vercel en production : **https://irve-communes-sous-equipees.vercel.app**
  (projet `find-my-charge/irve-communes-sous-equipees`), build Next.js 16 + Turbopack OK
- Page d'accueil en ligne (HTTP 200, accès public) avec repli gracieux : sans base
  DuckDB, affiche « Base de données non chargée — lancez `npm run ingest` »
- Correctif déploiement : `outputFileTracingIncludes` des binaires natifs DuckDB +
  import dynamique de `@duckdb/node-api` (décision dans `docs/20-decisions.md`)

### Ce qui reste

- Connecter le repo GitHub à Vercel pour les déploiements auto à chaque push
  (nécessite de lier le compte GitHub à Vercel, côté dashboard)
- `npm run ingest` (itération 1) : le script `scripts/ingest.ts` reste à écrire

## Hors itération — 2026-10-07 — Cadrage produit (documents du défi)

### Ce qui marche

- 3 documents de cadrage du défi intégrés comme références : personas, vision produit
  (nom du produit : **EVChargeSync**), PRD (périmètre F1–F7 aligné avec les itérations)
- Décision produit : cible prioritaire MVP = **Jean Dupont, maire d'une commune rurale**
  (décideur budgétaire) — journalisée dans `docs/20-decisions.md`, `docs/00-brief.md` à jour
- Seuils de lecture PRD (< 0,3 / 0,3–0,6 / > 0,6 points/1000 hab) documentés dans le
  contrat de données comme couche de lisibilité (le score composite reste le classement)
- Nom affiché de l'app : **EVChargeSync** (build local OK)

### Ce qui reste

- Mettre à jour `docs/Personas_EVChargeSync.md` (Claire = prioritaire) pour refléter
  la décision Jean Dupont, si souhaité
- Redéployer sur Vercel et pousser sur GitHub (en attente d'autorisation)

## Itération 1 — 2026-10-07 — Initialisation du repo + pipeline `ingest`

### Ce qui marche

- Script `npm run ingest` **opérationnel** : télécharge les sources (API Géo pour EPCI/communes, data.gouv.fr pour IRVE, Agence ORE pour VE), nettoie les données (coordonnées valides, zone EPCI + tampon 40 km, dédoublonnage, jointure spatiale pour code INSEE), calcule les indicateurs (points/1000 hab, kW/1000 hab, kW/VE, distance hors commune), calcule le score composite (percentiles + pondérations 0,40/0,30/0,20/0,10), écrit la base DuckDB (`data/irve.duckdb`)
- **Territoire test validé** : CC Xaintrie Val'Dordogne (200066751, 30 communes) → 1 058 points de charge dans la zone (bbox + tampon 40 km), 30 communes dans `communes_indicateurs`, tables `bornes`/`communes_indicateurs`/`meta` conformes au contrat
- Page d'accueil **pré-teintée** : affiche le nombre de communes et de bornes chargées (preuve que le pipeline fonctionne), repli gracieux si base non chargée
- **Correction majeure** : `consolidated_is_lon_lat_correct=False` = « non vérifié » (et non invalide) → maintien des lignes avec coordonnées valides, évitant la perte de 50 % des stations réelles (documenté dans `docs/10-data-contract.md` et `docs/20-decisions.md`)
- **Calcul de bbox** : l'API Géo ne retournant pas de bbox pour les EPCI, calcul de la bbox à partir des contours des communes (corrigé dans `scripts/ingest.ts`)

### Ce qui reste

- Itération 2 : sélection d'une intercommunalité (recherche par nom de commune ou d'EPCI)
- Itération 3 : page territoire (carte choroplèthe + tableau triable)
- Itération 4 : fiche commune
- Itération 5 : simulateur
- Itération 6 : export CSV
- Itération 7 : page méthode
- Itération 8 : README
