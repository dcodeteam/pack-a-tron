import { RuleSetLoader } from "webpack";

import { BuilderOptions } from "../AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { JSLoaderBuilder } from "./JSLoaderBuilder";
import { LoaderBuilder } from "./LoaderBuilder";

export class TSLoaderBuilder extends LoaderBuilder {
  public static createTSLoader(): null | RuleSetLoader {
    const loader = tryResolve("ts-loader");

    if (!loader) {
      return null;
    }

    return { loader, options: { transpileOnly: true } };
  }

  public constructor(options: BuilderOptions) {
    super("TSLoaderBuilder", options);

    this.test = [/\.(ts|tsx)$/];

    const tsLoader = TSLoaderBuilder.createTSLoader();

    if (tsLoader) {
      this.use.unshift(tsLoader);
    }

    const babelLoader = JSLoaderBuilder.createBabelLoader(options);

    if (babelLoader) {
      this.use.unshift(babelLoader);
    }
  }
}
