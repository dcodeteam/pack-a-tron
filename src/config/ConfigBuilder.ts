import * as path from "path";

import {
  Configuration,
  DefinePlugin,
  ExternalsFunctionElement,
  Node,
  Options,
  Output,
  RuleSetCondition,
  RuleSetRule,
  RuleSetUse
} from "webpack";
import * as WebpackDevServer from "webpack-dev-server";

import { CliLogger } from "../cli/CliLogger";
import { TaskContext } from "../tasks/TaskContext";

export type ConfigMode = "production" | "development";

interface ConfigBuilderOptions {
  readonly mode: ConfigMode;

  readonly entryFile: string;
  readonly publicPath: string;
}

export class ConfigBuilder {
  protected readonly logger: CliLogger;

  protected readonly ctx: TaskContext;

  protected readonly options: ConfigBuilderOptions;

  protected readonly workspacesNameRegExp?: RegExp;

  protected readonly workspacesPathRegExp?: RegExp;

  public constructor(ctx: TaskContext, options: ConfigBuilderOptions) {
    this.ctx = ctx;
    this.options = options;
    this.logger = new CliLogger("ConfigBuilder", "bgYellow");

    if (ctx.workspaces.length > 0) {
      this.workspacesNameRegExp = new RegExp(
        ctx.workspaces.map(x => x.name).join("|")
      );

      this.workspacesPathRegExp = new RegExp(
        ctx.workspaces.map(x => x.location).join("|")
      );
    }
  }

  protected get isDev() {
    return this.options.mode === "development";
  }

  protected get isProd() {
    return this.options.mode === "production";
  }

  //
  // Utility
  //

  protected tryResolve(id: string): null | string {
    try {
      return require.resolve(id);
    } catch (e) {
      return null;
    }
  }

  //
  // Mode
  //

  protected getMode(): ConfigMode {
    return this.options.mode;
  }

  //
  // Entry And Context
  //

  protected getContext(): string {
    return this.ctx.cwd;
  }

  protected getEntry(): string[] {
    return [path.join(this.ctx.cwd, this.options.entryFile)];
  }

  //
  // Output
  //

  protected getOutput(): Output {
    const { publicPath } = this.options;

    return {
      publicPath,
      path: this.ctx.appBuild,

      filename: "[name]-bundle.js",
      chunkFilename: "[name]-chunk.js"
    };
  }

  //
  // Module
  //

