# Creating multi-stage build for production
FROM node:lts-alpine3.17 as builder
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/
COPY hcu-urban-model-builder-backend/package*.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && npm install --only=production
ENV PATH /opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY hcu-urban-model-builder-backend .
RUN npm run compile

# Creating final production image
FROM node:lts-alpine3.17 as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /opt/
COPY --from=builder /opt/node_modules ./node_modules
WORKDIR /opt/app
COPY --from=builder /opt/app ./
ENV PATH /opt/node_modules/.bin:$PATH

RUN chown -R node:node /opt/app
USER node
EXPOSE 3030
# Start the app
CMD [ "npm", "run", "start:production" ]
