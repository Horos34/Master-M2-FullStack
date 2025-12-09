/**
 * Point d'entrée principal
 * Configure Express, les endpoints, et démarre le simulateur
 */

import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { PrometheusExporter } from "./metrics/PrometheusExporter";
import { SolarFarmSimulator } from "./simulators/SolarFarm";
import { SIMULATION_CONFIG } from "./config/farms";
import logger from "./utils/logger";

// Charger les variables d'environnement
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.METRICS_PORT || "9090");
const METRICS_INTERVAL = SIMULATION_CONFIG.metricsInterval;

// ============ INITIALISATION ============

// Créer l'exporteur Prometheus
const exporter = new PrometheusExporter();

// Créer et démarrer le simulateur
const simulator = new SolarFarmSimulator(exporter, METRICS_INTERVAL);

// ============ MIDDLEWARE ============

// Logging des requêtes
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ============ ROUTES ============

/**
 * Endpoint Health Check
 * Utilisé par Docker healthcheck et Kubernetes
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * Endpoint Prometheus Metrics
 * Format texte Prometheus pour scraper
 */
app.get("/metrics", async (req: Request, res: Response) => {
  try {
    const metrics = await exporter.getMetrics();
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.send(metrics);
  } catch (error) {
    logger.error("Erreur lors de la récupération des métriques", error);
    res.status(500).json({ error: "Impossible de récupérer les métriques" });
  }
});

/**
 * Endpoint Info (debug)
 * Retourne l'état complet du simulateur
 */
app.get("/info", (req: Request, res: Response) => {
  const farms = simulator.getState();
  const info = Array.from(farms.entries()).map(([key, state]) => ({
    name: state.farmConfig.name,
    location: state.farmConfig.location,
    panels: state.farmConfig.totalPanels,
    inverters: state.farmConfig.inverters.length,
    lastMetrics: state.lastMetrics,
    currentAnomaly: state.currentAnomaly,
  }));

  res.json({
    simulator: "Solar Farm Simulator v1.0",
    uptime: process.uptime(),
    metricsInterval: METRICS_INTERVAL,
    farms: info,
  });
});

/**
 * Endpoint API (debug)
 * Retourne les métriques au format JSON
 */
app.get("/api/farms/:farmName/metrics", (req: Request, res: Response) => {
  const farmName = req.params.farmName.toLowerCase();
  const metrics = simulator.getLastMetrics(farmName);

  if (!metrics) {
    return res.status(404).json({ error: `Ferme ${farmName} non trouvée` });
  }

  res.json(metrics);
});

// Endpoint racine
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "Solar Farm Metrics Simulator",
    version: "1.0.0",
    endpoints: {
      metrics: "GET /metrics (Prometheus format)",
      health: "GET /health (Health check)",
      info: "GET /info (Simulator state)",
      api: "GET /api/farms/:farmName/metrics (JSON format)",
    },
  });
});

// ============ GESTION DES ERREURS ============

app.use((err: any, req: Request, res: Response, next: any) => {
  logger.error("Erreur non traitée", err);
  res.status(500).json({
    error: "Erreur serveur",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============ DÉMARRAGE ============

const server = app.listen(PORT, () => {
  logger.info(`🚀 Serveur démarré sur le port ${PORT}`);
  logger.info(`📊 Metrics disponibles sur http://localhost:${PORT}/metrics`);
  logger.info(`🏥 Health check sur http://localhost:${PORT}/health`);
  logger.info(`📋 Info sur http://localhost:${PORT}/info`);

  // Démarrer le simulateur
  simulator.start();
});

// ============ GRACEFUL SHUTDOWN ============

process.on("SIGTERM", () => {
  logger.info("SIGTERM reçu, arrêt gracieux du serveur...");
  simulator.stop();
  server.close(() => {
    logger.info("Serveur arrêté");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  logger.info("SIGINT reçu, arrêt gracieux du serveur...");
  simulator.stop();
  server.close(() => {
    logger.info("Serveur arrêté");
    process.exit(0);
  });
});

export { app, simulator, exporter };
