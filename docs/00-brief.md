# Brief — Détecteur de communes sous-équipées en bornes de recharge (IRVE)

> Hackathon. Document de référence du projet, à lire avant toute itération.

## Contexte

Les bornes de recharge pour véhicules électriques (IRVE) sont mal réparties : certaines
communes en comptent peu par rapport à leur population. Les communautés de communes
qui investissent manquent d'un outil objectif pour repérer les communes sous-équipées
et justifier leurs choix face aux demandes des maires.

## Histoire utilisateur (fil conducteur)

Une élue mobilité d'une intercommunalité reçoit des demandes de plusieurs maires,
chacun persuadé que sa commune est la plus mal servie. Elle a un budget, pas de
comparateur chiffré. L'application tranche, chiffres à l'appui.

## Cible

- Élue mobilité / direction des mobilités d'une intercommunalité (profil non technique).
- Secondairement : maires, DGS, citoyens.
- Contraintes : UI en français, sobre, orientée élu ; chiffres explicables et traçables.

## Stack (figée, ne pas changer sans mise à jour de `docs/20-decisions.md`)

- Next.js (App Router) + TypeScript, UI en français, sobre, orientée élu.
- Carte : MapLibre GL (ou Leaflet), sans clé API.
- Données : DuckDB (extension `spatial`), lecture seule au runtime, fichier local unique.
- Aucun autre service externe obligatoire pour la démo.

## Pipeline de données (ETL unique, exécuté via `npm run ingest`)

Sources open data (téléchargées au premier lancement, puis mises en cache) :

1. Base nationale IRVE consolidée (data.gouv.fr / transport.data.gouv.fr) : points de
   charge, puissance, accessibilité. Exclure les bornes non ouvertes au public.
2. Population légale communale INSEE (CSV, code INSEE + population).
3. Parc de véhicules électriques par commune (SDES/data.gouv.fr) — optionnel.
4. Contours des communes (GeoJSON) + composition des EPCI (fichier ANCT/INSEE).

Étapes de l'ETL :

1. Nettoyage : doublons, bornes privées, coordonnées invalides.
2. Agrégation par code INSEE : nb de points de charge, kW totaux.
3. Précalcul par commune : points/1000 hab, kW/hab, kW par VE immatriculé, distance à la
   borne publique la plus proche hors commune (index spatial).
4. Score composite 0–100 combinant ces indicateurs (pondérations documentées dans
   `docs/10-data-contract.md`).
5. Écriture dans une base DuckDB : tables `communes_indicateurs` et `bornes`
   (géométries incluses).

L'application ne fait AUCUN téléchargement ni parsing au runtime : elle interroge la
base DuckDB en lecture seule via SQL.

Jeu de données de secours réduit si le réseau échoue (extrait pré-généré dans le repo,
une interco rurale au choix).

## Fonctionnalités (dans l'ordre d'implémentation)

1. CLI `ingest` complet + base DuckDB valide sur un territoire test.
2. Sélection d'une intercommunalité (recherche par nom de commune ou d'EPCI).
3. Page territoire : carte choroplèthe du score par commune (cliquable) + tableau triable
   des communes avec indicateurs détaillés.
4. Fiche commune : chiffres bruts, comparaison à la moyenne de l'interco et à la moyenne
   nationale, justification du score en langage clair.
5. Simulateur : « si j'ajoute N bornes de X kW dans la commune Y » → recalcul du classement
   (réponse < 100 ms, table de 35 k lignes max).
6. Export CSV du classement.
7. Page « méthode » dans l'app : formule du score, pondérations, limites (transparence =
   crédibilité pour un élu).
8. README : installation, sources, formule du score, limites, roadmap.

## Règles de travail (à respecter à CHAQUE itération, sans exception)

1. Lire d'abord `docs/00-brief.md`, `docs/10-data-contract.md` et `docs/20-decisions.md`.
2. Implémenter uniquement ce qui est demandé dans l'itération.
3. Si une décision technique ou produit change, mettre à jour `docs/20-decisions.md`
   (une ligne : date, décision, raison) AVANT de changer le code.
4. Ne jamais modifier le schéma de données (`docs/10-data-contract.md`) sans le documenter
   dans ce même fichier.
5. Terminer chaque itération par un court `docs/CHANGELOG.md` (ce qui marche, ce qui reste).
