import * as path from "path";

import {
  Configuration,
  DefinePlugin,
  ExternalsFunctionElement,
  HotModuleReplacementPlugin,
  Node,
  Options,
  Output,
  Plugin,
  RuleSetCondition,
  RuleSetLoader,
  RuleSetRule,
  RuleSetUse,
} from "webpack";
import * as WebpackDevServer from "webpack-dev-server";

import { CliLogger } from "../cli/CliLogger";
import { TaskContext } from "../tasks/TaskContext";
import { envToRaw } from "./utils/ConfigUtils";

export type ConfigMode = "production" | "development";

interface ConfigBuilderOptions {
  readonly mode: ConfigMode;

  readonly paths: {
    readonly srcDir: string;
    readonly buildDir: string;
    readonly entryFile: string;
    readonly publicPath: string;
  };
}

export type BabelDependency<T = object> = [string, T];

export interface BabelLoader extends RuleSetLoader {
  options: {
    babelrc?: boolean;
    configFile?: boolean;
    cacheDirectory?: boolean;
    cacheCompression?: boolean;

    presets: BabelDependency[];
    plugins: BabelDependency[];
  };
}

export class ConfigBuilder {
  public static readonly ASSET_MANIFEST_FILE_NAME = "asset-manifest.json";

  protected readonly ctx: TaskContext;

  protected readonly options: ConfigBuilderOptions;

  protected readonly logger: CliLogger;

  protected readonly workspacesNameRegExp?: RegExp;

  protected readonly workspacesPathRegExp?: RegExp;

  public constructor(ctx: TaskContext, options: ConfigBuilderOptions) {
    this.ctx = ctx;
    this.options = options;
    this.logger = new CliLogger("ConfigBuilder", "bgYellow");

    if (ctx.workspaces.length > 0) {
      this.workspacesNameRegExp = new RegExp(
        ctx.workspaces.map(x => x.name).join("|"),
      );

      this.workspacesPathRegExp = new RegExp(
        ctx.workspaces.map(x => x.location).join("|"),
      );
    }
  }

  //
  // Utility
  //

  protected get isDev() {
    return this.options.mode === "development";
  }

  protected get isProd() {
    return this.options.mode === "production";
  }

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
    const { entryFile } = this.options.paths;

