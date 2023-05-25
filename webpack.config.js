const path = require('path')
const glob = require('glob')
const webpack = require('webpack')

module.exports = {
  mode: 'development',
  entry: './www/index.js',
  devtool: 'inline-source-map',
  output: {
    path: path.resolve(__dirname, 'www/dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      // to load CSS
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      // to resolve url() in CSS
      {
        test: /\.(png|jpg)$/,
        loader: 'url-loader'
      },
      // necessary for react-native-web to bundle JSX
      {
        test: /\.jsx$/,
        exclude: /node_modules\/(?!()\/).*/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      // necessary for react-native-paper to load images, fonts, and vector graphics
      {
        test: /\.(jpg|png|woff|woff2|eot|ttf|svg)$/,
        type: 'asset/resource',
      },
      // necessary for react-native-paper to load icons
      {
        test: /\.js$/,
        exclude: /node_modules[/\\](?!react-native-vector-icons)/,
        use: {
          loader: 'babel-loader',
          options: {
            // Disable reading babel configuration
            babelrc: false,
            configFile: false,
      
            // The configuration for compilation
            presets: [
              ['@babel/preset-env', { useBuiltIns: 'usage' }],
              '@babel/preset-react',
              '@babel/preset-flow',
              "@babel/preset-typescript"
            ],
            plugins: [
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread'
            ],
          },
        },
      },
      // necessary to load html files
      {
        test: /\.html$/i,
        loader: 'file-loader'
      }
    ],
  },
  plugins: [
    // to load jQuery and moment globally
    new webpack.ProvidePlugin({
      $: 'jquery',
      moment: 'moment',
      L: 'leaflet',
    })
  ],
  devServer: {
    historyApiFallback: true,
    contentBase: './',
    hot: true,
  },
  // "react-native" must be aliased to "react-native-web"
  // https://necolas.github.io/react-native-web/docs/setup/#package-aliasing
  resolve: {
    alias: {
      'react-native$': 'react-native-web',
      'react-native-webview': 'react-native-web-webview',
      'react-native-vector-icons': false
    },
    extensions: ['.web.js', '.jsx', '.tsx', '.ts', '.js'],
  },
}
