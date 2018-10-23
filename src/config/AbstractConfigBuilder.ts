import * as path from "path";

import { CliLogger } from "../cli/CliLogger";
import { TaskContext } from "../tasks/TaskContext";

export type BuilderTarget = "web" | "node";
export type BuilderMode = "development" | "production";

export interface BuilderPaths {
  readonly srcDir: string;
  readonly buildDir: string;
  readonly entryFile: string;
  readonly publicPath: string;
}

export interface BuilderOptions {
  ctx: TaskContext;
  mode: BuilderMode;
  paths: BuilderPaths;
  target: BuilderTarget;
}

export type BuilderModifier<T> = (value: T) => T;

export abstract class AbstractConfigBuilder<T> {
  protected readonly logger: CliLogger;

  protected readonly options: BuilderOptions;

  protected constructor(name: string, options: BuilderOptions) {
    this.options = options;
    this.logger = new CliLogger(name, "bgCyan");
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
    const { ctx, paths } = this.options;

    return path.join(ctx.cwd, paths.srcDir);
  }

  public get absoluteBuildDir(): string {
    const { ctx, paths } = this.options;

    return path.join(ctx.cwd, paths.buildDir);
  }

  private workspacesNameRegExpCache?: RegExp;

  public get workspacesNameRegExp(): null | RegExp {
    const { workspaces } = this.options.ctx;

    if (workspaces.length > 0 && !this.workspacesNameRegExpCache) {
      this.workspacesNameRegExpCache = new RegExp(
        workspaces.map(x => x.name).join("|"),
      );
    }

    return this.workspacesNameRegExpCache || null;
  }

  private workspacesLocationRegExpCache?: RegExp;

  public get workspacesLocationRegExp(): null | RegExp {
    const { workspaces } = this.options.ctx;

    if (workspaces.length > 0 && !this.workspacesLocationRegExpCache) {
      this.workspacesLocationRegExpCache = new RegExp(
        workspaces.map(x => x.location).join("|"),
      );
    }

    return this.workspacesLocationRegExpCache || null;
  }

  public abstract build(): T;
}
