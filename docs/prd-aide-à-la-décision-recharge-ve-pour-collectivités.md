# PRD — Application d'aide à la décision pour l'implantation de bornes de recharge VE

## 1. Contexte et problème

La France accélère le déploiement des infrastructures de recharge pour véhicules électriques (IRVE), mais celui-ci reste inégalement réparti sur le territoire. Les collectivités territoriales manquent d'outils simples pour :

- identifier objectivement les communes **sous-équipées** en points de recharge ;
- prioriser leurs investissements et leurs demandes de subventions (Ademe, programme d'investissement d'avenir) ;
- argumenter leurs décisions face aux élus et aux citoyens.

Les données publiques existantes (base IRVE consolidée de transport.data.gouv.fr, populations légales Insee) sont dispersées et brutes : aucune interface ne combine simplement « population » et « points de recharge » à l'échelle communale.

## 2. Objectifs

| Objectif | Indicateur de succès |
|---|---|
| Identifier les communes sous-équipées | Liste fiable des communes triées par indicateurs |
| Fournir un outil simple et accessible | Utilisable sans expertise data (< 5 min pour obtenir une réponse) |
| S'appuyer sur des données officielles | Sources data.gouv.fr / Insee, Licence Ouverte |
| Déployer rapidement (hackathon) | MVP fonctionnel en 48 h |

**Non-objectifs (v1) :** prévision de la demande, plan de financement, données temps réel de disponibilité des bornes, exhaustive multi-pays.

## 3. Cibles utilisateurs

1. **Agent technique / bureau des mobilités** d'une collectivité — cas d'usage principal : « quelles communes de mon territoire prioriser ? »
2. **Élu local** — visualisation simple, chiffres communicables.
3. **Bureau d'études / aménageurs** — export de données pour analyses approfondies.

## 4. Indicateur métier

**Densité de recharge** = points de recharge ÷ population × 1 000 (points pour 1 000 habitants)

Compléments prévus :
- comptage par type de puissance (accélérée / rapide) — la base IRVE le permet ;
- seuil de sous-équipement paramétrable (v1 : < 0,3 rouge, 0,3–0,6 orange, > 0,6 vert) ;
- cas particulier des communes très peu peuplées (faibles effectifs → indicateur instable, à afficher avec précaution).

## 5. Périmètre fonctionnel

### MVP (hackathon)
- **F1 — Tableau comparatif** : commune, population, points de recharge, points / 1 000 hab., trié du moins équipé au mieux équipé. ✅ fait (données fictives)
- **F2 — Données réelles** : pipeline d'agrégation IRVE × population Insee (jointure par code INSEE), CSV agrégé. ✅ script écrit
- **F3 — Filtres** : département, EPCI, taille de commune, recherche par nom.

### Post-MVP
- **F4 — Carte choroplèthe** communale avec légende par seuil (PMTiles data.gouv disponibles).
- **F5 — Détail de commune** : répartition puissance, opérateurs, distance aux communes équipées voisines.
- **F6 — Export** CSV / PDF de la liste priorisée.
- **F7 — Scénarios** : simulation d'ajout de bornes et impact sur le classement.

## 6. Sources de données

| Donnée | Source | Format | Mise à jour |
|---|---|---|---|
| Points de recharge | Base nationale consolidée IRVE (statique), transport.data.gouv.fr | CSV ~122 Mo, schéma etalab v2.3.1 | Quotidienne |
| Population légale | Populations de référence Insee (2023) | CSV/zip via data.gouv.fr | Annuelle |
| Découpage communal | Découpage administratif data.gouv.fr | GeoJSON | Annuelle |

Licence : Licence Ouverte / Open Licence (Etalab) — mention de la source obligatoire.

## 7. Architecture technique (v1)

- **Front** : application web légère (tableau + filtres), rendu côté client.
- **Pipeline** : script Python (pandas) qui télécharge, agrège et produit `communes_irve.csv` — exécuté périodiquement (pas de chargement du CSV de 122 Mo côté client).
- **Données servies** : fichier agrégé statique (ou petit endpoint) contenant ~34 000 lignes.

## 8. Critères d'acceptation (MVP)

- [ ] Le tableau affiche l'indicateur correct points / 1 000 hab. pour 10 communes fictives ✅
- [ ] Le tri va du moins équipé au mieux équipé ✅
- [ ] Le script produit un CSV complet joint par code INSEE, communes sans borne incluses (0)
- [ ] Les seuils couleur s'affichent correctement
- [ ] Filtre par département fonctionnel
- [ ] Mention des sources et de la licence visible dans l'interface ✅

## 9. Risques et mitigations

| Risque | Mitigation |
|---|---|
| Qualité hétérogène de la base IRVE (doublons, `nb_pdc` par défaut) | Nettoyage au pipeline, comparaison comptage lignes vs `nb_pdc` |
| Indicateur instable pour petites communes | Affichage conditionnel / pondération population |
| Volume du CSV IRVE | Agrégation côté serveur, jamais exposé au navigateur |
| Dépendance aux URLs distantes | Snapshot local du CSV agrégé, rafraîchi périodiquement |

## 10. Roadmap indicative

- **Sprint hackathon** : F1–F3 (tableau, données réelles, filtres) + démo
- **V1 (1 mois)** : F4 carte, F6 export
- **V2** : F5 détail commune, F7 scénarios, comptes utilisateurs collectivités