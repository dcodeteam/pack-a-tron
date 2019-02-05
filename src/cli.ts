import yargs from "yargs";

process.on("unhandledRejection", e => {
  throw e;
});

yargs(process.argv.slice(2))
  .help()
  .strict()
  .demandCommand()
  .usage("Usage: $0 <cmd>")

  .command({
    command: "start",
    describe: "run development environment",
    handler: () => require("./cli-start"),
  })

  .command({
    command: "build",
    describe: "build project",
    handler: () => require("./cli-build"),
  })

  .parse();
