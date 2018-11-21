import { exec, ExecOptions } from "child_process";

import stripAnsi from "strip-ansi";

export interface YarnWorkspace {
  name: string;
  location: string;
}

function execAsync(command: string, options?: ExecOptions): Promise<string> {
  return new Promise((resolve, reject) =>
    exec(command, options, (error, stdout) =>
      error ? reject(error) : resolve(stripAnsi(stdout.toString())),
    ),
  );
}

function tryExecAsync(
  command: string,
  options?: ExecOptions,
): Promise<null | string> {
  return execAsync(command, options).catch(() => null);
}

export async function getYarnWorkspaces(cwd: string): Promise<YarnWorkspace[]> {
  const json = await tryExecAsync("yarn workspaces info --silent", {
    cwd,
  });

  if (!json) {
    return [];
  }

  const data = JSON.parse(json);

  return Object.keys(data).map<YarnWorkspace>(name => ({
    name,
    location: data[name].location,
  }));
}

const EXIT_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

function asyncTimeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export function onExitSignal(fn: () => void | Promise<void>): void {
  EXIT_SIGNALS.forEach(signal => {
    process.on(signal, async () => {
      await Promise.race([fn(), asyncTimeout(100)]);

      process.exit(0);
    });
  });
}
