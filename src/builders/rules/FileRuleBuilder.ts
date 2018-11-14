import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { RuleBuilder } from "./RuleBuilder";

export class FileRuleBuilder extends RuleBuilder {
  public constructor(options: BuilderOptions) {
    super("FileRuleBuilder", options);

    const loader = tryResolve("file-loader");

    // Exclude `js` files to keep "css" loader working as it injects
    // its runtime that would otherwise be processed through "file" loader.
    // Also exclude `html` and `json` extensions so they get processed
    // by webpacks internal loaders.
    this.exclude = [/\.(js|mjs|json|html)$/];

    if (loader) {
      this.use.push({
        loader,
        options: {
          name: "static/media/[name].[hash:8].[ext]",
          outputPath: this.isNode ? "public" : undefined,
        },
      });
    }
  }
}
