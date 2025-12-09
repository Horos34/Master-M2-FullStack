/**
 * Logger structuré avec Winston
 * Format JSON pour intégration avec ELK/Datadog
 */

import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: "solar-simulator" },
  transports: [
    // Console en développement
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) =>
            `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""
            }`
        )
      ),
    }),
  ],
});

export default logger;
