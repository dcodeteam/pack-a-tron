import { Configuration } from "webpack";

import { ClientConfigBuilder } from "../config/ClientConfigBuilder";
import { ConfigMode } from "../config/ConfigBuilder";
import { ServerConfigBuilder } from "../config/ServerConfigBuilder";
import { TaskContext } from "../tasks/TaskContext";

export type AppContextPreset = "server" | "ssr" | "client";

export class AppContext {
  public static fromPreset(
    mode: ConfigMode,
    preset: AppContextPreset,
    taskContext: TaskContext,
  ): AppContext[] {
    const apps: AppContext[] = [];

    if (preset === "server") {
      apps.push(
        new AppContext(
          "server",
          new ServerConfigBuilder(taskContext, {
            mode,

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
          new ServerConfigBuilder(
            taskContext.cloneWithEnv({
              // Pass client `buildDir` relative to server `buildDir.
              APP_PUBLIC_DIR: "public",
            }),
            {
              mode,
              paths: {
                srcDir: "src",
                publicPath: "/",
                buildDir: "build",
                entryFile: "src/server-entry",
              },
            },
          ).build(),
        ),

        new AppContext(
          "client",
          new ClientConfigBuilder(taskContext, {
            mode,
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
