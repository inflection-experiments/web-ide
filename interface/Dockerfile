# Stage 1: Build Stage
FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Runtime Stage
FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install -g pm2

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build

COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
