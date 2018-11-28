import { TextCommand } from "../cli/CliUtils";

export abstract class BaseTask {
  public constructor(public readonly commands: TextCommand[]) {
    // Noop.
  }

  public abstract run(): Promise<void>;

  public abstract stop(): Promise<void>;
}
