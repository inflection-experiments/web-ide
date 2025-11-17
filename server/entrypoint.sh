#!/bin/sh
set -e
echo "Starting Web IDE Application..."
sleep 5
exec pm2-runtime start dist/index.js --name web-ide-app
