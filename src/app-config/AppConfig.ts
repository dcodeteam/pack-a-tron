import * as webpack from "webpack";

import { BuilderMode } from "../builders/abstract/AbstractConfigBuilder";
import { ConfigBuilder } from "../builders/ConfigBuilder";
import { TaskConfig } from "../task-config/TaskConfig";
import { PUBLIC_DIR_NAME } from "./TaskContants";

export type AppContextPreset = "server" | "ssr" | "client";

export class AppConfig {
  public static fromConfiguration(
    mode: BuilderMode,
    config: TaskConfig,
  ): Array<AppConfig> {
    const { srcDir, clientConfig, serverConfig } = config;

    if (clientConfig && serverConfig) {
      return [
        new AppConfig(
          "server",
          new ConfigBuilder({
            mode,
            config,
            target: "node",
            paths: {
              srcDir,
              publicPath: "/",
              buildDir: "build",
              entryFile: serverConfig.entryFile,
            },
          }).build(),
        ),

        new AppConfig(
          "client",
          new ConfigBuilder({
            mode,
            config,
            target: "web",
            paths: {
              srcDir,
              publicPath: "/",
              buildDir: `build/${PUBLIC_DIR_NAME}`,
              entryFile: clientConfig.entryFile,
            },
          }).build(),
        ),
      ];
    }

    if (serverConfig) {
      return [
        new AppConfig(
          "server",
          new ConfigBuilder({
            mode,
            config,
            target: "node",
            paths: {
              srcDir,
              publicPath: "/",
              buildDir: "build",
              entryFile: serverConfig.entryFile,
            },
          }).build(),
        ),
      ];
    }

    if (clientConfig) {
      throw new Error("Please use create-react-app.");
    }

    throw new Error("No config found.");
  }

  public constructor(
    public readonly app: string,
    public readonly config: webpack.Configuration,
  ) {
    // Noop.
  }
}
