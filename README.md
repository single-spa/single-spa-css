# single-spa-css

Lifecycle helpers for loading and unmounting css.

## Installation

```sh
npm install single-spa-css

pnpm install single-spa-css

yarn add single-spa-css
```

## Usage

```js
import singleSpaCss from 'single-spa-css';

const cssLifecycles = singleSpaCss({
  // required: a list of CSS URLs to load
  // can be omitted if webpackExtractedCss is set to true, do not specify webpack extracted css files here
  cssUrls: ['https://example.com/main.css'],

  // optional: defaults to false. This controls whether extracted CSS files from webpack
  // will automatically be loaded. This requires using the ExposeRuntimeCssAssetsPlugin,
  // which is documented below.
  webpackExtractedCss: false,

  // optional: defaults to true. Indicates whether the <link> element for the CSS will be
  // unmounted when the single-spa microfrontend is unmounted.
  shouldUnmount: true,

  // optional: defaults to 5000. The number of milliseconds to wait on the <link> to load
  // before failing the mount lifecycle.
  timeout: 5000
})

const reactLifecycles = singleSpaReact({...})

// Export an array of lifecycles to integrate with a framework's
// single-spa lifecycles. The order matters.
export const bootstrap = [
  cssLifecycles.bootstrap,
  reactLifecycles.bootstrap
]

export const mount = [
  // The css lifecycles should be before your framework's mount lifecycle,
  // to avoid a Flicker of Unstyled Content (FOUC)
  cssLifecycles.mount,
  reactLifecycles.mount
]

export const unmount = [
  // The css lifecycles should be after your framework's unmount lifecycle,
  // to avoid a Flicker of Unstyled Content (FOUC)
  reactLifecycles.unmount,
  cssLifecycles.unmount
]
```

If you want some css files to unmount, but others to stay mounted, use the following syntax:

```js
const cssLifecycles = singleSpaCss({
  cssUrls: [
    {
      href: "https://example.com/main.css",
      shouldUnmount: true,
    },
    {
      href: "https://example.com/other.css",
      shouldUnmount: false,
    },
  ],
});
```

## Webpack Plugin

single-spa-css exposes a webpack plugin that integrates with [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin) to allow you to load CSS files that are extracted and otherwise would not be loaded. The webpack plugin exposes the names of the extracted CSS files to your bundle under the `__webpack_require__.cssAssets` and `__webpack_require__.cssAssetFileName` variables. The `cssAssets` variable contains the name of the webpack chunk, and the `cssAssetFileName` function converts the chunk name into the extracted CSS asset's file name. These can be used manually, or you can specify the `webpackExtractedCss` option in single-spa-css to have it automatically mount and unmount those CSS files.

### Usage

In your webpack config, add the following:

```js
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const ExposeRuntimeCssAssetsPlugin = require("single-spa-css/ExposeRuntimeCssAssetsPlugin.cjs");

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
    }),
    new ExposeRuntimeCssAssetsPlugin({
      // The filename here must match the filename for the MiniCssExtractPlugin
      filename: "[name].css",
    }),
  ],
};
```
