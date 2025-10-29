# ---- Build Stage ----
FROM node:24.8-alpine3.21 AS builder
WORKDIR /app

RUN apk add --no-cache docker-cli

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:24.8-alpine3.21 AS runtime
WORKDIR /app

RUN apk add --no-cache aws-cli \
 && rm -rf /var/cache/apk/*

RUN npm install -g pm2

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY Dockerfile.user ./

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 9000
ENTRYPOINT ["./entrypoint.sh"]
