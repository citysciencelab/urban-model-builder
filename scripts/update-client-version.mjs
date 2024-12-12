const versionType = argv._[0]

await $`cd hcu-urban-model-builder-backend && npm version ${versionType}`

const backendPackageJson = await fs.readJson('./hcu-urban-model-builder-backend/package.json')


const clientPackageJson = await fs.readJson('./hcu-urban-model-builder-client/package.json')

const clientCanvasPackageJson = await fs.readJson('./hcu-urban-model-builder-client/canvas/package.json')

clientPackageJson.dependencies['hcu-urban-model-builder-backend'] = `file:../bundle/hcu-urban-model-builder-backend-${backendPackageJson.version}.tgz`;

clientCanvasPackageJson.peerDependencies['hcu-urban-model-builder-backend'] = `^${backendPackageJson.version}`;


await fs.writeJson('./hcu-urban-model-builder-client/package.json', clientPackageJson, { spaces: 2 });
await fs.writeJson('./hcu-urban-model-builder-client/canvas/package.json', clientCanvasPackageJson, { spaces: 2 });

await $`cd hcu-urban-model-builder-client && npm i`