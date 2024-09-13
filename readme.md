# HCU Urban Model Builder

## Getting started for Dev

Run the setup script:
```
npm run setup
```

Start the database:
```
docker compose up
```

Start the backend:
```
cd hcu-urban-model-builder-backend && npm run migrate && npm run dev
```

Start the client:
```
cd hcu-urban-model-builder-client && npm run start
```

Create first model:
```
curl --location 'http://localhost:3030/models' \
--header 'Content-Type: application/json' \
--data '{
    "name": "My first model"
}'
```
