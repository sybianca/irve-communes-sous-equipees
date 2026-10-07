# Personas — EVChargeSync

*Mistral Builder Night · Défi A11 Énergie & mobilité*

> **Pourquoi cela compte pour les services publics ?**
> Parce qu'une borne mal placée coûte autant qu'une borne bien placée. EVChargeSync aide chaque acteur public à décider, à justifier et à suivre ses investissements de recharge à partir de données ouvertes.

---

## Vue d'ensemble

| Persona | Rôle | Question clé | Périmètre |
|---|---|---|---|
| 🏛️ **Claire Morel** | Vice-présidente mobilité d'un EPCI | « Quelle commune équiper en priorité, et comment le justifier ? » | **MVP – cible prioritaire** |
| 🎗️ **Bernard Lefèvre** | Maire d'une commune rurale | « Pourquoi pas ma commune ? » | **MVP** |
| 🛠️ **Karim Benali** | Chargé de mission mobilité / syndicat d'énergie | « Comment préparer le SDIRVE et les dossiers de subvention ? » | **MVP + 3 mois** |
| 📐 **Sophie Garnier** | Urbaniste / planificatrice territoriale | « Combien de points de charge faudra-t-il en 2030 ? » | **6 à 12 mois** |
| 🚗 **Lucas Martin** | Habitant sans parking privé | « Ma commune va-t-elle s'équiper ? » | **Au-delà** |

---

## 🏛️ Persona 1 — Claire Morel, élue mobilité de l'EPCI *(cible prioritaire)*

> *« Je dois justifier chaque euro dépensé. Il me faut des arguments, pas des impressions. »*

### Profil
- **Fonction** : vice-présidente en charge de la mobilité d'une communauté de communes (25 communes, ~40 000 habitants)
- **Contexte** : un budget annuel pour une douzaine de points de charge, cinq maires qui réclament chacun « leur » borne
- **Rapport au numérique** : à l'aise avec les outils bureautiques, aucune compétence data

### Irritants
- Arbitrages faits au ressenti, contestés en conseil communautaire
- Données dispersées (IRVE, INSEE, SDES) qu'elle ne sait pas croiser
- Pas de définition partagée du « sous-équipement »

### Ce qu'EVChargeSync lui apporte
- ✅ **Des décisions transparentes** : un classement objectif des communes, avec un critère explicite qu'elle choisit (habitants, VE, puissance)
- ✅ **Une simulation budgétaire** : la répartition de son budget qui réduit le plus les écarts
- ✅ **Une note de décision** : chiffrée, sourcée, prête pour le conseil communautaire

### Scénario d'usage
> Claire demande : *« J'ai le budget pour 12 points de charge, où les mettre ? »*
> L'agent propose 4 communes, explique pourquoi (ratio sous la médiane de l'EPCI, nombre de VE en hausse) et rédige la note pour le prochain conseil.

### Indicateur de succès
Une décision votée sans contestation sur le fond, préparée en moins d'une heure.

---

## 🎗️ Persona 2 — Bernard Lefèvre, maire d'une petite commune

> *« Mes administrés me demandent une borne depuis deux ans. Je veux comprendre où nous en sommes. »*

### Profil
- **Fonction** : maire d'une commune de 900 habitants, sans service technique dédié
- **Contexte** : aucun point de charge public, de plus en plus d'habitants équipés de VE
- **Rapport au numérique** : faible, privilégie les documents courts et clairs

### Irritants
- Le sentiment d'être oublié face aux communes plus peuplées
- Aucun moyen de comparer sa commune à ses voisines
- Ne sait pas à quelles subventions prétendre

### Ce qu'EVChargeSync lui apporte
- ✅ **Une réponse factuelle** à « pourquoi pas ma commune ? », positionnée par rapport à la médiane de l'EPCI
- ✅ **Un levier pour les subventions** : un diagnostic chiffré qui renforce un dossier (programme Advenir, région, fonds européens)
- ✅ **Un outil de communication** : une fiche commune claire à partager avec ses administrés

### Scénario d'usage
> *« Votre commune compte 0 point de charge pour 900 habitants, contre 1,7 pour 1 000 habitants en médiane dans l'EPCI. Elle fait partie des 5 communes prioritaires du scénario retenu. »*

