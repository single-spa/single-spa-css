# single-spa-css

Lifecycle helpers for loading and unmounting css.

[Full Documentation](https://single-spa.js.org/docs/ecosystem-css#single-spa-css)

manifestUrl 用法

```js
const cssLifecycles = singleSpaCss({
  manifestUrl: `http://${host}/manifest.json`, //
  webpackExtractedCss: false,
});
```

> manifest 是 webpack-manifest-plugin 打包出的资源表
> support development & production
