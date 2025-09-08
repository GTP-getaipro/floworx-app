# Multi-stage build for Floworx SaaS application
FROM node:20-alpine AS frontend-builder

# Set working directory for frontend build
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install ALL dependencies (including dev deps needed for build)
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build the React application with memory optimization
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S floworx -u 1001

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy backend package files and install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && \
    npm pkg delete scripts.prepare && \
    npm ci --omit=dev && \
    npm cache clean --force

# Copy backend source code
COPY backend/ ./backend/

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Copy other necessary files
COPY shared/ ./shared/
COPY database/ ./database/

# Add environment validation directly in the CMD

# Set ownership to non-root user
RUN chown -R floworx:nodejs /app
USER floworx

# Expose port
EXPOSE 5000


# Copy other necessary files
COPY shared/ ./shared/
COPY database/ ./database/

# ---- ADD THESE TWO LINES ----
# Copy the startup script and make it executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set ownership to non-root user
RUN chown -R floworx:nodejs /app
USER floworx


# Health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with memory optimization and better error handling
CMD ["node", "--max-old-space-size=512", "--unhandled-rejections=strict", "backend/server.js"]
