import { CommanderStatic } from "commander";

import { version } from "../../package.json";
import { BuildTask } from "../tasks/BuildTask";
import { StartTask } from "../tasks/StartTask";
import { CliLogger } from "./CliLogger";
import { TaskConfig } from "../task-config/TaskConfig";
import { BaseTask } from "../tasks/BaseTask";
import { parseTaskConfigFile } from "../task-config/TaskConfigUtils";
import { onExitSignal } from "./CliUtils";

export type CliCommand = "init" | "start" | "build";

export interface CliEnv {
  readonly [key: string]: string;
}

async function runTask(
  cwd: string,
  factory: (config: TaskConfig) => BaseTask,
): Promise<void> {
  const config = await parseTaskConfigFile(cwd);
  const task = await factory(config);

  onExitSignal(() => task.stop());
}

export class Cli {
  public static async run(cwd: string, argv: string[]) {
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
      .action(() => runTask(cwd, config => new StartTask(config)));

    commander
      .command("build")
      .description("build project")
      .action(() => runTask(cwd, config => new BuildTask(config)));

    commander.parse(argv);

    if (commander.args.length === 0) {
      commander.help();
    }
  }
}
