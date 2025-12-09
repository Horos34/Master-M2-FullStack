/**
 * MetricsCalculator: Implémente les formules physiques réalistes
 * Calculs basés sur les standards de l'industrie solaire
 * 
 * Formules:
 * - Power = Irradiance × Panel_Area × Efficiency × Inverter_Efficiency
 * - Temperature = Ambient + (Irradiance × 0.02) - Wind_Effect
 * - Daily_Revenue = Power_Total × Electricity_Price × Hours
 */

export interface MetricsResult {
  timestamp: number;
  irradiance: number; // W/m²
  panelTemperature: number; // °C
  power: number; // Watts
  invertStatus: 1 | 0;
  dailyRevenue: number; // Euros
}