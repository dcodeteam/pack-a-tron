"use strict";

const json = require("rollup-plugin-json");
const babel = require("rollup-plugin-babel");
const prettier = require("rollup-plugin-prettier");
const nodeResolve = require("rollup-plugin-node-resolve");

const pkg = require("./package");

const externals = [
  "fs",
  "path",
  "child_process",

  ...Object.keys(pkg.dependencies),
  ...Object.keys(pkg.peerDependencies)
];

module.exports = {
  input: "./src/index.ts",

  output: { format: "cjs", file: "./index.js" },

  external(id) {
    return externals.includes(id);
  },

  plugins: [
    json(),

    nodeResolve({ extensions: [".ts"] }),

    babel({
      babelrc: false,
      runtimeHelpers: true,
      extensions: [".ts"],
      presets: [
        ["@babel/preset-env", { modules: false, targets: { node: "8.3.0" } }],
        "@babel/preset-typescript"
      ],
      plugins: ["@babel/plugin-transform-runtime"]
    }),

    prettier({ parser: "babylon" })
  ]
};
