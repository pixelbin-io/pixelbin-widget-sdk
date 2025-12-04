const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
require('dotenv').config({
  quiet: true
});

module.exports = (env, argv) => {
  const isProd = (argv && argv.mode === 'production') || process.env.NODE_ENV === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProd ? 'widget-sdk.js' : 'widget-sdk.dev.js',
      library: {
        name: 'WidgetSDK',            // Global variable name (backward compatible)
        type: 'umd',                  // Universal Module Definition (works everywhere)
        export: 'default',            // Export the default export as the library
        umdNamedDefine: true,         // AMD module name
      },
      globalObject: 'this',           // Works in browser & Node.js
      clean: true
    },
    devtool: isProd ? false : 'source-map',
    target: ['web', 'es5'],
    optimization: {
      minimize: isProd,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: { comments: false }
          }
        })
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.WIDGET_ORIGIN': JSON.stringify(process.env.WIDGET_ORIGIN),
        'process.env.PACKAGE_VERSION': JSON.stringify(require('./package.json').version)
      }),
      new CopyPlugin({
        patterns: [
          { from: "src/index.d.ts", to: "widget-sdk.d.ts" },
        ],
      }),
    ],
    module: {
      rules: [
        {
          test: /\.m?js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    targets: '>0.25%, not dead',
                    modules: false,
                    useBuiltIns: false
                  }
                ]
              ]
            }
          }
        }
      ]
    }
  };
};


