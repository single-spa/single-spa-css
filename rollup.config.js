import typescript from "@rollup/plugin-typescript";
import { terser } from "rollup-plugin-terser";

const formatFolders = {
  es: "esm",
};

function createConfig(format) {
  const outputFolder = `lib/${formatFolders[format] || format}`;

  return {
    input: "src/single-spa-css.ts",
    output: {
      name: format === "umd" ? "singleSpaCSS" : null,
      format,
      file: `${outputFolder}/single-spa-css.min.${format === "umd" ? "c" : ""}js`,
      sourcemap: true,
    },
    plugins: [
      typescript({
        compilerOptions: {
          declarationDir: outputFolder,
        },
      }),
      terser(),
    ],
  };
}

export default [
  createConfig("umd"),
  createConfig("es"),
  createConfig("system"),
];
