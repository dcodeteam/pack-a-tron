import webpack from "webpack";

import { App } from "../app/App";
import { CliLogger } from "../cli/CliLogger";
import { BaseTask } from "./BaseTask";

export class BuildTask extends BaseTask {
  private readonly apps: App[];

  public constructor(apps: App[]) {
    super();

    this.apps = apps;
  }

  private runBuild({ app, config }: App): Promise<void> {
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
                errors: true,
              }),
            ),
          );

          return;
        }

        if (stats.hasWarnings()) {
          logger.alert(
            "Compiled with warnings.\n%s",
            stats.toString({
              all: false,
              colors: true,
              warnings: true,
            }),
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
    await this.apps.reduce(
      (acc, x) => acc.then(() => this.runBuild(x)),
      Promise.resolve(),
    );
  }

  public async stop(): Promise<void> {
    const logger = new CliLogger("BuildTask", "bgCyan");

    logger.log("Stopped.");
  }
}
