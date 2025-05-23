import webpack from "webpack/lib/index.js";
import RuntimeModule from "webpack/lib/RuntimeModule.js";
import RuntimeGlobals from "webpack/lib/RuntimeGlobals.js";
import Template from "webpack/lib/Template.js";
import { MODULE_TYPE } from "mini-css-extract-plugin/dist/utils.js";

/** @typedef {import("webpack").Compiler} Compiler */
const pluginName = "SingleSpaExposeRuntimeCssAssetsPlugin";

class ExposedCssRuntimeModule extends RuntimeModule {
  constructor(foundCssModule) {
    super("exposed-css-runtime", 10);
    this.foundCssModule = foundCssModule;
  }
  generate() {
    return Template.asString(
      `${RuntimeGlobals.require}.cssAssets = ${JSON.stringify(
        [this.foundCssModule && this.chunk.id].filter(Boolean),
      )};`,
    );
  }
}

export default class ExposeRuntimeCssAssetsPlugin {
  constructor(options) {
    this.options = options;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      const { outputOptions } = compilation;
      compilation.hooks.contentHash.tap(pluginName, (chunk) => {
        const modules =
          compilation.chunkGraph.getChunkModulesIterableBySourceType(
            chunk,
            MODULE_TYPE,
          );

        if (modules) {
          const { hashFunction, hashDigest, hashDigestLength } = outputOptions;
          const hash = webpack.util.createHash(hashFunction);

          for (const m of modules) {
            m.updateHash(hash, { chunkGraph: compilation.chunkGraph });
          }

          chunk.contentHash[MODULE_TYPE] = hash
            .digest(hashDigest)
            .substring(0, hashDigestLength);
        }
      });

      compilation.hooks.afterOptimizeChunks.tap(pluginName, (chunks) => {
        chunks.forEach((chunk) => {
          if (compilation.chunkGraph.getNumberOfEntryModules(chunk) > 0) {
            const entryModules = Array.from(
              compilation.chunkGraph.getChunkEntryModulesIterable(chunk),
            );

            if (entryModules.length < 1) return;

            let foundCssModule = false;

            for (const module of compilation.chunkGraph.getChunkModulesIterable(
              chunk,
            )) {
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
                  MODULE_TYPE,
                );

                if (modules) {
                  const { hashFunction, hashDigest, hashDigestLength } =
                    outputOptions;
                  const hash = webpack.util.createHash(hashFunction);

                  for (const m of modules) {
                    m.updateHash(hash, { chunkGraph });
                  }

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
                  true,
                ),
              );
            }

            compilation.addRuntimeModule(
              chunk,
              new ExposedCssRuntimeModule(foundCssModule),
            );
          }
        });
      });
    });
  }
}
