const webpack = require("webpack");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const { RuntimeGlobals } = require("webpack");
const { MODULE_TYPE } = require("mini-css-extract-plugin/dist/utils");

class ExposedCssRuntimeModule extends RuntimeModule {
  constructor(options) {
    super("exposed-css-runtime", 10);
    this.options = options;
  }
  generate() {
    return Template.asString(
      `${RuntimeGlobals.require}.cssAssets = ${JSON.stringify(
        this.options.assets
      )};`
    );
  }
}

module.exports = class ExposeRuntimeCssAssetsPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap("SingleSpaCssPlugin", (compilation) => {
      compilation.hooks.afterOptimizeChunks.tap(
        "SingleSpaCssPlugin",
        (chunks) => {
          chunks.forEach((chunk) => {
            if (chunk.hasEntryModule()) {
              let foundCssModule = false;
              for (let module of chunk.getModules()) {
                if (module.type === MODULE_TYPE) {
                  foundCssModule = true;
                  break;
                }
              }

              if (foundCssModule) {
                compilation.addRuntimeModule(
                  chunk,
                  new webpack.runtime.GetChunkFilenameRuntimeModule(
                    MODULE_TYPE,
                    "single-spa-css",
                    `${webpack.RuntimeGlobals.require}.cssAssetFileName`,
                    (referencedChunk) => {
                      return this.options.filename;
                    },
                    true
                  )
                );
                compilation.addRuntimeModule(
                  chunk,
                  new ExposedCssRuntimeModule({ assets: [chunk.name] })
                );
              }
            }
          });
        }
      );
    });
  }
};
