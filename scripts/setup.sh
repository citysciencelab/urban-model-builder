#!/bin/sh

cp config/.env.sample config/.env

cd hcu-urban-model-builder-backend
npm i

cd ../hcu-urban-model-builder-client
npm i