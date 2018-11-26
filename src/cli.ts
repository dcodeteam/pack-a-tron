import { CommanderStatic } from "commander";

import { version } from "../package.json";

process.on("unhandledRejection", e => {
  throw e;
});

const commander: CommanderStatic = require("commander");

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
