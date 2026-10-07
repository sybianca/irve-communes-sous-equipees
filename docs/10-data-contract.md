# Contrat de données

Document de référence du schéma et des calculs. Toute modification du schéma ou des
formules doit être documentée ici (règle 4 du brief) et, si c'est une décision,
journalisée dans `docs/20-decisions.md`.

## 1. Sources (téléchargées par `npm run ingest`, mises en cache dans `data/cache/`)

| # | Source | URL / API | Utilisation |
|---|--------|-----------|-------------|
| S1 | Base nationale IRVE consolidée (schéma `etalab/schema-irve-statique` v2.3.1), data.gouv.fr | dataset `base-nationale-des-irve-infrastructures-de-recharge-pour-vehicules-electriques` → ressource CSV « Consolidation de la dernière version » | Points de charge (1 ligne = 1 point de charge), puissance, coordonnées, opérateur, horaires |
| S2 | Communes, population légale et contours — API Géo (geo.api.gouv.fr, données INSEE/IGN, sans clé) | `GET /epcis/{code}/communes?fields=code,nom,population,codeDepartement,codeRegion&geometry=contour&format=geojson` | Population, contours, rattachement EPCI |
| S3 | Parc de VE par commune — Agence ORE (immatriculations) | dataset data.gouv `voitures-particulieres-immatriculees-par-commune-et-par-type-de-recharge-jeu-de-donnees-aaadata` → CSV `voitures-par-commune-par-energie` | `NB_VP_RECHARGEABLES_EL` au dernier trimestre connu |
| S4 | Métadonnées EPCI — API Géo | `GET /epcis/{code}` | Nom de l'intercommunalité |

Notes :

- S2/S4 remplacent le « CSV INSEE population » et le « GeoJSON contours + fichier
  ANCT/INSEE » du brief : l'API Géo publie les données officielles INSEE/IGN sans clé,
  de façon cohérente (pas de jointure fragile entre fichiers). Voir `docs/20-decisions.md`.
- S3 est optionnelle : si indisponible, l'indicateur `kw_par_ve` est NULL et le score est
  renormalisé (voir §5).

## 2. Zone de chargement

