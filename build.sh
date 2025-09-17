#!/bin/bash

# Set environment variables to skip browser downloads
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
export NIXPACKS_NO_BROWSER_INSTALL=1

# Build using Docker
docker build -t floworx-app -f Dockerfile .

echo "Build completed successfully using custom Dockerfile"
