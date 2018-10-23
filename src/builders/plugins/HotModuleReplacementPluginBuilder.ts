import { HotModuleReplacementPlugin, Plugin } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { PluginBuilder } from "./PluginBuilder";

export class HotModuleReplacementPluginBuilder extends PluginBuilder {
  public constructor(options: BuilderOptions) {
    super("HotModuleReplacementPluginBuilder", options);
  }

  public build(): Plugin | null {
    // Skip for `node` or in `production`.
    if (this.isNode || this.isProd) {
      return null;
    }

    return new HotModuleReplacementPlugin();
  }
}
