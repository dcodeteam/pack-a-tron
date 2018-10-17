import { CliLogger } from "../cli/CliLogger";
import { BaseTask } from "./BaseTask";

export class BuildTask extends BaseTask {
  public async run(): Promise<void> {
    const logger = new CliLogger("BuildTask", "bgCyan");

    logger.log("Not Implemented");
  }

  public async stop(): Promise<void> {
    const logger = new CliLogger("BuildTask", "bgCyan");

    logger.log("Not Implemented");
  }
}
