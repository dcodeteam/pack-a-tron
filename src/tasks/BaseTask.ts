export abstract class BaseTask {
  public abstract run(): Promise<void>;

  public abstract stop(): Promise<void>;
}
