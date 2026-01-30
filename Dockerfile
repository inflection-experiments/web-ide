# Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/interface
COPY interface/package*.json ./
RUN npm ci
COPY interface/ ./
RUN npm run build

# Backend stage  
FROM node:18-alpine
RUN apk add --no-cache docker-cli python3 make g++

WORKDIR /app

# Copy and install backend dependencies
COPY server/package*.json ./
RUN npm ci

# Copy TypeScript source files
COPY server/ ./

# Build backend TypeScript
RUN npm run build

# Copy built frontend
COPY --from=frontend-build /app/interface/.svelte-kit/output/client ./public

# Create user data directory
RUN mkdir -p /app/user

EXPOSE 9000

# Run the compiled backend
CMD ["npm", "start"]
