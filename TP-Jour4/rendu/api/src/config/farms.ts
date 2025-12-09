/**
 * Configuration des 3 fermes solaires avec leurs caractéristiques
 * Implémente les bonnes pratiques de gestion de configuration
 */

export interface FarmConfig {
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  totalPanels: number;
  panelPowerRating: number; // kW
  inverters: InverterConfig[];
}

export interface InverterConfig {
  id: string;
  capacity: number; // kW
  efficiency: number; // %
}

export interface PanelConfig {
  id: string;
  efficiency: number; // %
  thermalCoefficient: number; // %/°C
}

// Configuration production-ready avec données réalistes
export const FARMS_CONFIG: Record<string, FarmConfig> = {
  provence: {
    name: "Provence Solar Farm",
    location: "Provence, France",
    latitude: 43.9352,
    longitude: 6.6245,
    totalPanels: 1000,
    panelPowerRating: 400, // Watts per panel
    inverters: [
      { id: "INV01", capacity: 100, efficiency: 98.2 },
      { id: "INV02", capacity: 100, efficiency: 98.2 },
      { id: "INV03", capacity: 100, efficiency: 97.9 },
    ],
  },
  aquitaine: {
    name: "Aquitaine Solar Farm",
    location: "Aquitaine, France",
    latitude: 44.2366,
    longitude: -0.5592,
    totalPanels: 750,
    panelPowerRating: 420,
    inverters: [
      { id: "INV01", capacity: 80, efficiency: 98.5 },
      { id: "INV02", capacity: 80, efficiency: 98.3 },
    ],
  },
  brittany: {
    name: "Brittany Solar Farm",
    location: "Brittany, France",
    latitude: 47.5625,
    longitude: -3.0077,
    totalPanels: 600,
    panelPowerRating: 380,
    inverters: [
      { id: "INV01", capacity: 60, efficiency: 98.1 },
      { id: "INV02", capacity: 60, efficiency: 97.8 },
    ],
  },
};

// Paramètres de simulation
export const SIMULATION_CONFIG = {
  metricsInterval: parseInt(process.env.METRICS_INTERVAL_MS || "30000"),
  anomalyRate: 0.10, // 10% d'anomalies
  timeZone: "Europe/Paris",
};
