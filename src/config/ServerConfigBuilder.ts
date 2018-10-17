import * as path from "path";

import { ExternalsFunctionElement, Node, Options, Output } from "webpack";

import { ConfigBuilder } from "./ConfigBuilder";

export class ServerConfigBuilder extends ConfigBuilder {
  //
  // Output
  //

  protected getOutput(): Output {
    return {
      ...super.getOutput(),
      filename: "index.js",
      libraryTarget: "commonjs2"
    };
  }

  //
  // Module
  //

  protected getBabelLoaderOptions() {
    const options = super.getBabelLoaderOptions();

    try {
      options.presets.push([
        require.resolve("@babel/preset-env"),
        { modules: false, targets: { node: "8.3.0" } }
      ]);
    } catch (e) {}

    return options;
  }

  //
  // Optimization
  //

  protected getOptimization(): Options.Optimization {
    return {
      ...super.getOptimization(),

      // Do not minimize server output.
      minimize: false
    };
  }

  //
  // Target
  //

  protected getTarget(): "node" {
    return "node";
  }

  //
  // Externals
  //

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

  //
  // Node
  //

  protected getNode(): Node {
    return {
      __dirname: true,
      __filename: true
    };
  }

  //
  // Other Options
  //

  protected getBail() {
    // Only bail in production mode.
    return this.options.mode === "production";
  }
}
