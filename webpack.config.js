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
        type: 'module'
      },
      clean: true
    },
    experiments: {
      outputModule: true
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
        'process.env.WIDGET_ORIGIN': JSON.stringify(process.env.WIDGET_ORIGIN)
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


