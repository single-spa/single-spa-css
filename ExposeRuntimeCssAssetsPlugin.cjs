const webpack = require("webpack");
const RuntimeModule = require("webpack/lib/RuntimeModule");
const Template = require("webpack/lib/Template");
const { RuntimeGlobals } = require("webpack");
const { MODULE_TYPE } = require("mini-css-extract-plugin/dist/utils");

const pluginName = "SingleSpaExposeRuntimeCssAssetsPlugin";

class ExposedCssRuntimeModule extends RuntimeModule {
  constructor() {
    super("exposed-css-runtime", 10);
  }
  generate() {
    return Template.asString(
      `${RuntimeGlobals.require}.cssAssets = ${JSON.stringify([
        this.chunk.id,
      ])};`
    );
  }
}

module.exports = class ExposeRuntimeCssAssetsPlugin {
  constructor(options) {
    this.options = options;
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.contentHash.tap(pluginName, (chunk) => {
        const { outputOptions, chunkGraph } = compilation;
        const modules = chunkGraph.getChunkModulesIterableBySourceType(
          chunk,
          MODULE_TYPE
        );

        if (modules) {
          const { hashFunction, hashDigest, hashDigestLength } = outputOptions;
          const hash = webpack.util.createHash(hashFunction);

          for (const m of modules) {
            m.updateHash(hash, { chunkGraph });
          }

          // eslint-disable-next-line no-param-reassign
          chunk.contentHash[MODULE_TYPE] = hash
            .digest(hashDigest)
            .substring(0, hashDigestLength);
        }
      });

      compilation.hooks.afterOptimizeChunks.tap(pluginName, (chunks) => {
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
              if (!chunk.contentHash[MODULE_TYPE]) {
                const { outputOptions, chunkGraph } = compilation;
                const modules = chunkGraph.getChunkModulesIterableBySourceType(
                  chunk,
                  MODULE_TYPE
                );

                if (modules) {
                  const { hashFunction, hashDigest, hashDigestLength } =
                    outputOptions;
                  const hash = webpack.util.createHash(hashFunction);

                  for (const m of modules) {
                    m.updateHash(hash, { chunkGraph });
                  }

                  // eslint-disable-next-line no-param-reassign
                  chunk.contentHash[MODULE_TYPE] = hash
                    .digest(hashDigest)
                    .substring(0, hashDigestLength);
                }
              }

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
                new ExposedCssRuntimeModule()
              );
            }
          }
        });
      });
    });
  }
};
