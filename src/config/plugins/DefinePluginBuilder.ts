import { DefinePlugin, Plugin } from "webpack";

import { BuilderOptions } from "../AbstractConfigBuilder";
import { ManifestPluginBuilder } from "./ManifestPluginBuilder";
import { PluginBuilder } from "./PluginBuilder";

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
  private readonly envDefinitions: Env;

  private readonly globalDefinitions: Env;

  public constructor(options: BuilderOptions) {
    super("ManifestPluginBuilder", options);

    this.envDefinitions = {};
    this.globalDefinitions = {};

    const { appProtocol, appHost, appPort, appDevPort, env } = options.ctx;

    this.addEnvDefinitions({
      ...env,

      APP_PROTOCOL: appProtocol,
      APP_HOST: appHost,
      APP_PORT: appPort,
      APP_DEV_PORT: appDevPort,
      APP_ASSET_MANIFEST_FILE_NAME:
        ManifestPluginBuilder.ASSET_MANIFEST_FILE_NAME,
    });
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