- Territoire : un EPCI (code SIREN de l'EPCI), configurable (`--epci CODE` ou `EPCI_CODE`).
- Par défaut (itération 1) : **CC Xaintrie Val'Dordogne** (`200066751`, Corrèze, 30 communes).
- Tampon : les points de charge retenus sont ceux situés dans la **bbox du territoire
  élargie de 40 km** (les communes du territoire sont incluses). Le tampon sert à
  l'indicateur de distance : une commune en bordure d'EPCI peut avoir son point de charge
  le plus proche hors de l'EPCI.
- La base DuckDB contient un territoire à la fois (rebuild complet à chaque
  `npm run ingest`). Le schéma prévoit le multi-territoires (colonne `code_epci`).

## 3. Schéma DuckDB (`data/irve.duckdb`, lecture seule au runtime)

Extension `spatial` chargée (géométries EPSG:4326). Fichier unique, rebuild à chaque ingest.

### Table `bornes` — points de charge (1 ligne = 1 point de charge ouvert au public)

| Colonne | Type | Définition |
|---|---|---|
| `id` | VARCHAR (PK) | Identifiant du point de charge : `id_pdc_itinerance` si renseigné, sinon empreinte `GEN-<md5>` des champs de la ligne |
| `code_insee` | VARCHAR(5) | Code INSEE de la commune (NULL si non vérifié) |
| `commune` | VARCHAR | Nom de la commune (source consolidée) |
| `operateur` | VARCHAR | Nom de l'opérateur |
| `enseigne` | VARCHAR | Nom de l'enseigne |
| `adresse` | VARCHAR | Adresse de la station |
| `puissance_kw` | DOUBLE | Puissance nominale du point de charge (kW) ; NULL si non renseignée |
| `horaires` | VARCHAR | Horaires d'ouverture (texte brut) |
| `geom` | GEOMETRY | Point (lon, lat), EPSG:4326 |
| `source` | VARCHAR | `irve-consolidee` ou `fallback` |

Index spatial RTREE sur `geom`.

### Table `communes_indicateurs` — indicateurs et score par commune (1 ligne = 1 commune de l'EPCI)

| Colonne | Type | Définition |
|---|---|---|
| `code_insee` | VARCHAR(5) (PK) | Code INSEE |
| `commune` | VARCHAR | Nom |
| `code_departement` | VARCHAR | Code département |
| `code_region` | VARCHAR | Code région |
| `code_epci` | VARCHAR | Code SIREN de l'EPCI |
| `epci_nom` | VARCHAR | Nom de l'EPCI |
| `population` | INTEGER | Population légale (INSEE, via API Géo) |
| `superficie_km2` | DOUBLE | Superficie calculée du contour (projection EPSG:2154, arrondie à 0,01 km²) |
| `nb_bornes` | INTEGER | Nombre de stations de recharge dans la commune (regroupement des points de charge d'un même emplacement) |
| `nb_points_charge` | INTEGER | Nombre de points de charge dans la commune |
| `puissance_totale_kw` | DOUBLE | Somme des puissances nominales des points de charge (kW) |
| `points_par_1000_hab` | DOUBLE | `nb_points_charge / population × 1000` (NULL si population ≤ 0) |
| `kw_par_1000_hab` | DOUBLE | `puissance_totale_kw / population × 1000` (NULL si population ≤ 0) |
| `nb_ve` | INTEGER | Voitures particulières rechargeables électriques immatriculées (Agence ORE, dernier trimestre) ; NULL si source indisponible |
| `kw_par_ve` | DOUBLE | `puissance_totale_kw / nb_ve` (NULL si `nb_ve` NULL ou 0) |
| `distance_borne_hors_commune_km` | DOUBLE | Distance à vol d'oiseau (haversine) entre le centroïde de la commune et le point de charge le plus proche situé dans une **autre** commune (NULL si aucun point hors commune dans la zone chargée) |
| `score_equipement` | DOUBLE | Score composite 0–100 (voir §5) ; 100 = la mieux équipée du territoire chargé |
| `rang_sous_equipe` | INTEGER | Rang au sein de l'EPCI, score croissant (1 = la plus sous-équipée) |
| `geom` | GEOMETRY | Contour de la commune, EPSG:4326 |

### Table `meta` — métadonnées de l'ingest (clé / valeur)

| `cle` | `valeur` |
|---|---|
| `date_ingest` | Date ISO de l'ingest |
| `territoire_code_epci` / `territoire_nom` | Territoire chargé |
| `source` | `reseau` ou `fallback` |
| `nb_communes` / `nb_bornes` | Compteurs |
| `url_irve` / `url_ve` | URLs des sources effectivement utilisées |

## 4. Conventions de nettoyage (S1, IRVE)

La source est la consolidation nationale des IRVE **ouvertes au public** (arrêté du
4 mai 2021) : les bornes strictement privées n'y figurent pas par construction. Le
nettoyage applicatif ajoute :

1. **Zone** : coordonnées dans la bbox territoire + tampon 40 km.
2. **Coordonnées valides** : `consolidated_longitude` / `consolidated_latitude` (à défaut,
   parsing de `coordonneesXY` au format `[lon, lat]`) ; lat ∈ [41, 51,5],
   lon ∈ [-5,5, 9,9] (France métropolitaine + Corse) ; exclusion si
   `consolidated_is_lon_lat_correct` = False.
3. **Doublons** : dédoublonnage par `id_pdc_itinerance` (1 ligne = 1 point de charge) ;
   à défaut, par empreinte de la ligne (doublons exacts).
4. **Station** : identifiant `id_station_itinerance` si renseigné (hors « Non concerné »),
   sinon empreinte `(code_insee, coordonnées, opérateur)`.
5. **Puissance** : `puissance_nominale` en kW (schéma v2.3.1) ; valeur non numérique →
   NULL (le point reste compté, hors puissance).
6. **Accès public** : la source étant la consolidation « ouvertes au public », aucune
   exclusion supplémentaire n'est appliquée en itération 1 (voir limites).

## 5. Score composite (0–100)

Normalisation par **percentile de rang** au sein des communes chargées (le territoire en
itération 1 ; la France entière quand l'ingest sera national) :

```
pct(x) = (rang(x) − 1) / (N − 1) × 100        (rang croissant, ex-aequo = même rang)
```

Sous-scores (100 = le mieux loti) :

- `s_points` = pct(`points_par_1000_hab`)
- `s_kw` = pct(`kw_par_1000_hab`)
- `s_ve` = pct(`kw_par_ve`) — NULL si source S3 indisponible
- `s_iso` = 100 − pct(`distance_borne_hors_commune_km`) — une commune isolée (point de
  charge le plus proche hors commune éloigné) est pénalisée. Si aucune distance n'est
  calculable dans la zone, la distance est remplacée par (max observé + 1 km) avant
  percentile.

Pondérations :

```
score = (0,40 × s_points + 0,30 × s_kw + 0,20 × s_ve + 0,10 × s_iso)
        / (somme des poids des sous-scores disponibles)
```

Un sous-score NULL (donnée manquante) est exclu : les poids sont redistribués
proportionnellement (ex. sans S3 : 0,40 / 0,30 / 0,10 renormalisés sur 0,80). Si tous
les sous-scores sont NULL, `score_equipement` = NULL.

Interprétation : **plus le score est bas, plus la commune est sous-équipée**. Le
classement des communes sous-équipées est le tri croissant du score (`rang_sous_equipe`).

#### Seuils de lecture (affichage, PRD §4)

En complément du score, l'indicateur brut `points_par_1000_hab` est affiché avec des
seuils de lecture pour un décideur non technique (persona prioritaire : maire) :

| `points_par_1000_hab` | Lecture |
|---|---|
| < 0,3 | Rouge — sous-équipée |
| 0,3 – 0,6 | Orange — à surveiller |
| > 0,6 | Vert — équipée |

- Ces seuils sont une **couche de lisibilité** : le classement officiel reste le score
  composite ci-dessus.
- Seuils paramétrables envisagés en post-MVP (PRD §4).
- Communes très peu peuplées : l'indicateur est instable (faibles effectifs) → à afficher
  avec une mention de prudence (PRD §4).

## 6. Jeu de secours (`data/fallback/`, versionné)

Si le réseau échoue à l'ingest, l'ETL repart des extraits bruts de la zone,
pré-générés dans le repo :

- `irve_zone.csv` : lignes brutes S1 dans la bbox territoire + tampon (schéma d'origine)
- `communes.geojson` : FeatureCollection S2 du territoire
- `ve_ore_zone.csv` : lignes brutes S3 (filtrées au chargement)
- `meta.json` : provenance (EPCI, date de génération, URLs)

Le pipeline de nettoyage / agrégation / score est strictement identique en mode réseau
et en mode secours.

## 7. Conventions diverses

- Géométries en EPSG:4326 (WGS84) ; superficies en EPSG:2154 (Lambert-93).
- Distances à vol d'oiseau (haversine / `ST_Distance_Sphere`).
- Le runtime applicatif ouvre la base en **lecture seule** et ne télécharge rien.
- `data/cache/` et `data/*.duckdb` ne sont pas versionnés ; `data/fallback/` oui.
