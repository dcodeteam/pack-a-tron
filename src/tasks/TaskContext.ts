import { YarnWorkspace } from "../cli/CliUtils";

export interface TaskContextEnv {
  readonly [key: string]: undefined | string;
}

export class TaskContext {
  public readonly cwd: string;

  public readonly env: TaskContextEnv;

  public readonly workspaces: YarnWorkspace[];

  public constructor(
    cwd: string,
    env: TaskContextEnv,
    workspaces: YarnWorkspace[],
  ) {
    this.cwd = cwd;
    this.env = env;
    this.workspaces = workspaces;
  }

  public get appProtocol(): "http" | "https" {
    return this.env.APP_PROTOCOL === "https" ? "https" : "http";
  }

  public get appHost(): string {
    return this.env.APP_HOST || "0.0.0.0";
  }

  public get appPort(): number {
    return Number(this.env.APP_PORT) || 3000;
  }

  public get appDevPort(): number {
    return Number(this.env.APP_DEV_PORT) || this.appPort + 1;
  }

  public get appFullHost(): string {
    return `${this.appProtocol}://${this.appHost}:${this.appPort}`;
  }

  public get appFullDevHost(): string {
    return `${this.appProtocol}://${this.appHost}:${this.appDevPort}`;
  }

  public cloneWithEnv(env: TaskContextEnv) {
    return new TaskContext(this.cwd, env, this.workspaces);
  }
}
