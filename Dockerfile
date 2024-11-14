FROM node:lts-alpine3.17

WORKDIR /app

COPY hcu-urban-model-builder-backend/package*.json ./

RUN npm install

COPY hcu-urban-model-builder-backend .

EXPOSE 3030

VOLUME [ "/app/data", "/app/node_modules" ]

# Start the app
CMD [ "npm", "start:production" ]
