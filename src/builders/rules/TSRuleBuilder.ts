import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { JSRuleBuilder } from "./JSRuleBuilder";
import { RuleBuilder } from "./RuleBuilder";

export class TSRuleBuilder extends RuleBuilder {
  public constructor(options: BuilderOptions) {
    super("TSRuleBuilder", options);

    this.test = [/\.(ts|tsx)$/];

    const tsLoader = tryResolve("ts-loader");

    if (tsLoader) {
      this.use.unshift({ loader: tsLoader, options: { transpileOnly: true } });
    }

    const babelLoader = JSRuleBuilder.createBabelLoader(options);

    if (babelLoader) {
      this.use.unshift(babelLoader);
    }
  }
}
