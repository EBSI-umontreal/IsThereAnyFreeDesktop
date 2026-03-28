# API statistiques

Documentation du module de statistiques JSON de `IsThereAnyFreeDesktop`.

## Emplacement

- Page de visualisation : [index.php](index.php)
- API JSON : [api.php](api.php)

## Principes

- Les réponses sont retournées en JSON.
- Les paramètres sont passés en HTTP GET.
- La source des données est la table de sessions configurée via `$tableSessions` dans [../LAB_config.php](../LAB_config.php).

## Exemples prêts pour Postman

Configuration recommandée dans Postman :

- Méthode : `GET`
- Header : `Accept: application/json`
- Base URL (exemple) : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php`

Tu peux créer une collection "Statistiques API" avec ces requêtes :

### 1) Ping API (sans paramètre)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php`
- Résultat attendu : message d'accueil JSON + actions disponibles

### 2) Temps réel

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?tempsreel=1`

### 3) Par jour (session)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parjour=1&session=H&annee=2026`

### 4) Par jour (dates)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parjour=1&datedebut=2026-03-01&datefin=2026-03-31`

### 5) Par mois (session)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parmois=1&session=A&annee=2025`

### 6) Par semaine (session)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parsemaine=1&session=E&annee=2025`

### 7) Par heure (session)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parheure=1&session=H&annee=2026`

### 8) Erreur de validation (test négatif)

- URL : `https://votresiteweb.com/IsThereAnyFreeDesktop/statistiques/api.php?parjour=1&datedebut=2026-04-30&datefin=2026-04-01`
- Résultat attendu : HTTP `400` + JSON d'erreur (`datedebut` > `datefin`)

Astuce Postman : ajoute une variable d'environnement `{{statsApiBase}}` pour éviter de répéter l'URL de base.

## Sélection de la période

Deux modes sont disponibles et **mutuellement exclusifs**.

### Mode 1 — Intervalle de dates

| Paramètre   | Format       | Description                        |
|-------------|-------------|-------------------------------------|
| `datedebut` | `YYYY-MM-DD` | Date de début incluse              |
| `datefin`   | `YYYY-MM-DD` | Date de fin incluse                |

```
GET api.php?parjour=1&datedebut=2025-01-01&datefin=2025-04-30
```

### Mode 2 — Session académique

| Paramètre | Valeurs acceptées                    | Description        |
|-----------|--------------------------------------|--------------------|
| `session` | `H` / `hiver`, `E` / `ete` / `été`, `A` / `automne` | Session académique |
| `annee`   | entier 2000–2100                     | Année civile       |

Les bornes sont calculées côté serveur :

| Valeur | Alias         | Période                       |
|--------|--------------|-------------------------------|
| `H`    | `hiver`      | 1er janvier → 30 avril        |
| `E`    | `ete`, `été` | 1er mai → 31 août             |
| `A`    | `automne`    | 1er septembre → 31 décembre   |

```
GET api.php?parjour=1&session=H&annee=2025
GET api.php?parmois=1&session=H&annee=2025
GET api.php?parsemaine=1&session=H&annee=2025
GET api.php?parheure=1&session=A&annee=2024
GET api.php?tempsreel=1
```

## Endpoint : statistiques par jour

### Requête

```
GET api.php?parjour=1&datedebut=2026-03-01&datefin=2026-03-31
GET api.php?parjour=1&session=H&annee=2026
```

### Réponse

```json
{
  "ok": true,
  "action": "parjour",
  "parametres": {
    "datedebut": "2026-01-01",
    "datefin": "2026-04-30",
    "session": "H",
    "annee": 2026,
    "tableSessions": "IsThereAnyFreeDesktop_sessions"
  },
  "resume": {
    "nb_jours": 31,
    "nb_sessions_total": 1234,
    "duree_totale_heures": 567.89,
    "duree_moyenne_ponderee_min": 27.61
  },
  "donnees": [
    {
      "jour": "2026-03-01",
      "nb_sessions": 42,
      "duree_moyenne_sec": 1800,
      "duree_moyenne_min": 30,
      "duree_totale_sec": 75600,
      "duree_totale_h": 21
    }
  ]
}
```

> En mode intervalle de dates, `session` et `annee` valent `null` dans `parametres`.

## Endpoint : statistiques par heure

### Requête

```
GET api.php?parheure=1&datedebut=2026-03-01&datefin=2026-03-31
GET api.php?parheure=1&session=E&annee=2025
```

### Réponse

Les 24 heures sont toujours présentes dans `donnees` (valeur `0` si aucune session).

