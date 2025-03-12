'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const path = require('path');
const Funnel = require('broccoli-funnel');

module.exports = function (defaults) {
  const app = new EmberApp(defaults, {
    babel: {
      plugins: [
        require.resolve('ember-auto-import/babel-plugin'),
        require.resolve('ember-concurrency/async-arrow-task-transform'),
      ],
    },

    // Add options here
    'ember-cli-babel': { enableTypeScriptTransform: true },
    'ember-bootstrap': {
      bootstrapVersion: 5,
      importBootstrapCSS: false,
      insertEmberWormholeElementToDom: false,
    },
    'ember-fetch': {
      nativePromise: true,
    },
    svgJar: {
      sourceDirs: [
        'node_modules/@material-design-icons/svg/sharp',
        'public/assets/icons',
      ],
    },
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
            {
              test: /\.svg$/,
              exclude: /node_modules\/(?!@material-design-icons)/,
              use: [
                {
                  loader: '@svgr/webpack',
                  options: {
                    svgo: true,
                    svgoConfig: {
                      plugins: [
                        {
                          name: 'preset-default',
                          params: {
                            overrides: {
                              removeViewBox: false,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
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