### Indicateur de succès
Le maire comprend la décision, même quand sa commune n'est pas retenue cette année.

---

## 🛠️ Persona 3 — Karim Benali, chargé de mission mobilité

> *« Je passe des jours à consolider des tableurs avant chaque comité. »*

### Profil
- **Fonction** : chargé de mission mobilité dans un syndicat départemental d'énergie
- **Contexte** : porte le schéma directeur IRVE (SDIRVE) et les dossiers de financement
- **Rapport au numérique** : bon niveau Excel, notions de SIG, pas de développement

### Irritants
- Fichier IRVE brut : doublons, codes INSEE manquants, coordonnées erronées
- Recalcul manuel à chaque nouvelle hypothèse
- Exports à remettre en forme pour chaque élu

### Ce qu'EVChargeSync lui apporte
- ✅ **Des données nettoyées et sourcées**, avec la date de chaque jeu de données
- ✅ **Un diagnostic exportable** pour le SDIRVE et les dossiers de subvention
- ✅ **Des alertes de fiabilité** : l'agent signale les ratios peu robustes (petites communes, données manquantes)

### Scénario d'usage
> Karim lance le diagnostic sur les 12 EPCI du département, exporte le classement et la carte, et les intègre directement au document SDIRVE.

### Indicateur de succès
Un diagnostic départemental en quelques minutes au lieu de plusieurs jours.

---

## 📐 Persona 4 — Sophie Garnier, urbaniste *(extension)*

> *« Anticiper, c'est économiser. Je dois raisonner à horizon 2030. »*

### Profil
- **Fonction** : urbaniste dans le service aménagement d'une agglomération
- **Contexte** : prépare le PLUi et les grands projets d'aménagement
- **Rapport au numérique** : utilisatrice avancée de SIG (QGIS)

### Irritants
- Aucune projection fiable des besoins en recharge
- Planification de la recharge déconnectée des projets urbains

### Ce qu'EVChargeSync lui apportera
- ✅ **Un simulateur de croissance** fondé sur l'évolution du parc de VE et de la population
- ✅ **Des scénarios « et si ? »** : comparer plusieurs stratégies d'implantation
- ✅ **Une intégration SIG** (QGIS / ArcGIS) pour croiser avec les projets urbains

### Scénario d'usage
> *« Si le parc de VE de l'agglomération suit la tendance nationale, combien de points de charge faut-il ajouter chaque année pour rester au niveau de la médiane départementale ? »*

### Indicateur de succès
Le besoin en recharge est intégré dès la conception des projets d'aménagement.

---

## 🚗 Persona 5 — Lucas Martin, habitant *(vision long terme)*

> *« Je n'ai pas de garage. Sans borne près de chez moi, je ne peux pas passer à l'électrique. »*

### Profil
- **Situation** : habite en centre-bourg, stationnement sur voirie
- **Contexte** : hésite à acheter un VE faute de solution de recharge à proximité

### Irritants
- Ne sait pas si sa commune prévoit d'installer des bornes
- Aucun canal pour exprimer son besoin

### Ce qu'EVChargeSync lui apportera
- ✅ **De la transparence** : consulter le diagnostic de sa commune et les projets votés
- ✅ **Un canal de retour** : signaler un besoin, qui alimente la priorisation de l'EPCI

> ℹ️ EVChargeSync ne cherche pas à concurrencer les applications de localisation de bornes (Chargemap, etc.). Le citoyen est ici **contributeur et bénéficiaire de la transparence**, pas utilisateur d'une carte de recharge.

---

## Synthèse : priorisation des personas

| Horizon | Personas servis | Fonctionnalités clés |
|---|---|---|
| **Hackathon (MVP)** | Claire, Bernard, Karim (partiel) | Diagnostic, classement, simulation budgétaire, note de décision, réponse aux maires |
| **3 mois** | Karim | Tous les EPCI, export PDF, indicateur composite |
| **6 à 12 mois** | Sophie | Projections 2030, intégration SIG, API ouverte |
| **Au-delà** | Lucas | Suivi des projets, retours citoyens |

**Fil rouge de la démo** : Claire pose la question, Bernard reçoit la réponse. C'est la scène « trois maires, un budget » qui porte le pitch.
