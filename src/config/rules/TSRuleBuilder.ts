import { RuleSetLoader } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { JSRuleBuilder } from "./JSRuleBuilder";
import { RuleBuilder } from "./RuleBuilder";

export class TSRuleBuilder extends RuleBuilder {
  public static createTSLoader(): null | RuleSetLoader {
    const loader = tryResolve("ts-loader");

    if (!loader) {
      return null;
    }

    return { loader, options: { transpileOnly: true } };
  }

  public constructor(options: BuilderOptions) {
    super("TSRuleBuilder", options);

    this.test = [/\.(ts|tsx)$/];

    const tsLoader = TSRuleBuilder.createTSLoader();

    if (tsLoader) {
      this.use.unshift(tsLoader);
    }

    const babelLoader = JSRuleBuilder.createBabelLoader(options);

    if (babelLoader) {
      this.use.unshift(babelLoader);
    }
  }
}
