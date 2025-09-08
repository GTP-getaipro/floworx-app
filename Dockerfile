# ---- Frontend build stage ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
# Install ALL dependencies for build (dev included)
RUN npm ci

COPY frontend/ ./
# Build the React application with memory optimization
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build


# ---- Production stage ----
FROM node:20-alpine AS production
WORKDIR /app

# Cache busting - force rebuild with timestamp
ARG CACHEBUST=1
ARG BUILD_DATE
RUN echo "Build timestamp: $(date)" > /tmp/buildtime && \
    echo "Build date arg: ${BUILD_DATE}" >> /tmp/buildtime

# Install dependencies needed as root
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S floworx -u 1001

# Copy all application files as root first
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY --from=frontend-builder /app/frontend/build ./frontend/build
COPY backend/ ./backend/
COPY shared/ ./shared/
COPY database/ ./database/
COPY start.sh /app/start.sh

# Install all dependencies
RUN npm ci --only=production && npm cache clean --force
RUN cd backend && \
    npm pkg delete scripts.prepare && \
    npm ci --omit=dev && \
    npm cache clean --force

# Set correct permissions for all files as root
RUN chmod +x /app/start.sh
RUN chown -R floworx:nodejs /app

# ---- Switch to non-root user for security ----
USER floworx

EXPOSE 5000

# Health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application using the startup script
CMD ["/app/start.sh"]
