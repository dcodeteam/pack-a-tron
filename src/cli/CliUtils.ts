import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

import stripAnsi from "strip-ansi";

import { CliConfig } from "./CliConfig";

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
    location: data[name].location,
  }));
}

const EXIT_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

export function onExitSignal(fn: () => void | Promise<void>): void {
  EXIT_SIGNALS.forEach(signal => {
    process.on(signal, async () => {
      await fn();

      process.exit();
    });
  });
}

export function reactCliConfigFile(
  cwd: string,
  configFile = "pack-o-tron.config.js",
) {
  const configPath = path.join(cwd, configFile);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file "${configPath}" not found.`);
  }

  return require(configPath);
}

export function parseCliConfig(config: Partial<CliConfig>): CliConfig {
  const { createApps, ...unknownProps } = config;

  if (!createApps || typeof createApps !== "function") {
    throw new Error(`Invalid  "config.createApps".`);
  }

  const unknownPropsKeys = Object.keys(unknownProps);

  if (unknownPropsKeys.length > 0) {
    throw new Error(
      `There are ${
        unknownPropsKeys.length
      } props in config: ${unknownPropsKeys.map(x => `"${x}"`).join(", ")}.`,
    );
  }

  return { createApps };
}

export function parseCliConfigFile(
  cwd: string,
  configFile?: string,
): CliConfig {
  return parseCliConfig(reactCliConfigFile(cwd, configFile));
}
