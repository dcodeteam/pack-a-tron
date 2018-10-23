import { CommanderStatic } from "commander";

import { version } from "../../package.json";
import { BuildTask } from "../tasks/BuildTask";
import { StartTask } from "../tasks/StartTask";
import { TaskContext } from "../tasks/TaskContext";
import { parseCliConfig } from "./CliConfig";
import { CliLogger } from "./CliLogger";
import { getYarnWorkspaces, onExitSignal } from "./CliUtils";

export type CliCommand = "init" | "start" | "build";

export interface CliEnv {
  readonly [key: string]: string;
}

export class Cli {
  public static async run(cwd: string, env: CliEnv, argv: string[]) {
    const commander: CommanderStatic = require("commander");
    const logger = new CliLogger("CLI", "bgCyan");

    commander.version(version);

    commander
      .command("init")
      .description("init config file")
      .action(() => {
        logger.log("Not implemented.");
      });

    commander
      .command("start")
      .description("run development environment")
      .action(async () => {
        const { preset } = await parseCliConfig(cwd);
        const workspaces = await getYarnWorkspaces(cwd);
        const ctx = new TaskContext(cwd, env, workspaces);
        const task = new StartTask(ctx, preset);

        onExitSignal(() => task.stop());

        await task.run();
      });

    commander
      .command("build")
      .description("build project")
      .action(async () => {
        const { preset } = await parseCliConfig(cwd);
        const workspaces = await getYarnWorkspaces(cwd);
        const ctx = new TaskContext(cwd, env, workspaces);
        const task = new BuildTask(ctx, preset);

        onExitSignal(() => task.stop());

        await task.run();
      });

    commander.parse(argv);

    if (commander.args.length === 0) {
      commander.help();
    }
  }
}
