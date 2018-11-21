import * as path from "path";

import { ExternalsFunctionElement } from "webpack";

import {
  AbstractConfigBuilder,
  BuilderOptions,
} from "../abstract/AbstractConfigBuilder";

export class ExternalsBuilder extends AbstractConfigBuilder<
  ExternalsFunctionElement
> {
  public constructor(options: BuilderOptions) {
    super("ExternalsBuilder", options);
  }

  public build(): ExternalsFunctionElement {
    const { workspaceNamesPattern } = this.config;

    return (_context, request, callback) => {
      if (
        // Include if it's Web runtime.
        this.isWeb ||
        // Include relative paths ("./foo").
        request.startsWith(".") ||
        // Include absolute paths ("/foo/bar").
        path.isAbsolute(request) ||
        // Include Webpack inline loader requires ("raw-loader!./foo").
        request.includes("!") ||
        // Include Babel runtime helpers.
        request.includes("@babel/runtime") ||
        // Include Yarn workspaces.
        Boolean(workspaceNamesPattern && workspaceNamesPattern.test(request))
      ) {
        callback(undefined, undefined);
      } else {
        callback(undefined, `commonjs ${request}`);
      }
    };
  }
}
