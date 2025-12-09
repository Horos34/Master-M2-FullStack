/**
 * AnomalyInjector: Injecte des anomalies réalistes (10% du temps)
 * Types d'anomalies:
 * - Perte de puissance (panneau sale, ombrage)
 * - Pics de température (défaut refroidissement)
 * - Défaut onduleur
 * - Sensor malfunction
 */

export interface Anomaly {
  type: "power_loss" | "temperature_spike" | "inverter_failure" | "sensor_error";
  severity: "low" | "medium" | "high";
  description: string;
  affectedMetrics: string[];
}

export class AnomalyInjector {
  private anomalyRate: number; // Probabilité (ex: 0.10 = 10%)
  private currentAnomalies: Map<string, Anomaly> = new Map();

  constructor(anomalyRate: number = 0.10) {
    if (anomalyRate < 0 || anomalyRate > 1) {
      throw new Error("Anomaly rate doit être entre 0 et 1");
    }
    this.anomalyRate = anomalyRate;
  }

  /**
   * Décide si une anomalie doit être injectée
   */
  public shouldInjectAnomaly(): boolean {
    return Math.random() < this.anomalyRate;
  }

  /**
   * Sélectionne un type d'anomalie aléatoire
   */
  private selectAnomalyType(): Anomaly["type"] {
    const types: Anomaly["type"][] = [
      "power_loss",
      "temperature_spike",
      "inverter_failure",
      "sensor_error",
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  /**
   * Génère une anomalie
   */
  public generateAnomaly(): Anomaly {
    const type = this.selectAnomalyType();
    const severity =
      Math.random() < 0.6 ? "low" : Math.random() < 0.9 ? "medium" : "high";

    const anomalyMap: Record<Anomaly["type"], Anomaly> = {
      power_loss: {
        type: "power_loss",
        severity,
        description: `Perte de puissance: ${severity === "high" ? "60-80%" : severity === "medium" ? "30-50%" : "10-20%"}`,
        affectedMetrics: ["power"],
      },
      temperature_spike: {
        type: "temperature_spike",
        severity,
        description: `Pic de température: +${severity === "high" ? 15 : severity === "medium" ? 10 : 5}°C`,
        affectedMetrics: ["panelTemperature"],
      },
      inverter_failure: {
        type: "inverter_failure",
        severity: "high", // Toujours critique
        description: "Défaut onduleur - Perte de production",
        affectedMetrics: ["power", "invertStatus"],
      },
      sensor_error: {
        type: "sensor_error",
        severity: "medium",
        description: "Erreur capteur - Données potentiellement erronées",
        affectedMetrics: ["irradiance", "panelTemperature"],
      },
    };

    return anomalyMap[type];
  }

  /**
   * Applique une anomalie aux métriques
   */
  public applyAnomaly(metrics: any, anomaly: Anomaly): void {
    switch (anomaly.type) {
      case "power_loss":
        const powerLoss =
          anomaly.severity === "high" ? 0.7 : anomaly.severity === "medium" ? 0.4 : 0.15;
        metrics.power *= 1 - powerLoss;
        break;

      case "temperature_spike":
        const tempIncrease = anomaly.severity === "high" ? 15 : anomaly.severity === "medium" ? 10 : 5;
        metrics.panelTemperature += tempIncrease;
        break;

      case "inverter_failure":
        metrics.invertStatus = 0;
        metrics.power *= 0.1; // Production minimale
        break;

      case "sensor_error":
        // Ajouter ±20% de noise aléatoire
        const noise = (Math.random() - 0.5) * 0.4;
        if (anomaly.affectedMetrics.includes("irradiance")) {
          metrics.irradiance *= 1 + noise;
        }
        if (anomaly.affectedMetrics.includes("panelTemperature")) {
          metrics.panelTemperature += noise * 10;
        }
        break;
    }
  }

  /**
   * Vérifie et gère la durée des anomalies
   * (une anomalie dure ~5-10 intervalles = 150-300 secondes)
   */
  public manageAnomalies(): Anomaly | null {
    // Nettoyer les anciennes anomalies
    const now = Date.now();
    for (const [key, anomaly] of this.currentAnomalies) {
      // Les anomalies durent entre 2-5 minutes
      if (now - (anomaly as any).startTime > 300000) {
        this.currentAnomalies.delete(key);
      }
    }

    // Retourner l'anomalie active s'il y en a une
    if (this.currentAnomalies.size > 0) {
      return Array.from(this.currentAnomalies.values())[0];
    }

    return null;
  }
}
