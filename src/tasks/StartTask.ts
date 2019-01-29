import { ChildProcess, fork } from "child_process";
import * as path from "path";

import webpack, { Compiler } from "webpack";
import WebpackDevServer from "webpack-dev-server";

import { AppConfig } from "../app-config/AppConfig";
import { CliLogger } from "../cli/CliLogger";
import { TaskConfig } from "../task-config/TaskConfig";
import { BaseTask } from "./BaseTask";

export class StartTask extends BaseTask {
  private readonly apps = AppConfig.fromConfiguration(
    "development",
    this.config,
  );

  private readonly watchers = new Set<Compiler.Watching>();

  private readonly subProcesses = new Set<ChildProcess>();

  private readonly devServers = new Set<WebpackDevServer>();

  public constructor(private readonly config: TaskConfig) {
    super([
      {
        text: "rs",
        fn: () => this.restart(),
      },
    ]);
  }

  private runClientBuild({ app, config }: AppConfig): Promise<void> {
    const logger = new CliLogger(`${app} builder`, "bgBlue");

    const { clientHost, clientDevServerPort, clientDevServerUrl } = this.config;

    return new Promise<void>((resolve, reject) => {
      logger.log("Launching process...");

      const compiler = webpack(config);

      // "invalid" event fires when you have changed a file, and Webpack is
      // recompiling a bundle. WebpackDevServer takes care to pause serving the
      // bundle, so if you refresh, it'll wait instead of serving the old one.
      // "invalid" is short for "bundle invalidated", it doesn't imply any errors.
      compiler.hooks.invalid.tap("invalid", () => {
        logger.log("Compiling...");
      });

      // "done" event fires when Webpack has finished recompiling the bundle.
      // Whether or not you have warnings or errors, you will get this event.
      compiler.hooks.done.tap("done", stats => {
        if (stats.hasErrors()) {
          logger.alert(
            "Encountered an build error.",
            stats.toString("errors-only"),
          );
        } else {
          logger.log("Build complete.");
        }
      });

      if (!config.devServer) {
        throw new Error(
          "Failed to start client: `config.devServer` is not defined.",
        );
      }

      const openBrowser = require("react-dev-utils/openBrowser");

      const devServer = new WebpackDevServer(compiler, config.devServer);

      this.devServers.add(devServer);

      // Start server on main application port.
      devServer.listen(clientDevServerPort, clientHost, error => {
        if (error) {
          logger.error(error);

          reject(error);
        } else {
          openBrowser(clientDevServerUrl);

          logger.log("Development server started at %s", clientDevServerUrl);

          resolve();
        }
      });
    });
  }

  private runServerBuild(appConfig: AppConfig): Promise<void> {
    const { app, config } = appConfig;
    const logger = new CliLogger(`${app} builder`, "bgCyan");
    let compiled = false;

    return new Promise((resolve, reject) => {
      logger.log("Launching process...");

      let child: ChildProcess;
      const compiler = webpack(config);

      compiler.hooks.invalid.tap("invalid", () => {
        logger.log("Compiling...");
      });

      const watcher = compiler.watch(
        {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: /node_modules/,
        },
        (error, stats) => {
          if (error) {
            logger.alert("Encountered an build process error.", error.stack);

            if (!compiled) {
              return reject(error);
            }
          }

          if (stats.hasErrors()) {
            return logger.alert(
              "Encountered an build error.",
              stats.toString("errors-only"),
            );
          }

          logger.log("Build complete.");

          if (!compiled) {
            compiled = true;
            resolve();
          }

          if (child) {
            child.kill();
            this.subProcesses.delete(child);
          }

          child = this.runServer(appConfig);
          this.subProcesses.add(child);
        },
      );

      this.watchers.add(watcher);
    });
  }

  private runServer({ app, config }: AppConfig): ChildProcess {
    const logger = new CliLogger(`${app} process`, "bgGreen");
    const script = path.join(config.output!.path!, config.output!.filename!);
    const scriptCwd = path.dirname(script);
    const child = fork(script, [], {
      cwd: scriptCwd,
      silent: false,
    });

    logger.log("Launching...");

    child.once("start", () => {
      logger.log("Launched with PID: %s.", child.pid);
    });

    child.on("close", (code, signal) => {
      logger.log("Closed with code: %s, signal: %s", code, signal);
    });

    child.once("error", error => {
      logger.error(error);
    });

    return child;
  }

  public async run(): Promise<void> {
    const clientApps = this.apps.filter(x => x.config.target === "web");
    const serverApps = this.apps.filter(x => x.config.target === "node");

    await Promise.all([
      // Run Server Builds.
      ...serverApps.map(x => this.runServerBuild(x)),
      // Run Client Builds.
      ...clientApps.map(x => this.runClientBuild(x)),
    ]);
  }

  public restart(): void {
    this.watchers.forEach(x => {
      x.invalidate();
    });

    this.devServers.forEach(x => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (x as any).middleware.invalidate();
    });
  }

  public async stop(): Promise<void> {
    const requests: Array<Promise<void>> = [];

    this.subProcesses.forEach(x => {
      x.kill();
    });

    this.watchers.forEach(x => {
      requests.push(new Promise(resolve => x.close(resolve)));
    });

    this.devServers.forEach(x => {
      requests.push(new Promise(resolve => x.close(resolve)));
    });

    await Promise.all(requests);
  }
}
