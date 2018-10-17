import { Configuration } from "webpack";

import { ConfigMode } from "../config/ConfigBuilder";
import { ServerConfigBuilder } from "../config/ServerConfigBuilder";
import { TaskContext } from "../tasks/TaskContext";

export type AppContextPreset = "server" | "ssr" | "client";

export class AppContext {
  public static fromPreset(
    mode: ConfigMode,
    preset: AppContextPreset,
    taskContext: TaskContext
  ): AppContext[] {
    const apps: AppContext[] = [];

    if (preset === "server") {
      apps.push(
        new AppContext(
          "server",
          new ServerConfigBuilder(taskContext, {
            mode,
            publicPath: "/",
            entryFile: "src/entry"
          }).build()
        )
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
