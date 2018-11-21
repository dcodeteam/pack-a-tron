import { ExecOptions, exec } from "child_process";
import stripAnsi from "strip-ansi";

export function execAsync(
  command: string,
  options?: ExecOptions,
): Promise<string> {
  return new Promise((resolve, reject) =>
    exec(command, options, (error, stdout) =>
      error ? reject(error) : resolve(stripAnsi(stdout.toString())),
    ),
  );
}

export function tryExecAsync(
  command: string,
  options?: ExecOptions,
): Promise<null | string> {
  return execAsync(command, options).catch(() => null);
}
