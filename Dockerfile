# Multi-stage build for FloWorx - FORCE DOCKER MODE
FROM node:20-alpine AS base

# Install bash and other necessary tools
RUN apk add --no-cache bash curl git

# Set environment variables to prevent browser downloads
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
ENV NODE_ENV=production

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
COPY package*.json ./

# Install dependencies with browser skip flags
RUN cd backend && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev
RUN cd frontend && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci

# Build frontend
FROM base AS frontend-builder
WORKDIR /app
COPY frontend/ ./frontend/
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules

# Set production environment for build
ENV NODE_ENV=production
ENV REACT_APP_API_URL=https://app.floworx-iq.com
ENV GENERATE_SOURCEMAP=false
ENV CI=false

RUN cd frontend && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy backend files
COPY backend/ ./backend/
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy shared utilities
COPY shared/ ./shared/

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy API files for serverless functions
COPY api/ ./api/

# Copy startup script
COPY start.sh ./start.sh

# Set permissions
RUN chmod +x ./start.sh && chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 5001

# Health check - Use /health endpoint for Docker/Traefik
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5001/health || exit 1

CMD ["./start.sh"]