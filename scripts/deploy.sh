#!/bin/sh
git pull

cd ../hcu-urban-model-builder-client && npm run build

docker compose -f docker-compose-staging.yml build --no-cache
docker compose -f docker-compose-staging.yml down
docker compose -f docker-compose-staging.yml up -d 