    return [`./${entryFile}`];
  }

  //
  // Output
  //

  protected getOutput(): Output {
    const { cwd } = this.ctx;
    const { buildDir, publicPath } = this.options.paths;

    return {
      publicPath,
      path: path.join(cwd, buildDir),

      filename: "[name]-bundle.js",
      chunkFilename: "[name]-chunk.js",
    };
  }

  //
  // Module
  //

  protected getAppIncludeCondition(): RuleSetCondition {
    const { cwd } = this.ctx;
    const { srcDir } = this.options.paths;

    const rule: RuleSetCondition[] = [path.join(cwd, srcDir)];

    if (this.workspacesPathRegExp) {
      rule.push(this.workspacesPathRegExp);
    }

    return rule;
  }

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

  protected getBabelLoader(): undefined | BabelLoader {
    const loader = this.tryResolve("babel-loader");

    if (!loader) {
      return undefined;
    }

    const resolveBabelDependencies = (dependencies: BabelDependency[]) =>
      dependencies.reduce<BabelDependency[]>((acc, [id, options]) => {
        const idPath = this.tryResolve(id);

        if (idPath) {
          acc.push([idPath, options]);
        }

        return acc;
      }, []);

    return {
      loader,
      options: {
        // Ignore configs.
        babelrc: false,
        configFile: false,

        // This is a feature of `babel-loader` for webpack (not Babel itself).
        // It enables caching results in ./node_modules/.cache/babel-loader/
        // directory for faster rebuilds.
        cacheDirectory: true,
        // Don't waste time on Gzipping the cache
        cacheCompression: false,

        presets: resolveBabelDependencies([
          [
            "@babel/preset-env",
            {
              // Disallow users to change this configuration.
              ignoreBrowserslistConfig: true,

              // If users import all core-js they're probably not concerned with
              // bundle size. We shouldn't rely on magic to try and shrink it.
              useBuiltIns: false,

              // Do not transform modules to CJS.
              modules: false,

              // Exclude transforms that make all code slower.
              exclude: ["transform-typeof-symbol"],
            },
          ],

          [
            "@babel/preset-react",
            {
              // Adds component stack to warning messages
              // Adds __self attribute to JSX which React will use for some warnings
              development: this.isDev,

              // Will use the native built-in instead of trying to polyfill
              // behavior for any plugins that require one.
              useBuiltIns: true,
            },
          ],
        ]),

        plugins: resolveBabelDependencies([
          // Necessary to include regardless of the environment because
          // in practice some other transforms (such as object-rest-spread)
          // don't work without it: https://github.com/babel/babel/issues/7215
          [
            "@babel/plugin-transform-destructuring",
            {
              // Use `Object.assign`.
              useBuiltIns: true,
            },
          ],

          // Enable class properties proposal.
          // See discussion in https://github.com/facebook/create-react-app/issues/4263
          [
            "@babel/plugin-proposal-class-properties",

            {
              // Do not use `Object.defineProperty`.
              loose: true,
            },
          ],

          // Enable `object-reset-spread` proposal.
          [
            "@babel/plugin-proposal-object-rest-spread",

            {
              // Use `Object.assign`.
              useBuiltIns: true,
            },
          ],

          [
            "@babel/plugin-transform-runtime",
            {
              // Do not import `core-js`.
              corejs: false,

              // Use `runtime` helpers.
              helpers: true,

              // Do not polyfill `regenerator`.
              regenerator: false,

              // Do not use `ES` modules.
              useESModules: true,
            },
          ],
        ]),
      },
    };
  }

  /**
   * Process JavaScript files.
   */
  protected getJavaScriptLoader(): RuleSetRule {
    const use: RuleSetUse = [];
    const babelLoader = this.getBabelLoader();

    if (babelLoader) {
      use.push(babelLoader);
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return {
      use,
      test: /\.(js|jsx)$/,
      exclude: [/node_modules/],
      include: this.getAppIncludeCondition(),
    };
  }

  /**
   * Process TypeScript files.
   */
  protected getTypeScriptLoader(): RuleSetRule {
    const use: RuleSetUse = [];

    const tsLoader = this.tryResolve("ts-loader");
    const babelLoader = this.getBabelLoader();

    if (babelLoader) {
      use.push(babelLoader);
    }

    if (tsLoader) {
      use.push({
        loader: tsLoader,
        options: { transpileOnly: true },
      });
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return {
      use,
      test: /\.(ts|tsx)$/,
      exclude: [/node_modules/],
      include: this.getAppIncludeCondition(),
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
      nodeEnv: this.options.mode,
    };
  }

  //
  // Plugins
  //

  protected getDefinePluginEnv(): { [key: string]: unknown } {
    const { env, appProtocol, appHost, appPort, appDevPort } = this.ctx;

    return {
      ...env,

      APP_PROTOCOL: appProtocol,
      APP_HOST: appHost,
      APP_PORT: appPort,
      APP_DEV_PORT: appDevPort,

      APP_ASSET_MANIFEST_FILE_NAME: ConfigBuilder.ASSET_MANIFEST_FILE_NAME,
    };
  }

  protected getDefinePlugin() {
    return new DefinePlugin(envToRaw(this.getDefinePluginEnv()));
  }

  protected getManifestPlugin(): undefined | Plugin {
    return undefined;
  }

  protected getHotModuleReplacementPlugin():
    | undefined
    | HotModuleReplacementPlugin {
    return undefined;
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

  // Watch and WatchOptions

  protected getWatch(): boolean {
    return this.isDev;
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
            type: "javascript/auto",
          },

          {
            // "oneOf" will traverse all following loaders until one will
            // match the requirements. When no loader matches it will fall
            // back to the "file" loader at the end of the loader list.
            oneOf: [
              this.getJsonLoader(),
              this.getJavaScriptLoader(),
              this.getTypeScriptLoader(),
            ],
          },
        ],
      },

      /**
       * @see https://webpack.js.org/configuration/resolve/
       */
      resolve: {
        /**
         * @see https://webpack.js.org/configuration/resolve/#resolve-extensions
         */
        extensions: this.getExtensions(),
      },

      /**
       * @see https://webpack.js.org/configuration/optimization/
       */
      optimization: this.getOptimization(),

      /**
       * @see https://webpack.js.org/configuration/plugins/
       */
      plugins: [
        this.getDefinePlugin(),
        this.getManifestPlugin(),
        this.getHotModuleReplacementPlugin(),
      ].filter((x): x is Plugin => x != null),

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
       * @see https://webpack.js.org/configuration/watch/
       */
      watch: this.getWatch(),

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
      bail: this.getBail(),
    };
  }
}
