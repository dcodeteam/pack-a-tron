import * as path from "path";

import webpack, { Compiler } from "webpack";

import { AppContext, AppContextPreset } from "../app/AppContext";
import { CliLogger } from "../cli/CliLogger";
import { BaseTask } from "./BaseTask";
import { TaskContext } from "./TaskContext";

// eslint-disable-next-line typescript/no-var-requires
const nodemon = require("nodemon");

export class StartTask extends BaseTask {
  private readonly apps: AppContext[];

  private readonly servers: NodeJS.EventEmitter[];

  private readonly watchers: Compiler.Watching[];

  public constructor(ctx: TaskContext, preset: AppContextPreset) {
    super();

    this.servers = [];
    this.watchers = [];
    this.apps = AppContext.fromPreset("development", preset, ctx);
  }

  private runServerBuild({ app, config }: AppContext): Promise<void> {
    const logger = new CliLogger(`${app} builder`, "bgCyan");
    let compiled = false;

    return new Promise((resolve, reject) => {
      logger.log("Launching build process...");

      const compiler = webpack(config);

      this.watchers.push(
        compiler.watch(
          {
            poll: 1000,
            aggregateTimeout: 300,
            ignored: /node_modules/
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
                stats.toString("errors-only")
              );
            } else {
              logger.log("Server build complete.");

              if (!compiled) {
                compiled = true;
                resolve();
              }
            }
          }
        )
      );
    });
  }

  private runServer({ app, config }: AppContext): Promise<void> {
    const logger = new CliLogger(`${app} runner`, "bgGreen");
    let launched = false;

    return new Promise((resolve, reject) => {
      logger.log("Launching process...");

      const script = path.join(config.output!.path!, config.output!.filename!);

      const server = nodemon({
        script,
        stdout: false,
        ext: "js json",
        signal: "SIGHUP",
        cwd: path.dirname(script)
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
    const nodeApps = this.apps.filter(x => x.config.target === "node");

    // Run Builds.
    await Promise.all(nodeApps.map(x => this.runServerBuild(x)));

    // Run Servers.
    await Promise.all(nodeApps.map(x => this.runServer(x)));
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

    await Promise.all(
      this.watchers.map(x => new Promise(resolve => x.close(resolve)))
    );
  }
}
