import * as path from "path";

import { ExternalsFunctionElement, Node, Options, Output } from "webpack";

import { ConfigBuilder } from "./ConfigBuilder";

export class ServerConfigBuilder extends ConfigBuilder {
  protected getOutput(): Output {
    return {
      ...super.getOutput(),
      filename: "index.js",
      libraryTarget: "commonjs2"
    };
  }

  protected getBabelLoaderOptions() {
    const options = super.getBabelLoaderOptions();
    const babelPresetEnv = this.tryResolve("@babel/preset-env");

    if (babelPresetEnv) {
      options.presets.unshift([
        babelPresetEnv,
        { modules: false, targets: { node: "8.3.0" } }
      ]);
    }

    return options;
  }

  protected getOptimization(): Options.Optimization {
    return {
      ...super.getOptimization(),

      // Do not minimize server output.
      minimize: false
    };
  }

  protected getTarget(): "node" {
    return "node";
  }

  protected getExternals(): ExternalsFunctionElement {
    return (_context, request: string, callback) => {
      const isRelative = request.startsWith(".");
      const isAbsolute = path.isAbsolute(request);
      const isWebpackLoader = request.includes("!");
      const isWorkspace = Boolean(
        this.workspacesNameRegExp && this.workspacesNameRegExp.test(request)
      );

      // TODO: Add support for assets.
      if (isRelative || isAbsolute || isWorkspace || isWebpackLoader) {
        callback(undefined, undefined);
      } else {
        callback(undefined, `commonjs ${request}`);
      }
    };
  }

  protected getNode(): Node {
    return {
      console: false,
      process: false,
      global: false,

      __dirname: false,
      __filename: false,

      Buffer: false,
      setImmediate: false
    };
  }

  protected getPerformance(): Options.Performance {
    return { hints: false };
  }
}
