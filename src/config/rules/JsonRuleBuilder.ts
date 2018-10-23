import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { RuleBuilder } from "./RuleBuilder";

export class JsonRuleBuilder extends RuleBuilder {
  public constructor(options: BuilderOptions) {
    super("JsonRuleBuilder", options);

    this.test = [/\.json$/];

    const loader = tryResolve("json-loader");

    if (loader) {
      this.use = [{ loader }];
    }
  }
}
