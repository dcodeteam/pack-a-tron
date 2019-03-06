import { Plugin } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { PluginBuilder } from "./PluginBuilder";

export class CircularDependencyPluginBuilder extends PluginBuilder {
  public constructor(options: BuilderOptions) {
    super("CircularDependencyPluginBuilder", options);
  }

  public build(): Plugin | null {
    const pluginPath = tryResolve("circular-dependency-plugin");

    if (!pluginPath) {
      return null;
    }

    const CircularDependencyPlugin = require(pluginPath);

    return new CircularDependencyPlugin({
      // exclude detection of files based on a RegExp
      exclude: /node_modules/,
      // add errors to webpack instead of warnings
      failOnError: true,
      // allow import cycles that include an asyncronous import,
      // e.g. via import(/* webpackMode: "weak" */ './file.js')
      allowAsyncCycles: false,

      // set the current working directory for displaying module paths
      cwd: this.config.cwd,
    });
  }
}
