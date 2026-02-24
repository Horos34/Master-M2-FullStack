FROM node:20-alpine3.23

# Création user non-root
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./

# On ne peut pas clean install sans package-lock.json 
RUN npm i --only=production --no-optional --no-audit && \
    npm cache clean --force
COPY --chown=appuser:appgroup . .
USER appuser
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
CMD ["node", "server.js"]