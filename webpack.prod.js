const path = require('path')
const common = require('./webpack.config.js');
const { merge } = require('webpack-merge');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  module: {
    rules: [
      /* In production, Webpack minifies JS files and randomizes variable names.
          This causes problems with AngularJS unless you use explicit annotations,
          which we don't.
          https://docs.angularjs.org/error/$injector/strictdi
          (The syntax we use is like the 'bad' example: implicit annotations)
          So rather than change every file in our codebase, I'm adding this
          babel plugin which basically preprocesses our 'bad' code into 'good' code.
        Only needed on production because minification doesn't happen on dev. */
      {
        test: /\.(js)$/,
        include: path.resolve(__dirname, 'www'),
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ["angularjs-annotate"],
        },
      },
    ],
  },
});
