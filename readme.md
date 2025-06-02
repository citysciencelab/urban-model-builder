<img width="600" alt="Element 4@2x" src="https://github.com/user-attachments/assets/c494c6de-c9ed-4175-901a-0eb98bf0e565" />

# Urban Model Builder
The Urban Model Builder is a collaborative webtool for creating and sharing simulation models. It is based on the Node.js [simulation library](github.com/scottfr/simulation) and comes with a full frontend, backend and Keycloak as an authentication and authorization management system. 

## Architecture Overview

<img width="3042" alt="Model Builder Architecture" src="https://github.com/user-attachments/assets/4a83ea9e-be75-40bf-8486-29e800d4861c" />



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
## Admin Endpoints
The admin endpoints are protected by a token-based authentication system. The token is stored as a hash in the environment variable `ADMIN_TOKEN` in the backend configuration.

### Create Admin Token Hash

To create a new admin token hash, run the following command:
```bash
npm run hash-password <password>
```
This will generate a new hash for the given password. Store it in the `ADMIN_TOKEN` environment variable in your backend environment configuration.

### Using the Admin Token

The token is used as a bearer token for authenticating requests to the `/admin` endpoints. When making requests to admin endpoints:

1. Use the original unhashed password in your Authorization header
2. Format the header as `Authorization: Bearer <your-unhashed-password>`

Example using curl:
```bash
curl -H "Authorization: Bearer your_admin_password" https://your-api-url/admin/endpoint
```

The system will hash the provided token and compare it with the stored `ADMIN_TOKEN` hash to authenticate administrative requests.
