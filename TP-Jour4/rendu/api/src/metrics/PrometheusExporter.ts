/**
 * PrometheusExporter: Expose les métriques au format Prometheus
 * Standard: format texte Prometheus compatible avec Scraper Prometheus
 * 
 * Types de métriques:
 * - Gauge: Valeur instantanée (température, irradiance, puissance)
 * - Counter: Valeur cumulée (revenu journalier, énergie total)
 * - Histogram/Summary: Distribution (non utilisées ici)
 */

import { Counter, Gauge, Registry } from "prom-client";
import { MetricsResult } from "../types";

export class PrometheusExporter {
  private registry: Registry;

  // Gauges - valeurs instantanées
  private powerGauge: Gauge<string>;
  private irradianceGauge: Gauge<string>;
  private temperatureGauge: Gauge<string>;
  private inverterStatusGauge: Gauge<string>;

  // Counters - valeurs cumulées
  private dailyRevenueCounter: Counter<string>;

  // Métriques système
  private scrapeSuccessGauge: Gauge<string>;
  private scrapeErrorsGauge: Counter<string>;

  constructor() {
    // Créer un registre personnalisé pour isoler les métriques
    this.registry = new Registry();

    // ============ GAUGES ============

    // Power instantanée par panneau
    this.powerGauge = new Gauge({
      name: "solar_power_watts",
      help: "Production électrique instantanée (Watts)",
      labelNames: ["farm", "panel_id"],
      registers: [this.registry],
    });

    // Irradiance solaire
    this.irradianceGauge = new Gauge({
      name: "solar_irradiance_wm2",
      help: "Irradiance solaire mesurée (W/m²)",
      labelNames: ["farm"],
      registers: [this.registry],
    });

    // Température du panneau
    this.temperatureGauge = new Gauge({
      name: "solar_panel_temperature_celsius",
      help: "Température du panneau solaire (°C)",
      labelNames: ["farm", "panel_id"],
      registers: [this.registry],
    });

    // État de l'onduleur
    this.inverterStatusGauge = new Gauge({
      name: "solar_inverter_status",
      help: "État de l'onduleur (1=OK, 0=KO)",
      labelNames: ["farm", "inverter_id"],
      registers: [this.registry],
    });

    // ============ COUNTERS ============

    // Revenu journalier estimé (counter car valeur cumulative)
    this.dailyRevenueCounter = new Counter({
      name: "solar_daily_revenue_euros",
      help: "Revenus journaliers estimés (€) - Counter cumulatif",
      labelNames: ["farm"],
      registers: [this.registry],
    });

    // ============ MÉTRIQUES SYSTÈME ============

    this.scrapeSuccessGauge = new Gauge({
      name: "solar_scrape_duration_seconds",
      help: "Durée du scrape des métriques",
      registers: [this.registry],
    });

    this.scrapeErrorsGauge = new Counter({
      name: "solar_scrape_errors_total",
      help: "Nombre total d'erreurs lors du scrape",
      registers: [this.registry],
    });
  }

  /**
   * Met à jour les métriques pour une ferme
   * Appelé à chaque intervalle (30s)
   */
  public updateMetrics(
    farmName: string,
    metrics: MetricsResult,
    panelIds: string[],
    inverterIds: string[]
  ): void {
    try {
      const startTime = performance.now();

      // Mettre à jour les gauges pour chaque panneau
      // Formule: Power par panneau = Power total / nombre de panneaux
      const powerPerPanel = metrics.power / panelIds.length;

      panelIds.forEach((panelId) => {
        this.powerGauge.set(
          { farm: farmName, panel_id: panelId },
          powerPerPanel
        );

        // Temperature et irradiance sont les mêmes pour tous les panneaux
        this.temperatureGauge.set(
          { farm: farmName, panel_id: panelId },
          metrics.panelTemperature
        );
      });

      // Irradiance globale de la ferme
      this.irradianceGauge.set(
        { farm: farmName },
        metrics.irradiance
      );

      // État des onduleurs (répartir la puissance)
      const powerPerInverter = metrics.power / inverterIds.length;
      inverterIds.forEach((inverterId) => {
        // Status: 1 si onduleur OK ET metrics.invertStatus = 1
        const status = metrics.invertStatus === 1 ? 1 : 0;
        this.inverterStatusGauge.set(
          { farm: farmName, inverter_id: inverterId },
          status
        );
      });

      // Revenu journalier (incrémenter le counter)
      this.dailyRevenueCounter.inc(
        { farm: farmName },
        metrics.dailyRevenue
      );

      // Metrics de performance
      const duration = (performance.now() - startTime) / 1000;
      this.scrapeSuccessGauge.set(duration);
    } catch (error) {
      this.scrapeErrorsGauge.inc();
      console.error(`Erreur lors de la mise à jour des métriques: ${error}`);
    }
  }

  /**
   * Retourne les métriques au format Prometheus
   * Appelé par Express lors de GET /metrics
   */
  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Registre pour les tests
   */
  public getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Reset des métriques (utile pour les tests)
   */
  public reset(): void {
    this.registry.resetMetrics();
  }
}
