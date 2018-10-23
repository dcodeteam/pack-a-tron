import { Plugin } from "webpack";

import {
  AbstractConfigBuilder,
  BuilderOptions,
} from "../AbstractConfigBuilder";

export class PluginBuilder extends AbstractConfigBuilder<null | Plugin> {
  public constructor(name: string, options: BuilderOptions) {
    super(name, options);
  }

  public build(): null | Plugin {
    return null;
  }
}
