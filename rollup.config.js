import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

const formatFolders = {
  es: "esm",
};

function createConfig(format) {
  return {
    input: "src/single-spa-css.ts",
    output: {
      name: format === "umd" ? "singleSpaCSS" : null,
      format,
      file: `lib/${formatFolders[format] || format}/single-spa-css.min.js`,
      sourcemap: true,
    },
    plugins: [typescript(), terser()],
  };
}

export default [
  createConfig("umd"),
  createConfig("es"),
  createConfig("system"),
];
