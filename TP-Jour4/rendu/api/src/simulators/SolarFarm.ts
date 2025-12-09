/**
 * SolarFarmSimulator: Classe orchestratrice principale
 * Gère les 3 fermes solaires, la génération de métriques,
 * et l'injection d'anomalies
 */

import { FARMS_CONFIG, FarmConfig } from "../config/farms";
import { MetricsCalculator } from "./MetricsCalculator";
import { AnomalyInjector, Anomaly } from "./AnomalyInjector";
import { PrometheusExporter } from "../metrics/PrometheusExporter";
import logger from "../utils/logger";
import { MetricsResult } from "../types";

export interface FarmState {
  farmConfig: FarmConfig;
  calculator: MetricsCalculator;
  anomalyInjector: AnomalyInjector;
  lastMetrics: MetricsResult | null;
  currentAnomaly: Anomaly | null;
}

export class SolarFarmSimulator {
  private farms: Map<string, FarmState> = new Map();
  private exporter: PrometheusExporter;
  private metricsInterval: number;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(exporter: PrometheusExporter, metricsInterval: number = 30000) {
    this.exporter = exporter;
    this.metricsInterval = metricsInterval;

    // Initialiser les 3 fermes
    Object.entries(FARMS_CONFIG).forEach(([farmKey, farmConfig]) => {
      this.initializeFarm(farmKey, farmConfig);
    });

    logger.info(
      `✅ Simulateur initialisé avec ${this.farms.size} fermes solaires`
    );
  }

  /**
   * Initialise une ferme avec ses calculateurs et injecteurs
   */
  private initializeFarm(farmKey: string, farmConfig: FarmConfig): void {
    const panelIds = Array.from({ length: farmConfig.totalPanels },
      (_, i) => `P${String(i + 1).padStart(3, "0")}`
    );

    const state: FarmState = {
      farmConfig,
      calculator: new MetricsCalculator(
        farmConfig.totalPanels,
        farmConfig.panelPowerRating,
        0.22, // Efficacité panneau standard
        farmConfig.inverters[0]?.efficiency || 0.98,
        -0.004 // Coefficient thermique
      ),
      anomalyInjector: new AnomalyInjector(0.10), // 10% d'anomalies
      lastMetrics: null,
      currentAnomaly: null,
    };

    this.farms.set(farmKey, state);

    logger.info(
      `🌞 Ferme ${farmConfig.name} initialisée: ${farmConfig.totalPanels} panneaux, ` +
      `${farmConfig.inverters.length} onduleurs`
    );
  }

  /**
   * Démarre la génération des métriques (intervalle 30s)
   */
  public start(): void {
    if (this.intervalId) {
      logger.warn("Le simulateur est déjà en cours d'exécution");
      return;
    }

    this.intervalId = setInterval(() => {
      this.generateAllMetrics();
    }, this.metricsInterval);

    logger.info(`🚀 Génération de métriques démarrée (intervalle: ${this.metricsInterval}ms)`);
  }

  /**
   * Arrête la génération des métriques
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info("⏸️  Génération de métriques arrêtée");
    }
  }

  /**
   * Génère les métriques pour toutes les fermes
   */
  private generateAllMetrics(): void {
    const timestamp = new Date();
    const currentHour = timestamp.getHours() +
      timestamp.getMinutes() / 60 +
      timestamp.getSeconds() / 3600;

    this.farms.forEach((state, farmKey) => {
      // 1. Générer les métriques brutes
      const metrics = state.calculator.generateMetrics(currentHour);

      // 2. Vérifier les anomalies existantes
      const existingAnomaly = state.anomalyInjector.manageAnomalies();
      if (existingAnomaly) {
        state.currentAnomaly = existingAnomaly;
        state.anomalyInjector.applyAnomaly(metrics, existingAnomaly);
      } else if (state.anomalyInjector.shouldInjectAnomaly()) {
        // 3. Injecter une nouvelle anomalie (10% du temps)
        const newAnomaly = state.anomalyInjector.generateAnomaly();
        state.currentAnomaly = newAnomaly;
        state.anomalyInjector.applyAnomaly(metrics, newAnomaly);

        logger.warn(
          `⚠️  [${state.farmConfig.name}] Anomalie injectée: ${newAnomaly.description}`
        );
      } else {
        state.currentAnomaly = null;
      }

      // 4. Mise à jour des métriques Prometheus
      const panelIds = Array.from({ length: state.farmConfig.totalPanels },
        (_, i) => `P${String(i + 1).padStart(3, "0")}`
      );

      this.exporter.updateMetrics(
        farmKey,
        metrics,
        panelIds.slice(0, 5), // Afficher seulement les 5 premiers panneaux
        state.farmConfig.inverters.map((inv) => inv.id)
      );

      // 5. Logging structuré
      state.lastMetrics = metrics;
      this.logFarmMetrics(farmKey, state);
    });
  }

  /**
   * Logging structuré des métriques
   */
  private logFarmMetrics(farmKey: string, state: FarmState): void {
    const metrics = state.lastMetrics;
    if (!metrics) return;

    const logData = {
      farm: state.farmConfig.name,
      power_watts: metrics.power,
      irradiance_wm2: metrics.irradiance,
      temperature_celsius: metrics.panelTemperature,
      inverter_status: metrics.invertStatus === 1 ? "OK" : "KO",
      daily_revenue_eur: metrics.dailyRevenue.toFixed(2),
      anomaly: state.currentAnomaly?.description || "None",
    };

    if (state.currentAnomaly) {
      logger.warn(`[${farmKey.toUpperCase()}]`, logData);
    } else {
      logger.info(`[${farmKey.toUpperCase()}]`, logData);
    }
  }

  /**
   * Récupère l'état complet (pour debug)
   */
  public getState(): Map<string, FarmState> {
    return this.farms;
  }

  /**
   * Récupère les dernières métriques d'une ferme
   */
  public getLastMetrics(farmName: string): MetricsResult | null {
    return this.farms.get(farmName)?.lastMetrics || null;
  }
}
