#!/bin/sh
su modelbuilder
git pull
cd ../hcu-urban-model-builder-client && npm run build
exit
docker compose -f docker-compose-staging.yml build --no-cache
docker compose -f docker-compose-staging.yml down
docker compose -f docker-compose-staging.yml up -d 