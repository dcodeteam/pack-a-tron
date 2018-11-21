export interface YarnWorkspace {
  name: string;
  location: string;
}

export interface TaskConfigEnv {
  [name: string]: string | undefined;
}

export interface TaskConfigClientOptions {
  entryFile: string;
  env?: TaskConfigEnv;

  dev?: {
    protocol?: "http" | "https";
    host?: string;
    serverPort?: number;
    devServerPort?: number;
  };
}

export interface TaskConfigServerOptions {
  entryFile: string;
  env?: TaskConfigEnv;
}

export interface TaskConfigOptions {
  srcDir?: string;
  workspaces?: YarnWorkspace[];
  client?: TaskConfigClientOptions;
  server?: TaskConfigServerOptions;
}

export class TaskConfig {
  public readonly workspaceNamesPattern: null | RegExp;

  public readonly workspaceLocationsPattern: null | RegExp;

  public constructor(
    public readonly cwd: string,
    private readonly options: TaskConfigOptions,
  ) {
    const { workspaces } = this;

    if (workspaces.length === 0) {
      this.workspaceNamesPattern = null;
      this.workspaceLocationsPattern = null;
    } else {
      this.workspaceNamesPattern = new RegExp(
        workspaces.map(x => x.name).join("|"),
      );

      this.workspaceLocationsPattern = new RegExp(
        workspaces.map(x => x.location).join("|"),
      );
    }
  }

  public get srcDir(): string {
    const { srcDir } = this.options;

    if (!srcDir) {
      throw new Error(`Invalid "srcDir" with value "${srcDir}".`);
    }

    return srcDir;
  }

  public get clientConfig(): undefined | TaskConfigClientOptions {
    return this.options.client;
  }

  public get clientProtocol(): "http" | "https" {
    const config = this.clientConfig;
    const protocol = config && config.dev && config.dev.protocol;

    if (protocol !== "http" && protocol !== "https") {
      throw new Error(
        `Invalid "client.dev.protocol" with value "${protocol}".`,
      );
    }

    return protocol;
  }

  public get clientHost(): string {
    const config = this.clientConfig;
    const host = config && config.dev && config.dev.host;

    if (!host) {
      throw new Error(`Invalid "client.dev.host" with value "${host}".`);
    }

    return host;
  }

  public get clientServerPort(): number {
    const config = this.clientConfig;
    const serverPort = Number(config && config.dev && config.dev.serverPort);

    if (!serverPort) {
      throw new Error(
        `Invalid "client.dev.serverPort" with value "${serverPort}".`,
      );
    }

    return serverPort;
  }

  public get clientDevServerPort(): number {
    const config = this.clientConfig;
    const devServerPort = Number(
      config && config.dev && config.dev.devServerPort,
    );

    if (!devServerPort) {
      throw new Error(
        `Invalid "client.dev.devServerPort" with value "${devServerPort}".`,
      );
    }

    return devServerPort;
  }

  public get clientServerUrl(): string {
    return `${this.clientProtocol}://${this.clientHost}:${
      this.clientServerPort
    }`;
  }

  public get clientDevServerUrl() {
    return `${this.clientProtocol}://${this.clientHost}:${
      this.clientDevServerPort
    }`;
  }

  public get serverConfig(): undefined | TaskConfigServerOptions {
    return this.options.server;
  }

  public get workspaces(): YarnWorkspace[] {
    return this.options.workspaces || [];
  }
}
