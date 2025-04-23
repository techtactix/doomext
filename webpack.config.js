const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');

module.exports = {
  entry: {
    popup: './src/js/popup.js',
    content: ['./src/js/content.js', './src/css/content.css'],
    background: './src/js/background.js',
    'mindful-browsing': './src/js/mindful-browsing.ts'
  },
  output: {
    path: path.resolve(__dirname, 'extension/public'),
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './src/options.html',
      filename: 'options.html',
      chunks: ['options'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/manifest.json', to: 'manifest.json' },
        { from: './src/icons', to: 'icons' },
        { from: './src/css/content.css', to: 'content.css' },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new FaviconsWebpackPlugin({
      logo: './src/icons/logo.png',
      prefix: 'icons/',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'extension/public'),
    },
    compress: true,
    port: 9000,
  },
};
