import { Configuration } from "webpack";

import { BuilderMode } from "../builders/abstract/AbstractConfigBuilder";
import { ConfigBuilder } from "../builders/ConfigBuilder";
import { TaskContext } from "../tasks/TaskContext";

export type AppContextPreset = "server" | "ssr" | "client";

export class App {
  public static fromPreset(
    ctx: TaskContext,
    mode: BuilderMode,
    preset: AppContextPreset,
  ): App[] {
    const apps: App[] = [];

    if (preset === "server") {
      apps.push(
        new App(
          "server",
          new ConfigBuilder({
            ctx,
            mode,
            target: "node",
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
        new App(
          "server",
          new ConfigBuilder({
            mode,
            target: "node",
            ctx: ctx.cloneWithEnv({
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

        new App(
          "client",
          new ConfigBuilder({
            ctx,
            mode,
            target: "web",
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
