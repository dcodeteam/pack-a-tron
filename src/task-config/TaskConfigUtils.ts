import { isAbsolute, join } from "path";
import { TaskConfig, TaskConfigOptions, YarnWorkspace } from "./TaskConfig";
import { getYarnWorkspaces } from "../utils/YarnUtils";

function resolveFilePath(cwd: string, filePath: string): string {
  return isAbsolute(filePath) ? filePath : join(cwd, filePath);
}

function readPlainConfig(cwd: string, configFile: string): Partial<TaskConfig> {
  const configPath = resolveFilePath(cwd, configFile);

  try {
    return require(configPath);
  } catch (e) {
    throw new Error(`Config file "${configPath}" not found.`);
  }
}

export function parseYarnWorkspace(
  index: number,
  { name, location, ...unknownProps }: Partial<YarnWorkspace>,
): YarnWorkspace {
  if (!name) {
    throw new Error(`Invalid "workspaces[${index}].name".`);
  }

  if (!location) {
    throw new Error(`Invalid "workspaces[${index}].location".`);
  }

  const unknownPropsKeys = Object.keys(unknownProps);

  if (unknownPropsKeys.length > 0) {
    throw new Error(
      `There are ${
        unknownPropsKeys.length
      } props in config: ${unknownPropsKeys.map(x => `"${x}"`).join(", ")}.`,
    );
  }

  return { name, location };
}

export async function parseTaskConfig(
  cwd: string,
  options: TaskConfigOptions,
): Promise<TaskConfigOptions> {
  const workspaces = options.workspaces || (await getYarnWorkspaces(cwd));

  return new TaskConfig(cwd, { ...options, workspaces });
}

export async function parseTaskConfigFile(
  cwd: string,
  configFile = "pack-o-tron.config.js",
): Promise<TaskConfig> {
  const plain = readPlainConfig(cwd, configFile);

  return new TaskConfig(cwd, plain);
}
