#!/bin/sh
su - modelbuilder -c "
cd /var/www/vhosts/comodeling.city/modelbuilder/urban-model-builder
git checkout main && git restore . && git pull
cd hcu-urban-model-builder-client && npm i && npm run build
"

docker compose -f docker-compose-staging.yml build --no-cache
docker compose -f docker-compose-staging.yml down
docker compose -f docker-compose-staging.yml up -d 