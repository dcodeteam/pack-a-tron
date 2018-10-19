import * as path from "path";

import { ExternalsFunctionElement, Node, Options, Output } from "webpack";

import { BabelLoader, ConfigBuilder } from "./ConfigBuilder";

export class ServerConfigBuilder extends ConfigBuilder {
  protected getOutput(): Output {
    return {
      ...super.getOutput(),

      filename: "index.js",
      libraryTarget: "commonjs2",
    };
  }

  protected getBabelLoader(): undefined | BabelLoader {
    const loader = super.getBabelLoader();

    if (!loader) {
      return undefined;
    }

    loader.options.presets.forEach(([id, options]) => {
      if (id.includes("@babel/preset-env")) {
        Object.assign(options, {
          // We want to support node 8.0.0.
          targets: { node: "8.0.0" },
        });
      }
    });

    return loader;
  }

  protected getOptimization(): Options.Optimization {
    return {
      ...super.getOptimization(),

      // Do not minimize server output.
      minimize: false,
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
      const isBabelRuntime = request.includes("@babel/runtime");
      const isWorkspace = Boolean(
        this.workspacesNameRegExp && this.workspacesNameRegExp.test(request),
      );

      // TODO: Add support for assets.
      if (
        isRelative ||
        isAbsolute ||
        isWorkspace ||
        isBabelRuntime ||
        isWebpackLoader
      ) {
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
      setImmediate: false,
    };
  }

  protected getPerformance(): Options.Performance {
    return { hints: false };
  }
}
