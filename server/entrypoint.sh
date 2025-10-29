#!/bin/sh

aws s3 cp s3://$S3_CONFIG_BUCKET/$S3_CONFIG_PATH/.env .env
pm2-runtime dist/index.js --name web-ide-backend
