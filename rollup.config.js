"use strict";

const babel = require("@babel/core");
const jsonPlugin = require("rollup-plugin-json");
const babelPlugin = require("rollup-plugin-babel");
const prettierPlugin = require("rollup-plugin-prettier");
const nodeResolvePlugin = require("rollup-plugin-node-resolve");

const pkg = require("./package");

const usedNodeBuiltins = ["fs", "path", "child_process"];

const externals = [
  ...usedNodeBuiltins,
  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies),
];

function createConfig({ input, outputFile }) {
  return {
    input,

    output: { format: "es", file: outputFile },

    external(id) {
      return externals.includes(id);
    },

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
              targets: { node: "8.0.0" },
            },
          ],
          "@babel/preset-typescript",
        ],
        plugins: [
          [
            "@babel/plugin-proposal-object-rest-spread",
            {
              useBuiltIns: true,
            },
          ],
          [
            "@babel/plugin-proposal-class-properties",
            {
              loose: true,
            },
          ],
        ],
      }),

      {
        name: "lazyRequirePlugin",
        renderChunk(code) {
          return babel.transformSync(code, {
            plugins: [
              [
                "@babel/plugin-transform-modules-commonjs",
                {
                  // Do not lazy require node builtins.
                  lazy(id) {
                    return !usedNodeBuiltins.includes(id);
                  },
                },
              ],
            ],
          });
        },
      },

      prettierPlugin({ parser: "babylon" }),
    ],
  };
}

module.exports = [
  createConfig({
    input: "./src/index.ts",
    outputFile: "./index.js",
  }),

  createConfig({
    input: "./src/babel-preset.ts",
    outputFile: "./babel.js",
  }),
];
