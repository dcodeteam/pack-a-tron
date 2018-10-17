import * as fs from "fs";
import * as path from "path";

import { AppContextPreset } from "../app/AppContext";

export interface CliConfig {
  preset: AppContextPreset;
}

const CONFIG_FILE_NAME = "packatron.config.js";
const APP_CONTEXT_PRESETS: AppContextPreset[] = ["ssr", "client", "server"];

export function parseCliConfig(cwd: string): CliConfig {
  const configPath = path.join(cwd, CONFIG_FILE_NAME);

  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file "${configPath}" not found.`);
  }

  // eslint-disable-next-line typescript/no-var-requires,import/no-dynamic-require,global-require
  const { preset, ...unknownProps } = require(configPath);

  if (!APP_CONTEXT_PRESETS.includes(preset)) {
    throw new Error(
      `Unknown preset "${preset}", expected on of ${APP_CONTEXT_PRESETS.map(
        x => `"${x}"`
      ).join(", ")}.`
    );
  }

  const unknownPropsKeys = Object.keys(unknownProps);

  if (unknownPropsKeys.length > 0) {
    throw new Error(
      `There are ${
        unknownPropsKeys.length
      } props in config: ${unknownPropsKeys.map(x => `"${x}"`).join(", ")}.`
    );
  }

  return { preset };
}