```json
{
  "ok": true,
  "action": "parheure",
  "parametres": {
    "datedebut": "2025-05-01",
    "datefin": "2025-08-31",
    "session": "E",
    "annee": 2025,
    "tableSessions": "IsThereAnyFreeDesktop_sessions"
  },
  "donnees": [
    {
      "heure": "08:00",
      "nb_sessions": 125,
      "duree_moyenne_sec": 2400,
      "duree_moyenne_min": 40
    }
  ]
}
```

## Endpoint : statistiques par mois

### Requête

```
GET api.php?parmois=1&datedebut=2025-01-01&datefin=2025-12-31
GET api.php?parmois=1&session=A&annee=2025
```

### Réponse

La liste des mois est continue entre `datedebut` et `datefin` (mois absents remplis à `0`).

```json
{
  "ok": true,
  "action": "parmois",
  "parametres": {
    "datedebut": "2025-09-01",
    "datefin": "2025-12-31",
    "session": "A",
    "annee": 2025,
    "tableSessions": "IsThereAnyFreeDesktop_sessions"
  },
  "donnees": [
    {
      "mois": "2025-09",
      "nb_sessions": 320,
      "duree_moyenne_sec": 2100,
      "duree_moyenne_min": 35,
      "duree_totale_sec": 672000,
      "duree_totale_h": 186.67
    }
  ]
}
```

## Endpoint : statistiques par jour de semaine

### Requête

```
GET api.php?parsemaine=1&datedebut=2025-01-01&datefin=2025-12-31
GET api.php?parsemaine=1&session=H&annee=2025
```

### Réponse

Les 7 jours sont toujours présents et ordonnés de **Lundi** à **Dimanche** (valeur `0` si aucun enregistrement).

```json
{
  "ok": true,
  "action": "parsemaine",
  "parametres": {
    "datedebut": "2025-01-01",
    "datefin": "2025-04-30",
    "session": "H",
    "annee": 2025,
    "tableSessions": "IsThereAnyFreeDesktop_sessions"
  },
  "donnees": [
    {
      "jour_semaine_idx": 0,
      "jour_semaine": "Lundi",
      "nb_sessions": 220,
      "duree_moyenne_sec": 2400,
      "duree_moyenne_min": 40,
      "duree_totale_sec": 528000,
      "duree_totale_h": 146.67
    }
  ]
}
```

## Endpoint : portrait en direct

### Requête

```
GET api.php?tempsreel=1
```

### Réponse

```json
{
  "ok": true,
  "action": "tempsreel",
  "parametres": {
    "tablePostes": "ebsi",
    "tableSessions": "IsThereAnyFreeDesktop_sessions",
    "heartbeatTimeoutSeconds": 300,
    "asof": "2026-03-27 14:25:10"
  },
  "resume": {
    "postes_total": 60,
    "postes_en_ligne": 48,
    "postes_hors_ligne": 12,
    "sessions_ouvertes": 33,
    "postes_distincts_avec_session_ouverte": 30,
    "sessions_ouvertes_sur_postes_hors_ligne": 2,
    "postes_occupes_en_ligne": 26,
    "taux_occupation_postes_en_ligne": 54.17
  },
  "statuts_postes_en_ligne": {
    "dispo": 18,
    "na": 2,
    "nordp": 2,
    "oqp": 26
  },
  "statuts_postes_hors_ligne": {
    "dispo": 10,
    "nordp": 2
  }
}
```

Notes :
- Un poste est considéré **en ligne** si `last_seen` est dans la fenêtre `heartbeatTimeoutSeconds`.
- `sessions_ouvertes_sur_postes_hors_ligne` aide à détecter les sessions « orphelines ».

## Réponse par défaut (aucun paramètre)

### Requête

```
GET api.php
```

### Réponse

```json
{
  "ok": true,
  "message": "API statistiques prête.",
  "actions": ["parjour", "parheure", "parmois", "parsemaine", "tempsreel"],
  "usage": [
    "?tempsreel=1",
    "?parjour=1&datedebut=YYYY-MM-DD&datefin=YYYY-MM-DD",
    "?parmois=1&session=H|E|A&annee=YYYY",
    "?parsemaine=1&session=H|E|A&annee=YYYY",
    "?parheure=1&session=H|E|A&annee=YYYY"
  ]
}
```

## Erreurs

| Code HTTP | Cause                                                        |
|-----------|--------------------------------------------------------------|
| `400`     | Format de date invalide (`YYYY-MM-DD` attendu)               |
| `400`     | `datedebut` > `datefin`                                      |
| `400`     | Valeur de `session` inconnue                                 |
| `400`     | `annee` absent ou hors plage 2000–2100 (si `session` fourni) |
| `400`     | Action inconnue (ni `parjour`, `parheure`, `parmois`, `parsemaine`, `tempsreel`) |
| `500`     | Erreur serveur durant le calcul                              |

Format de la réponse d'erreur :

```json
{
  "ok": false,
  "error": "Description de l'erreur."
}
```
