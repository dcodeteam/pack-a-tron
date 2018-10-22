import * as path from "path";

import {
  Configuration,
  DefinePlugin,
  ExternalsFunctionElement,
  HotModuleReplacementPlugin,
  Module,
  Node,
  Options,
  Output,
  Plugin,
  Resolve,
  RuleSetCondition,
  RuleSetLoader,
  RuleSetRule,
  RuleSetUse,
} from "webpack";
import * as WebpackDevServer from "webpack-dev-server";

import { CliLogger } from "../cli/CliLogger";
import { TaskContext } from "../tasks/TaskContext";
import { envToRaw, tryResolve } from "./utils/ConfigUtils";

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

  protected get appIncludeCondition(): RuleSetCondition {
    const { cwd } = this.ctx;
    const { srcDir } = this.options.paths;

    const rule: RuleSetCondition[] = [path.join(cwd, srcDir)];

    if (this.workspacesPathRegExp) {
      rule.push(this.workspacesPathRegExp);
    }

    return rule;
  }

  //
  // Configuration
  //

  /**
   * @see https://webpack.js.org/concepts/mode/
   */
  protected getMode(): ConfigMode {
    return this.options.mode;
  }

  /**
   * @see https://webpack.js.org/configuration/entry-context/#context
   */
  protected getContext(): string {
    return this.ctx.cwd;
  }

  /**
   * @see https://webpack.js.org/configuration/entry-context/#entry
   */
  protected getEntry(): string[] {
    const { entryFile } = this.options.paths;

    return [`./${entryFile}`];
  }

  /**
   * @see https://webpack.js.org/configuration/output/
   */
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

  /**
   * @see json-loader
   */
  protected getJsonLoader(): RuleSetRule {
    const use: RuleSetUse = [];
    const jsonLoader = tryResolve("json-loader");

    if (jsonLoader) {
      use.push(jsonLoader);
    }

    if (use.length === 0) {
      // TODO: Use `warning-loader`.
    }

    return { use, test: /.json$/ };
  }

  /**
   * @see babel-loader
   */
  protected getBabelLoader(): undefined | BabelLoader {
    const loader = tryResolve("babel-loader");

    if (!loader) {
      return undefined;
    }

    const resolveBabelDependencies = (dependencies: BabelDependency[]) =>
      dependencies.reduce<BabelDependency[]>((acc, [id, options]) => {
        const idPath = tryResolve(id);

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
   * @see babel-loader
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
      include: this.appIncludeCondition,
    };
  }

  /**
   * @see ts-loader
   */
  protected getTypeScriptLoader(): RuleSetRule {
    const use: RuleSetUse = [];

    const tsLoader = tryResolve("ts-loader");
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
      include: this.appIncludeCondition,
    };
  }

  /**
   * @see https://webpack.js.org/configuration/module/
   */
  protected getModule(): Module {
    return {
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
    };
  }

  /**
   * @see https://webpack.js.org/configuration/resolve/#resolve-extensions
   */
  protected getExtensions(): string[] {
    // Support TypeScript and MJS files.
    return [".tsx", ".ts", ".mjs", ".js", ".json"];
  }

  /**
   * @see https://webpack.js.org/configuration/resolve/
   */
  protected getResolve(): Resolve {
    return { extensions: this.getExtensions() };
  }

  /**
   * @see https://webpack.js.org/configuration/optimization/
   */
  protected getOptimization(): Options.Optimization {
    return {
      // Prevents Webpack from printing out compile time stats to the console.
      noEmitOnErrors: true,

      // Tells webpack to set process.env.NODE_ENV to current build mode.
      nodeEnv: this.options.mode,
    };
  }

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

  /**
   * @see https://webpack.js.org/configuration/plugins/
   */
  protected getPlugins(): Plugin[] {
    return [
      this.getDefinePlugin(),
      this.getManifestPlugin(),
      this.getHotModuleReplacementPlugin(),
    ].filter((x): x is Plugin => x != null);
  }

  /**
   * https://webpack.js.org/configuration/dev-server/
   */
  protected getDevServer(): undefined | WebpackDevServer.Configuration {
    return undefined;
  }

  /**
   * @see https://webpack.js.org/configuration/devtool/
   */
  protected getDevTool(): Options.Devtool {
    return "source-map";
  }

  /**
   * @see https://webpack.js.org/configuration/target/
   */
  protected getTarget(): Configuration["target"] {
    return undefined;
  }

  /**
   * @see https://webpack.js.org/configuration/watch/
   */
  protected getWatch(): boolean {
    return this.isDev;
  }

  /**
   * @see https://webpack.js.org/configuration/externals/#function
   */
  protected getExternals(): undefined | ExternalsFunctionElement {
    return undefined;
  }

  /**
   * @see https://webpack.js.org/configuration/node/
   */
  protected getNode(): undefined | Node {
    return undefined;
  }

  /**
   * @see https://webpack.js.org/configuration/performance/
   */
  protected getPerformance(): undefined | Options.Performance {
    return undefined;
  }

  /**
   * @see https://webpack.js.org/configuration/other-options/#bail
   */
  protected getBail(): boolean {
    return this.isProd;
  }

  public build(): Configuration {
    return {
      mode: this.getMode(),
      context: this.getContext(),
      entry: this.getEntry(),
      output: this.getOutput(),
      module: this.getModule(),
      resolve: this.getResolve(),
      optimization: this.getOptimization(),
      plugins: this.getPlugins(),
      devServer: this.getDevServer(),
      devtool: this.getDevTool(),
      target: this.getTarget(),
      watch: this.getWatch(),
      externals: this.getExternals(),
      node: this.getNode(),
      performance: this.getPerformance(),
      bail: this.getBail(),
    };
  }
}
