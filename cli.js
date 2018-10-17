#!/usr/bin/env node

"use strict";

process.on("unhandledRejection", handleError);

// eslint-disable-next-line import/no-unresolved
const { Cli } = require(".");

Cli.run(process.cwd(), process.argv).catch(handleError);

function handleError(error) {
  if (error) {
    if (error.stack) {
      console.error(error.stack);
    } else if (error.message) {
      console.error(error.message);
    }
  }

  process.exit(1);
}
