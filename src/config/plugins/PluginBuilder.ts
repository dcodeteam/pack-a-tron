import { Plugin } from "webpack";

import {
  AbstractConfigBuilder,
  BuilderOptions,
} from "../abstract/AbstractConfigBuilder";

export class PluginBuilder extends AbstractConfigBuilder<null | Plugin> {
  public constructor(name: string, options: BuilderOptions) {
    super(name, options);
  }

  public build(): null | Plugin {
    return null;
  }
}
