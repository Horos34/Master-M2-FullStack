# Builder
FROM node:20-alpine3.23 AS builder

WORKDIR /app

COPY package*.json ./
# On ne peut pas clean install sans package-lock.json 
RUN npm i
COPY . .
RUN npm run build

# Stage deploy
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Suppr user nginx + utilisation d'un non-root
RUN addgroup -g 1001 -S appgroup && \
    adduser -S -D -H -u 1001 -h /tmp -s /sbin/nologin -G appgroup -g appgroup appuser && \
    chown -R appuser:appgroup /var/cache/nginx /usr/share/nginx/html /var/log/nginx

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
