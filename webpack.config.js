const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './www/index.js',
  output: {
    path: path.resolve(__dirname, 'www/dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      // to load CSS and SCSS (enketo-core only supplies SCSS)
      {
        test: /\.(scss|css)$/,
        include: [path.resolve(__dirname, 'www/css'),
                  path.resolve(__dirname, 'www/manual_lib'),
                  path.resolve(__dirname, 'node_modules/enketo-core'),
                  path.resolve(__dirname, 'node_modules/leaflet')],
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      // to resolve url() in CSS
      {
        test: /\.(png|jpg)$/,
        include: [path.resolve(__dirname, 'www/css'),
                  path.resolve(__dirname, 'node_modules/react-native-paper'),
                  path.resolve(__dirname, 'node_modules/@react-navigation/elements')],
        use: 'url-loader',
      },
      // necessary for react-native-web to bundle JSX
      {
        test: /\.(js|jsx|ts|tsx)$/,
        include: [path.resolve(__dirname, 'www'),
                  path.resolve(__dirname, 'node_modules/react-native-vector-icons')],
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
        },
      },
      // necessary to load TypeScript files
      {
        test: /\.(ts|tsx)?$/,
        include: path.resolve(__dirname, 'www'),
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
          experimentalWatchApi: true,
        },
      },
      // necessary for react-native-paper to load images, fonts, and vector graphics
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        include: [path.resolve(__dirname, 'www'),
                  path.resolve(__dirname, 'resources'),
                  path.resolve(__dirname, 'node_modules/react-native-vector-icons')],
        type: 'asset/resource',
      },
    ],
  },
  plugins: [
    // to load jQuery and moment globally
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      moment: 'moment',
      L: 'leaflet',
    }),
    new webpack.DefinePlugin({
      // __DEV__ is needed by FlashList; it's set false for production so that certain debugging
      // checks can be skipped and performance can be improved
      __DEV__: process.env.NODE_ENV !== 'production' || true,
    }),
  ],
  // "react-native" must be aliased to "react-native-web"
  // https://necolas.github.io/react-native-web/docs/setup/#package-aliasing
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-webview': 'react-native-web-webview',
      /* Enketo expects its per-app configuration to be available as 'enketo-config',
        so we have to alias it here.
      https://github.com/enketo/enketo-core#global-configuration */
      'enketo/config': path.resolve(__dirname, 'www/js/config/enketo-config')
    },
    extensions: ['.web.js', '.jsx', '.tsx', '.ts', '.js'],
  },
}
