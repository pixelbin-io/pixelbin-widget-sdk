const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = (env, argv) => {
  const isProd = (argv && argv.mode === 'production') || process.env.NODE_ENV === 'production';
  return {
    mode: isProd ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'widget-sdk.js',
      library: 'WidgetSDK',
      libraryTarget: 'umd',
      umdNamedDefine: true,
      globalObject: 'typeof self !== "undefined" ? self : this',
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


