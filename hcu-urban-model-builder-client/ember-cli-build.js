'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const path = require('path');
const Funnel = require('broccoli-funnel');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    babel: {
      plugins: [require.resolve('ember-auto-import/babel-plugin')],
    },
    'ember-cli-babel': { enableTypeScriptTransform: true },

    // Add options here
  });

  let additionalFolder = new Funnel('canvas', {
    exclude: ['**/*'], // Exclude all files it is only for file watching
  });

  const { Webpack } = require('@embroider/webpack');

  return require('@embroider/compat').compatBuild(app, Webpack, {
    staticAddonTestSupportTrees: true,
    staticAddonTrees: true,
    staticHelpers: true,
    staticModifiers: true,
    staticComponents: true,
    staticEmberSource: true,
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
    extraPublicTrees: [additionalFolder],
    packagerOptions: {
      webpackConfig: {
        devtool: 'source-map',
        resolve: {
          alias: {
            canvas: path.resolve(__dirname, 'canvas'),
          },
        },
        module: {
          rules: [
            {
              test: /.*\.tsx/,
              loader: 'babel-loader',
              exclude: /node_modules/,
              options: {
                presets: [
                  '@babel/preset-typescript',
                  ['@babel/preset-react', { runtime: 'automatic' }],
                ],
              },
            },
          ],
        },
        infrastructureLogging: {
          level: 'verbose',
        },
      },
    },
  });
};
