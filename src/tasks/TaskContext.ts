import * as path from "path";

import { YarnWorkspace } from "../cli/CliUtils";

export class TaskContext {
  public readonly cwd: string;

  public readonly workspaces: YarnWorkspace[];

  public constructor(cwd: string, workspaces: YarnWorkspace[]) {
    this.cwd = cwd;
    this.workspaces = workspaces;
  }

  public get appSrc() {
    return path.join(this.cwd, "src");
  }

  public get appBuild() {
    return path.join(this.cwd, "build");
  }
}
