import { Configuration } from "webpack";

import { BuilderMode } from "../config/abstract/AbstractConfigBuilder";
import { ConfigBuilder } from "../config/ConfigBuilder";
import { TaskContext } from "../tasks/TaskContext";

export type AppContextPreset = "server" | "ssr" | "client";

export class AppContext {
  public static fromPreset(
    mode: BuilderMode,
    preset: AppContextPreset,
    taskContext: TaskContext,
  ): AppContext[] {
    const apps: AppContext[] = [];

    if (preset === "server") {
      apps.push(
        new AppContext(
          "server",
          new ConfigBuilder({
            mode,
            target: "node",
            ctx: taskContext,
            paths: {
              srcDir: "src",
              publicPath: "/",
              buildDir: "build",
              entryFile: "src/entry",
            },
          }).build(),
        ),
      );
    }

    if (preset === "ssr") {
      apps.push(
        new AppContext(
          "server",
          new ConfigBuilder({
            mode,
            target: "node",
            ctx: taskContext.cloneWithEnv({
              // Pass client `buildDir` relative to server `buildDir.
              APP_PUBLIC_DIR: "public",
            }),
            paths: {
              srcDir: "src",
              publicPath: "/",
              buildDir: "build",
              entryFile: "src/server-entry",
            },
          }).build(),
        ),

        new AppContext(
          "client",
          new ConfigBuilder({
            mode,
            target: "web",
            ctx: taskContext,
            paths: {
              srcDir: "src",
              publicPath: "/",
              buildDir: "build/public",
              entryFile: "src/client-entry",
            },
          }).build(),
        ),
      );
    }

    return apps;
  }

  public readonly app: string;

  public readonly config: Configuration;

  public constructor(app: string, config: Configuration) {
    this.app = app;
    this.config = config;
  }
}
