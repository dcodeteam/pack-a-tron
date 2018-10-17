import webpack from "webpack";

import { AppContext, AppContextPreset } from "../app/AppContext";
import { CliLogger } from "../cli/CliLogger";
import { BaseTask } from "./BaseTask";
import { TaskContext } from "./TaskContext";

export class BuildTask extends BaseTask {
  private readonly apps: AppContext[];

  public constructor(ctx: TaskContext, preset: AppContextPreset) {
    super();

    this.apps = AppContext.fromPreset("production", preset, ctx);
  }

  private runBuild({ app, config }: AppContext): Promise<void> {
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
              stats.toString({
                all: false,
                colors: true,
                errors: true
              })
            )
          );

          return;
        }

        if (stats.hasWarnings()) {
          logger.alert(
            "Compiled with warnings.\n%s",
            stats.toString({
              all: false,
              colors: true,
              warnings: true
            })
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
            warnings: true
          })
        );

        resolve();
      });
    });
  }

  public async run(): Promise<void> {
    await this.apps.reduce(
      (acc, x) => acc.then(() => this.runBuild(x)),
      Promise.resolve()
    );
  }

  public async stop(): Promise<void> {
    const logger = new CliLogger("BuildTask", "bgCyan");

    logger.log("Stopped.");
  }
}
