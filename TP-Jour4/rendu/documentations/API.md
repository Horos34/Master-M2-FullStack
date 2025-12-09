# Solar Simulator API

## 1. Introduction

- Nom : Solar Simulator API  
- Description : API HTTP qui simule 3 fermes solaires et expose leurs métriques au format Prometheus.  
- Base URL (en local via Docker) : `http://localhost:9090`  

Les métriques sont régénérées toutes les 30 secondes, avec environ 10 % d’anomalies aléatoires sur la production, la température ou l’onduleur.

---

## 2. Endpoints

### 2.1. GET `/health`

- Description : Vérifie que l’application est vivante et prête.
- Réponse :
  - `200 OK` si le service est opérationnel.

**Exemple de réponse :**

```
{
  "status": "healthy",
  "timestamp": "2025-12-09T11:00:00.000Z",
  "uptime": 123.45
}
```

---

### 2.2. GET `/metrics`

- Description : Expose les métriques de simulation au format texte Prometheus.
- Content-Type : `text/plain; charset=utf-8`
- Utilisation : endpoint à scraper par Prometheus (toutes les 30 secondes par exemple).

**Exemples de métriques exposées :**

HELP solar_power_watts Production électrique instantanée
TYPE solar_power_watts gauge
solar_power_watts{farm="provence",panel_id="P001"} 385.2

HELP solar_irradiance_wm2 Irradiance solaire mesurée
TYPE solar_irradiance_wm2 gauge
solar_irradiance_wm2{farm="provence"} 850.5

HELP solar_panel_temperature_celsius Température du panneau
TYPE solar_panel_temperature_celsius gauge
solar_panel_temperature_celsius{farm="provence",panel_id="P001"} 42.3

HELP solar_inverter_status État de l'onduleur (1=OK, 0=KO)
TYPE solar_inverter_status gauge
solar_inverter_status{farm="provence",inverter_id="INV01"} 1

HELP solar_daily_revenue_euros Revenus journaliers estimés
TYPE solar_daily_revenue_euros counter
solar_daily_revenue_euros{farm="provence"} 1250.80

--- 

### 2.3. GET `/info`

- Description : Retourne l’état courant du simulateur et un résumé des fermes solaires.
- Réponse :
  - `200 OK` avec un JSON listant les fermes, leurs caractéristiques et les dernières métriques générées.

**Exemple de réponse :**

```
{
  "simulator": "Solar Farm Simulator v1.0",
  "uptime": 120.5,
  "metricsInterval": 30000,
  "farms": [
    {
      "name": "Provence Solar Farm",
      "location": "Provence, France",
      "panels": 1000,
      "inverters": 3,
      "lastMetrics": {
        "timestamp": 1733742000000,
        "irradiance": 850.5,
        "panelTemperature": 42.3,
        "power": 385200,
        "invertStatus": 1,
        "dailyRevenue": 12.52
      },
      "currentAnomaly": null
    }
  ]
}

---

### 2.4. GET `/api/farms/{farmName}/metrics`

- Description : Retourne les dernières métriques simulées pour une ferme donnée au format JSON.
- Paramètres :
  - `farmName` (path) : identifiant de la ferme, par exemple :
    - `provence`
    - `aquitaine`
    - `brittany`
- Réponses :
  - `200 OK` si la ferme existe.
  - `404 Not Found` si `farmName` n’existe pas.

**Exemple de requête :**
``` GET /api/farms/provence/metrics ```


**Exemple de réponse :**

```
{
  "timestamp": 1733742000000,
  "irradiance": 850.5,
  "panelTemperature": 42.3,
  "power": 385200,
  "invertStatus": 1,
  "dailyRevenue": 12.52
}
```

---

## 3. Démarrage & utilisation

### 3.1. Démarrage en local (sans Docker)

```
npm install
npm run build
node dist/index.js
```

- API disponible sur `http://localhost:9090`.

### 3.2. Démarrage avec Docker

```
docker build -t solar-simulator:latest .
docker run -p 9090:9090 solar-simulator:latest
```


---

## 4. Notes

- L’API est conçue pour être scrappée par Prometheus via `/metrics`.
- Les métriques sont rafraîchies toutes les 30 secondes.
- Des anomalies (pannes onduleur, pertes de puissance, pics de température, etc.) sont injectées environ 10 % du temps pour tester la supervision.
