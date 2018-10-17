import { exec } from "child_process";

import stripAnsi from "strip-ansi";

export interface YarnWorkspace {
  name: string;
  location: string;
}

function tryExec(cwd: string, command: string): Promise<null | string> {
  return new Promise(resolve => {
    exec(command, { cwd, encoding: "latin1" }, (error, stdout) => {
      if (error) {
        resolve(null);
      } else {
        resolve(stripAnsi(stdout));
      }
    });
  });
}

export async function getYarnWorkspaces(cwd: string): Promise<YarnWorkspace[]> {
  const json = await tryExec(cwd, "yarn workspaces info --silent");

  if (!json) {
    return [];
  }

  const data = JSON.parse(json);

  return Object.keys(data).map<YarnWorkspace>(name => ({
    name,
    location: data[name].location
  }));
}

const EXIT_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

export function onExitSignal(fn: () => void): void {
  EXIT_SIGNALS.forEach(signal => {
    process.on(signal, () => {
      fn();

      process.exit();
    });
  });
}
