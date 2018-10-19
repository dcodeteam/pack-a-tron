#!/usr/bin/env node

"use strict";

process.on("unhandledRejection", e => {
  throw e;
});

try {
  require.resolve("webpack");
} catch (e) {
  throw new Error("Failed to run command: `webpack` not installed.");
}

try {
  require.resolve("webpack-dev-server");
} catch (e) {
  throw new Error("Failed to run command: `webpack-dev-server` not installed.");
}

// eslint-disable-next-line import/no-unresolved
const { Cli } = require(".");

Cli.run(process.cwd(), process.env, process.argv).catch(error => {
  if (error) {
    if (error.stack) {
      console.error(error.stack);
    } else if (error.message) {
      console.error(error.message);
    }
  }

  process.exit(1);
});
