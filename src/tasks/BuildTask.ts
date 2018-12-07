import webpack from "webpack";

import { AppConfig } from "../app-config/AppConfig";
import { CliLogger } from "../cli/CliLogger";
import { TaskConfig } from "../task-config/TaskConfig";
import { BaseTask } from "./BaseTask";

export class BuildTask extends BaseTask {
  private readonly apps = AppConfig.fromConfiguration(
    "production",
    this.config,
  );

  public constructor(private readonly config: TaskConfig) {
    super([]);
  }

  private runBuild({ app, config }: AppConfig): Promise<void> {
    const logger = new CliLogger(`${app} builder`, "bgCyan");

    return new Promise((resolve, reject) => {
      logger.log("Launching Build...");

      const compiler = webpack(config);

      compiler.run((err, stats) => {
        if (err) {
          reject(err);

          return;
        }

        if (stats.hasErrors()) {
          reject(
            new Error(
              stats.toString({ all: false, colors: true, errors: true }),
            ),
          );

          return;
        }

        if (stats.hasWarnings()) {
          logger.alert(
            "Compiled with warnings.\n%s",
            stats.toString({ all: false, colors: true, warnings: true }),
          );
        }

        logger.log(
          "Build complete.\n%s",
          stats.toString({
            all: false,

            hash: true,
            colors: true,

            assets: true,

            errors: true,
            errorDetails: true,

            moduleTrace: true,

            timings: true,
            warnings: true,
          }),
        );

        resolve();
      });
    });
  }

  public async run(): Promise<void> {
    for (const app of this.apps) {
      await this.runBuild(app);
    }
  }

  public async stop(): Promise<void> {
    const logger = new CliLogger("BuildTask", "bgCyan");

    logger.log("Stopped.");
  }
}
