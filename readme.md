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

## Publish New Feathers Client Version

Publish a new Feathers Client Version:
```
npm run feathers-client:version [<newversion> | major | minor | patch | premajor | preminor | prepatch | prerelease | from-git]
```
The Arguments for the npm script `feathers-client:version` are the same as [npm version](https://docs.npmjs.com/cli/v8/commands/npm-version).

## Deployment

To deploy the latest version, run the following script on the server:
```bash
./scripts/deploy.sh
```

To apply the latest database migrations, execute the following script on the server:
```bash
./scripts/deploy.sh
```