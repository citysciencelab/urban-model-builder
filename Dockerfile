# Creating multi-stage build for production
FROM node:20.18.3-alpine3.20 AS builder
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/
COPY hcu-urban-model-builder-backend/package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install
COPY hcu-urban-model-builder-backend/ ./
RUN npm run compile

# Creating final production image
FROM node:20.18.3-alpine3.20 AS production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/app
COPY hcu-urban-model-builder-backend/package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install --only=production
COPY hcu-urban-model-builder-backend/config ./config
COPY --from=builder /opt/lib ./lib

RUN chown -R node:node /opt/app
USER node
EXPOSE 3030
# Start the app
CMD [ "npm", "run", "start:production" ]
