#!/bin/sh
su - modelbuilder -c "
cd /var/www/vhosts/comodeling.city/modelbuilder/urban-model-builder
git checkout main && git restore . && git pull
"

docker compose -f docker-compose-staging-migrate.yml build --no-cache
docker compose -f docker-compose-staging-migrate.yml down
docker compose -f docker-compose-staging-migrate.yml up