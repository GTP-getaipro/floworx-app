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

# Create startup script for Supabase connection handling
RUN echo '#!/bin/sh\n\
echo "🚀 Starting Floworx application..."\n\
echo "🔍 Checking environment variables..."\n\
\n\
# Check for required Supabase variables\n\
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then\n\
  echo "⚠️  Warning: SUPABASE_URL or SUPABASE_ANON_KEY not set"\n\
  echo "   Application will use PostgreSQL connection if available"\n\
fi\n\
\n\
# Check for database connection variables\n\
if [ -z "$DB_HOST" ] && [ -z "$SUPABASE_URL" ]; then\n\
  echo "❌ Error: No database configuration found"\n\
  echo "   Please set either DB_HOST or SUPABASE_URL"\n\
  exit 1\n\
fi\n\
\n\
echo "✅ Environment check complete"\n\
echo "⏳ Starting Node.js server..."\n\
exec "$@"' > /app/start.sh && chmod +x /app/start.sh

# Set ownership to non-root user
RUN chown -R floworx:nodejs /app
USER floworx

# Expose port
EXPOSE 5000

# Health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application with startup script and memory optimization
CMD ["/app/start.sh", "node", "--max-old-space-size=512", "--unhandled-rejections=strict", "backend/server.js"]
