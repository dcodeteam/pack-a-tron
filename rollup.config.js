"use strict";

const jsonPlugin = require("rollup-plugin-json");
const babelPlugin = require("rollup-plugin-babel");
const nodeResolvePlugin = require("rollup-plugin-node-resolve");
const pkg = require("./package");

const externals = new Set([
  "fs",
  "net",
  "path",
  "readline",
  "child_process",

  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
]);

module.exports = [
  createConfig({
    shebang: true,
    input: "./src/cli.ts",
    outputFile: "./cli.js",
  }),
  createConfig({ input: "./src/cli-build.ts", outputFile: "./cli-build.js" }),
  createConfig({ input: "./src/cli-start.ts", outputFile: "./cli-start.js" }),
  createConfig({ input: "./src/babel-preset.ts", outputFile: "./babel.js" }),
];

function createConfig({ shebang, input, outputFile }) {
  return {
    input,

    output: { file: outputFile, format: "cjs" },

    external: id => externals.has(id),

    plugins: [
      jsonPlugin(),

      nodeResolvePlugin({ extensions: [".ts"] }),

      babelPlugin({
        babelrc: false,
        runtimeHelpers: true,
        extensions: [".ts"],
        presets: [
          [
            "@babel/preset-env",
            {
              loose: true,
              modules: false,
              targets: { node: "8.3.0" },
            },
          ],
          "@babel/preset-typescript",
        ],

        plugins: [["@babel/plugin-proposal-class-properties", { loose: true }]],
      }),

      {
        name: "shebangPlugin",
        renderChunk: code =>
          !shebang ? code : `#!/usr/bin/env node\n\n${code}`,
      },
    ],
  };
}
