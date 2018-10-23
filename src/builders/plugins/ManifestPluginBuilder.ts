import { Plugin } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { PluginBuilder } from "./PluginBuilder";

export class ManifestPluginBuilder extends PluginBuilder {
  public static readonly ASSET_MANIFEST_FILE_NAME = "asset-manifest.json";

  public constructor(options: BuilderOptions) {
    super("ManifestPluginBuilder", options);
  }

  public build(): Plugin | null {
    // Do not generate manifest in node.
    if (this.isNode) {
      return null;
    }

    const pluginPath = tryResolve("webpack-manifest-plugin");

    if (!pluginPath) {
      return null;
    }

    const ManifestPlugin = require(pluginPath);

    return new ManifestPlugin({
      // Write to disk, so server app will what files to use.
      writeToFileEmit: true,

      fileName: ManifestPluginBuilder.ASSET_MANIFEST_FILE_NAME,
    });
  }
}
