import * as path from "path";

import webpack, { Compiler } from "webpack";
import WebpackDevServer from "webpack-dev-server";

import { AppConfig } from "../app-config/AppConfig";
import {
  assertWebpack,
  assertWebpackDevServer,
} from "../builders/utils/ConfigUtils";
import { CliLogger } from "../cli/CliLogger";
import { BaseTask } from "./BaseTask";
import { TaskConfig } from "../task-config/TaskConfig";

export class StartTask extends BaseTask {
  private readonly apps = AppConfig.fromConfiguration(
    "development",
    this.config,
  );

  private readonly servers: NodeJS.EventEmitter[] = [];

  private readonly watchers: Compiler.Watching[] = [];

  private readonly devServers: WebpackDevServer[] = [];

  public constructor(private readonly config: TaskConfig) {
    super();
  }

  private runClientBuild({ app, config }: AppConfig): Promise<void> {
    assertWebpack();
    assertWebpackDevServer();

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

      const devServer = new WebpackDevServer(compiler, config.devServer);

      this.devServers.push(devServer);

      // Start server on main application port.
      devServer.listen(clientDevServerPort, clientHost, error => {
        if (error) {
          logger.error(error);

          reject(error);
        } else {
          logger.log("Development server started at %s", clientDevServerUrl);

          resolve();
        }
      });
    });
  }

  private runServerBuild({ app, config }: AppConfig): Promise<void> {
    assertWebpack();

    const logger = new CliLogger(`${app} builder`, "bgCyan");
    let compiled = false;

    return new Promise((resolve, reject) => {
      logger.log("Launching process...");

      const compiler = webpack(config);

      this.watchers.push(
        compiler.watch(
          {
            poll: 1000,
            aggregateTimeout: 300,
            ignored: /node_modules/,
          },
          (error, stats) => {
            if (error) {
              logger.alert("Encountered an build process error.", error.stack);

              if (!compiled) {
                compiled = true;
                reject(error);

                return;
              }
            }

            if (stats.hasErrors()) {
              logger.alert(
                "Encountered an build error.",
                stats.toString("errors-only"),
              );
            } else {
              logger.log("Build complete.");

              if (!compiled) {
                compiled = true;
                resolve();
              }
            }
          },
        ),
      );
    });
  }

  private runServer({ app, config }: AppConfig): Promise<void> {
    const logger = new CliLogger(`${app} runner`, "bgGreen");
    let launched = false;

    return new Promise((resolve, reject) => {
      logger.log("Launching process...");

      const script = path.join(config.output!.path!, config.output!.filename!);

      const nodemon = require("nodemon");
      const server = nodemon({
        script,
        stdout: false,
        ext: "js json",
        signal: "SIGHUP",
        cwd: path.dirname(script),
      });

      this.servers.push(server);

      server.on("stdout", (x: string) => {
        process.stdout.write(x);
      });

      server.on("stderr", (x: string) => {
        process.stderr.write(x);
      });

      server.on("crash", () => {
        logger.log("Process crashed.");

        if (!launched) {
          launched = true;
          reject(new Error("Process crashed."));
        }
      });

      server.on("start", () => {
        logger.log("Process launched.");

        if (!launched) {
          launched = true;
          resolve();
        }
      });
    });
  }

  public async run() {
    const clientApps = this.apps.filter(x => x.config.target === "web");
    const serverApps = this.apps.filter(x => x.config.target === "node");

    await Promise.all([
      // Run Server Builds.
      ...serverApps.map(x => this.runServerBuild(x)),
      // Run Client Builds.
      ...clientApps.map(x => this.runClientBuild(x)),
    ]);

    // Run Servers.
    await Promise.all(serverApps.map(x => this.runServer(x)));
  }

  public restart() {
    this.servers.forEach(x => {
      x.emit("restart");
    });

    this.watchers.forEach(x => {
      x.invalidate();
    });
  }

  public async stop(): Promise<void> {
    this.servers.map(x => x.emit("quit"));

    await Promise.all([
      ...this.watchers.map(x => new Promise(resolve => x.close(resolve))),
      ...this.devServers.map(x => new Promise(resolve => x.close(resolve))),
    ]);
  }
}
