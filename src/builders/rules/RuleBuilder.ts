import { RuleSetCondition, RuleSetLoader, RuleSetRule } from "webpack";

import {
  AbstractConfigBuilder,
  BuilderOptions,
} from "../abstract/AbstractConfigBuilder";

export class RuleBuilder extends AbstractConfigBuilder<null | RuleSetRule> {
  protected use: Array<RuleSetLoader>;

  protected test: Array<RuleSetCondition>;

  protected include: Array<RuleSetCondition>;

  protected exclude: Array<RuleSetCondition>;

  protected sideEffects?: boolean;

  public constructor(name: string, options: BuilderOptions) {
    super(name, options);

    this.use = [];
    this.test = [];
    this.include = [];
    this.exclude = [];
  }

  public includeSrc(): this {
    const {
      absoluteSrcDir,
      config: { workspaceLocationsPattern },
    } = this;

    this.include = [absoluteSrcDir];

    if (workspaceLocationsPattern) {
      this.include.push(workspaceLocationsPattern);
    }

    return this;
  }

  public build(): null | RuleSetRule {
    const { use, test, include, exclude, sideEffects } = this;

    if (use.length === 0) {
      return null;
    }

    return this.use.length === 0
      ? null
      : {
          use,
          test: test.length > 0 ? test : undefined,
          include: include.length > 0 ? include : undefined,
          exclude: exclude.length > 0 ? exclude : undefined,
          sideEffects: sideEffects == null ? undefined : sideEffects,
        };
  }
}
