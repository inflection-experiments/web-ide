#!/bin/sh

aws s3 cp s3://$S3_CONFIG_BUCKET/$S3_CONFIG_PATH/.env ./.env
ORIGIN=$ORIGIN pm2-runtime build/index.js --name web-ide-frontend
