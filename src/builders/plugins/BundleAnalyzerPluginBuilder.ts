import { Plugin } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { PluginBuilder } from "./PluginBuilder";

export class BundleAnalyzerPluginBuilder extends PluginBuilder {
  public constructor(options: BuilderOptions) {
    super("BundleAnalyzerPluginBuilder", options);
  }

  public build(): Plugin | null {
    const idPath = tryResolve("webpack-bundle-analyzer");

    if (
      !idPath ||
      this.isDev ||
      this.isNode ||
      process.env.BUILD_ANALYZE !== "true"
    ) {
      return null;
    }

    const { BundleAnalyzerPlugin } = require(idPath);

    return new BundleAnalyzerPlugin({
      openAnalyzer: true,
      analyzerMode: "static",
    });
  }
}