  /**
   * Process JSON files.
   */
  protected getJsonLoader(): RuleSetRule {
    const use: RuleSetUse = [];
    const jsonLoader = this.tryResolve("json-loader");

    if (jsonLoader) {
      use.push(jsonLoader);
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return { use, test: /.json$/ };
  }

  /**
   * Generate generic `babel-loader` options.
   */
  protected getBabelLoaderOptions(): {
    presets: unknown[];
    plugins: unknown[];
    babelrc: boolean;
    configFile: boolean;
    cacheDirectory: boolean;
    cacheCompression: boolean;
  } {
    return {
      presets: [],
      plugins: [],

      // Ignore configs.
      babelrc: false,
      configFile: false,

      // This is a feature of `babel-loader` for webpack (not Babel itself).
      // It enables caching results in ./node_modules/.cache/babel-loader/
      // directory for faster rebuilds.
      cacheDirectory: true,
      // Don't waste time on Gzipping the cache
      cacheCompression: false
    };
  }

  protected getAppIncludeCondition(): RuleSetCondition {
    const rule: RuleSetCondition[] = [this.ctx.appSrc];

    if (this.workspacesPathRegExp) {
      rule.push(this.workspacesPathRegExp);
    }

    return rule;
  }

  /**
   * Process JavaScript files.
   */
  protected getJavaScriptLoader(): RuleSetRule {
    const use: RuleSetUse = [];
    const babelLoader = this.tryResolve("babel-loader");

    if (babelLoader) {
      use.push({
        options: this.getBabelLoaderOptions(),
        loader: require.resolve("babel-loader")
      });
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return {
      use,
      test: /\.(js|jsx)$/,
      exclude: [/node_modules/],
      include: this.getAppIncludeCondition()
    };
  }

  /**
   * Process TypeScript files.
   */
  protected getTypeScriptLoader(): RuleSetRule {
    const use: RuleSetUse = [];

    const tsLoader = this.tryResolve("ts-loader");
    const babelLoader = this.tryResolve("babel-loader");

    if (babelLoader) {
      use.push({
        loader: babelLoader,
        options: this.getBabelLoaderOptions()
      });
    }

    if (tsLoader) {
      use.push({
        loader: tsLoader,
        options: { transpileOnly: true }
      });
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return {
      use,
      test: /\.(ts|tsx)$/,
      exclude: [/node_modules/],
      include: this.getAppIncludeCondition()
    };
  }

  //
  // Resolve
  //

  /**
   *  Support TypeScript and JSX files.
   */
  protected getExtensions(): string[] {
    return [".tsx", ".ts", ".mjs", ".jsx", ".js", ".json"];
  }

  //
  // Optimization
  //

  protected getOptimization(): Options.Optimization {
    return {
      // Prevents Webpack from printing out compile time stats to the console.
      noEmitOnErrors: true,

      // Tells webpack to set process.env.NODE_ENV to current build mode.
      nodeEnv: this.options.mode
    };
  }

  //
  // Plugins
  //

  protected getDefinePluginDefinitions(): { [key: string]: string } {
    const { publicPath } = this.options;

    return {
      APP_PUBLIC_PATH: JSON.stringify(publicPath)
    };
  }

  //
  // DevServer
  //

  protected getDevServer(): undefined | WebpackDevServer.Configuration {
    return undefined;
  }

  //
  // Devtool
  //

  protected getDevTool(): Options.Devtool {
    return "source-map";
  }

  //
  // Target
  //

  protected getTarget(): Configuration["target"] {
    return undefined;
  }

  //
  // Externals
  //

  protected getExternals(): undefined | ExternalsFunctionElement {
    return undefined;
  }

  //
  // Node
  //

  protected getNode(): undefined | Node {
    return undefined;
  }

  //
  // Performance
  //

  protected getPerformance(): undefined | Options.Performance {
    return undefined;
  }

  //
  // Other Options
  //

  protected getBail(): boolean {
    return this.isProd;
  }

  public build(): Configuration {
    return {
      /**
       * @see https://webpack.js.org/concepts/mode/
       */
      mode: this.getMode(),

      /**
       * @see https://webpack.js.org/configuration/entry-context/#context
       */
      context: this.getContext(),

      /**
       * @see https://webpack.js.org/configuration/entry-context/#entry
       */
      entry: this.getEntry(),

      /**
       * @see https://webpack.js.org/configuration/output/
       */
      output: this.getOutput(),

      /**
       * @see https://webpack.js.org/configuration/module/
       */
      module: {
        strictExportPresence: true,

        rules: [
          // Disable require.ensure as it's not a standard language feature.
          { parser: { requireEnsure: false } },

          // Avoid "require is not defined" errors
          {
            test: /\.mjs$/,
            include: /node_modules/,
            type: "javascript/auto"
          },

          {
            // "oneOf" will traverse all following loaders until one will
            // match the requirements. When no loader matches it will fall
            // back to the "file" loader at the end of the loader list.
            oneOf: [
              this.getJsonLoader(),
              this.getJavaScriptLoader(),
              this.getTypeScriptLoader()
            ]
          }
        ]
      },

      /**
       * @see https://webpack.js.org/configuration/resolve/
       */
      resolve: {
        /**
         * @see https://webpack.js.org/configuration/resolve/#resolve-extensions
         */
        extensions: this.getExtensions()
      },

      /**
       * @see https://webpack.js.org/configuration/optimization/
       */
      optimization: this.getOptimization(),

      /**
       * @see https://webpack.js.org/configuration/plugins/
       */
      plugins: [new DefinePlugin(this.getDefinePluginDefinitions())],

      /**
       * https://webpack.js.org/configuration/dev-server/
       */
      devServer: this.getDevServer(),

      /**
       * @see https://webpack.js.org/configuration/devtool/
       */
      devtool: this.getDevTool(),

      /**
       * @see https://webpack.js.org/configuration/target/
       */
      target: this.getTarget(),

      /**
       * @see https://webpack.js.org/configuration/externals/#function
       */
      externals: this.getExternals(),

      /**
       * @see https://webpack.js.org/configuration/node/
       */
      node: this.getNode(),

      /**
       * @see https://webpack.js.org/configuration/performance/
       */
      performance: this.getPerformance(),

      /**
       * @see https://webpack.js.org/configuration/other-options/#bail
       */
      bail: this.getBail()
    };
  }
}
