#!/bin/sh

# This script ensures essential environment variables are set
# before starting the Node.js application.

# --- Environment Variable Validation ---
# Exit if any of these critical variables are not set.
# The ':-' syntax provides a default error message.
: "${SUPABASE_URL:?SUPABASE_URL must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"
: "${NODE_ENV:?NODE_ENV must be set}"

# Redis is optional - check if REDIS_URL is provided
if [ -n "$REDIS_URL" ]; then
  echo "✅ Redis configuration found via REDIS_URL"
elif [ -n "$REDIS_HOST" ] && [ -n "$REDIS_PORT" ]; then
  echo "✅ Redis configuration found via individual variables"
else
  echo "⚠️  Redis not configured - using memory cache only"
fi

# Check that NODE_ENV is specifically 'production'
if [ "$NODE_ENV" != "production" ]; then
  echo "Error: NODE_ENV must be set to 'production'."
  exit 1
fi

echo "✅ All required environment variables are set. Starting server..."

# Execute the node process. Use exec to replace the shell process with the node process.
exec node --max-old-space-size=1024 --unhandled-rejections=strict backend/server.js
