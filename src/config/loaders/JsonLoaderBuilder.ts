import { BuilderOptions } from "../AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { LoaderBuilder } from "./LoaderBuilder";

export class JsonLoaderBuilder extends LoaderBuilder {
  public constructor(options: BuilderOptions) {
    super("JsonLoaderBuilder", options);

    this.test = [/\.json$/];

    const loader = tryResolve("json-loader");

    if (loader) {
      this.use = [{ loader }];
    }
  }
}
