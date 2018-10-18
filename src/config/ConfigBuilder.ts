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
    const { mode, publicPath } = this.options;
    const isDev = mode === "development";

    return {
      publicPath,
      path: this.ctx.appBuild,

      filename: isDev ? "[name]-bundle.js" : "[name]-[chunkhash].js",
      chunkFilename: isDev ? "[name]-chunk.js" : "[name]-[chunkhash].js"
    };
  }

  //
  // Module
  //

  /**
   * Process JSON files.
   */
  protected getJsonLoader(): RuleSetRule {
    return {
      test: /.json$/,
      loader: require.resolve("json-loader")
    };
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

    try {
      use.push({
        options: this.getBabelLoaderOptions(),
        loader: require.resolve("babel-loader")
      });
    } catch (e) {
      this.logger.alert(
        "Failed to setup `babel-loader` for JavaScript.",
        e.stack
      );
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

    try {
      use.push({
        options: this.getBabelLoaderOptions(),
        loader: require.resolve("babel-loader")
      });
    } catch (e) {
      this.logger.alert(
        "Failed to setup `babel-loader` for TypeScript.",
        e.stack
      );
    }

    try {
      use.push({
        options: { transpileOnly: true },
        loader: require.resolve("ts-loader")
      });
    } catch (e) {
      this.logger.alert("Failed to setup `ts-loader` for TypeScript.", e.stack);
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
    return {
      hints: false
    };
  }

  //
  // Other Options
  //

  protected getBail(): boolean {
    return false;
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
            oneOf: [
              this.getJsonLoader(),
              this.getJavaScriptLoader(),
              this.getTypeScriptLoader()
            ].filter((x): x is RuleSetRule => x != null)
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
