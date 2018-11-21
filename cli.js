#!/usr/bin/env node

"use strict";

var version = "0.0.13";

process.on("unhandledRejection", e => {
  throw e;
});

const commander = require("commander");

commander.version(version);
commander
  .command("start")
  .description("run development environment")
  .action(() => require("./cli-start"));
commander
  .command("build")
  .description("build project")
  .action(() => require("./cli-build"));
commander.parse(process.argv);

if (commander.args.length === 0) {
  commander.help();
}
