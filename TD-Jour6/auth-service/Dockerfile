FROM node:20-alpine3.23
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser
WORKDIR /app
COPY --chown=appuser:appgroup package*.json ./

RUN npm i --only=production --no-optional --no-audit && \
    npm cache clean --force
COPY --chown=appuser:appgroup . .
USER appuser
EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8081/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
