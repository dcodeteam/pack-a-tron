import * as path from "path";

import { CliLogger } from "../../cli/CliLogger";
import { TaskConfig } from "../../task-config/TaskConfig";

export type BuilderTarget = "web" | "node";
export type BuilderMode = "development" | "production";

export interface BuilderPaths {
  readonly srcDir: string;
  readonly buildDir: string;
  readonly entryFile: string;
  readonly publicPath: string;
}

export interface BuilderOptions {
  config: TaskConfig;

  mode: BuilderMode;
  paths: BuilderPaths;
  target: BuilderTarget;
}

export type BuilderModifier<T> = (value: T) => T;

export abstract class AbstractConfigBuilder<T> {
  protected readonly logger: CliLogger;

  protected constructor(
    name: string,
    protected readonly options: BuilderOptions,
  ) {
    this.logger = new CliLogger(name, "bgCyan");
  }

  public get config(): TaskConfig {
    return this.options.config;
  }

  public get isDev(): boolean {
    return this.options.mode === "development";
  }

  public get isProd(): boolean {
    return this.options.mode === "production";
  }

  public get isWeb(): boolean {
    return this.options.target === "web";
  }

  public get isNode(): boolean {
    return this.options.target === "node";
  }

  public get absoluteSrcDir(): string {
    const { paths } = this.options;

    return path.join(this.config.cwd, paths.srcDir);
  }

  public get absoluteBuildDir(): string {
    const { paths } = this.options;

    return path.join(this.config.cwd, paths.buildDir);
  }

  public abstract build(): T;
}
