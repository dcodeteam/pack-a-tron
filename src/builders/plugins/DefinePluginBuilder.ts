import { DefinePlugin, Plugin } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { PluginBuilder } from "./PluginBuilder";
import {
  ASSET_MANIFEST_FILE_NAME,
  PUBLIC_DIR_NAME,
} from "../../app-config/TaskContants";

interface Env {
  [key: string]: number | string;
}

export function toProcessEnv(env: Env): Env {
  return Object.keys(env).reduce<Env>((acc, key) => {
    const value = env[key];

    // Skip `nil` values.
    if (value != null) {
      acc[`process.env.${key}`] = JSON.stringify(value);
    }

    return acc;
  }, {});
}

export class DefinePluginBuilder extends PluginBuilder {
  private readonly envDefinitions: Env = {};

  private readonly globalDefinitions: Env = {};

  public constructor(options: BuilderOptions) {
    super("DefinePluginBuilder", options);

    const { mode, target, config } = options;

    this.addEnvDefinitions({
      APP_BUILD_MODE: mode,
      APP_BUILD_TARGET: target,
      APP_BUILD_PUBLIC_DIR: PUBLIC_DIR_NAME,
      APP_BUILD_ASSET_MANIFEST_FILE_NAME: ASSET_MANIFEST_FILE_NAME,
    });

    if (this.isWeb) {
      const { clientConfig } = config;
      const env = clientConfig && clientConfig.env;

      if (env) {
        this.addEnvDefinitions(env as Env);
      }
    }

    if (this.isNode) {
      const { serverConfig } = config;
      const env = serverConfig && serverConfig.env;

      if (env) {
        this.addEnvDefinitions(env as Env);
      }
    }
  }

  public addRawDefinitions(rawDefinitions: {
    [key: string]: number | string;
  }): this {
    Object.assign(this.globalDefinitions, rawDefinitions);

    return this;
  }

  public addEnvDefinitions(definitions: Env): this {
    Object.assign(this.envDefinitions, toProcessEnv(definitions));

    return this;
  }

  public build(): Plugin | null {
    return new DefinePlugin({
      ...this.globalDefinitions,
      ...this.envDefinitions,
    });
  }
}
