import { MetricsResult } from "../types";

export class MetricsCalculator {
  private panelArea: number; // m²
  private panelEfficiency: number;
  private inverterEfficiency: number;
  private thermalCoefficient: number;

  constructor(
    panelCount: number,
    panelPowerRating: number,
    panelEfficiency: number = 0.22,
    inverterEfficiency: number = 0.98,
    thermalCoefficient: number = -0.004
  ) {
    // Calcul de la surface: considère ~2m² par panel de 400W
    this.panelArea = (panelCount * panelPowerRating) / 200; // m²
    this.panelEfficiency = panelEfficiency;
    this.inverterEfficiency = inverterEfficiency;
    this.thermalCoefficient = thermalCoefficient; // par °C
  }

  /**
   * Calcule l'irradiance solaire avec variation réaliste
   * Simule un cycle jour/nuit + variation nuageuse
   */
  private calculateIrradiance(hour: number): number {
    // Courbe sinusoïdale pour le cycle jour/nuit
    // Maximum vers midi (12:00)
    const baseIrradiance = 1000 * Math.max(0, Math.sin((hour - 6) * Math.PI / 12));

    // Ajouter variabilité aléatoire (nuages, etc.)
    // ±100 W/m² de variation
    const cloudVariation = (Math.random() - 0.5) * 200;

    return Math.max(0, baseIrradiance + cloudVariation);
  }

  /**
   * Calcule la température du panneau
   * Formule: T_panel = T_ambient + ΔT(irradiance)
   * Influence: irradiance, vent, heure de la journée
   */
  private calculatePanelTemperature(
    irradiance: number,
    ambientTemp: number
  ): number {
    // NOCT (Nominal Operating Cell Temperature) effect
    // Augmentation de ~20°C pour 1000 W/m² d'irradiance
    const noctEffect = (irradiance / 1000) * 20;

    // Perte thermique (wind effect) - simulation simplifiée
    const windEffect = Math.random() * 5; // 0-5°C de refroidissement

    // Coefficient thermique (baisse d'efficacité avec température)
    const panelTemp = ambientTemp + noctEffect - windEffect;

    return Math.round(panelTemp * 10) / 10; // Arrondir à 0.1°C
  }

  /**
   * Calcule la puissance instantanée
   * Formule: P = G × A × η_panel × η_inverter
   * G: irradiance (W/m²)
   * A: surface (m²)
   * η: rendements
   */
  private calculatePower(irradiance: number, panelTemp: number): number {
    // Ajuster l'efficacité en fonction de la température
    // Perte d'efficacité: ~0.4% par °C au-dessus de 25°C
    const tempAdjustment =
      1 + this.thermalCoefficient * (panelTemp - 25);

    const adjustedEfficiency = Math.max(0.15, this.panelEfficiency * tempAdjustment);

    // Formule de base: P = G × A × η
    const power =
      irradiance *
      this.panelArea *
      adjustedEfficiency *
      this.inverterEfficiency;

    return Math.round(power); // Watts
  }

  /**
   * Génère les métriques complètes pour un instant T
   */
  public generateMetrics(currentHour: number): MetricsResult {
    const timestamp = Date.now();

    // 1. Irradiance solaire (W/m²)
    const irradiance = this.calculateIrradiance(currentHour);

    // 2. Température du panneau (°C)
    // Température ambiante moyenne: 15°C (peut varier 10-30°C)
    const ambientTemp = 15 + Math.sin(currentHour * Math.PI / 12) * 10;
    const panelTemperature = this.calculatePanelTemperature(
      irradiance,
      ambientTemp
    );

    // 3. Puissance instantanée (Watts)
    const power = this.calculatePower(irradiance, panelTemperature);

    // 4. État de l'onduleur (1=OK, 0=défaut)
    // Taux de défaut très faible dans la réalité (~0.1%)
    const invertStatus = Math.random() < 0.999 ? (1 as const) : (0 as const);

    // 5. Revenu journalier estimé (€)
    // Prix moyen du kWh: 0.15€ (marché France)
    // Calcul: Power(kW) × Durée(h) × Prix(€/kWh)
    const electricityPrice = 0.15; // €/kWh
    const dailyRevenue = (power / 1000) * electricityPrice; // Pour 1 seconde

    return {
      timestamp,
      irradiance: Math.round(irradiance * 10) / 10,
      panelTemperature,
      power,
      invertStatus,
      dailyRevenue,
    };
  }
}
