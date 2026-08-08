# ==============================================================================
# Stage 1: Build Vite Production Bundle
# ==============================================================================
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build PWA bundle
COPY . .
RUN npm run build

# ==============================================================================
# Stage 2: Production Nginx Server
# ==============================================================================
FROM nginx:alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy Nginx config & static dist bundle
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist .

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
