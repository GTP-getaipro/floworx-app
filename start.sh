#!/bin/sh

# This script ensures essential environment variables are set
# before starting the Node.js application.

# --- Environment Variable Validation ---
# Exit if any of these critical variables are not set.
# The ':-' syntax provides a default error message.
: "${DATABASE_URL:?DATABASE_URL must be set}"
: "${REDIS_HOST:?REDIS_HOST must be set}"
: "${REDIS_PORT:?REDIS_PORT must be set}"
: "${REDIS_USER:?REDIS_USER must be set}"
: "${REDIS_PASSWORD:?REDIS_PASSWORD must be set}"
: "${JWT_SECRET:?JWT_SECRET must be set}"
: "${NODE_ENV:?NODE_ENV must be set}"

# Check that NODE_ENV is specifically 'production'
if [ "$NODE_ENV" != "production" ]; then
  echo "Error: NODE_ENV must be set to 'production'."
  exit 1
fi

echo "✅ All required environment variables are set. Starting server..."

# Execute the node process. Use exec to replace the shell process with the node process.
exec node --max-old-space-size=512 --unhandled-rejections=strict backend/server.js
