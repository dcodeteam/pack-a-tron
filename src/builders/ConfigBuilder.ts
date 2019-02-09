import { relative, resolve } from "path";

import {
  Configuration,
  Node,
  Options,
  Output,
  Plugin,
  Resolve,
  RuleSetRule,
} from "webpack";

import {
  AbstractConfigBuilder,
  BuilderModifier,
  BuilderOptions,
} from "./abstract/AbstractConfigBuilder";
import { DevServerBuilder } from "./others/DevServerBuilder";
import { ExternalsBuilder } from "./others/ExternalsBuilder";
import { BundleAnalyzerPluginBuilder } from "./plugins/BundleAnalyzerPluginBuilder";
import { CircularDependencyPluginBuilder } from "./plugins/CircularDependencyPluginBuilder";
import { DefinePluginBuilder } from "./plugins/DefinePluginBuilder";
import { HotModuleReplacementPluginBuilder } from "./plugins/HotModuleReplacementPluginBuilder";
import { ManifestPluginBuilder } from "./plugins/ManifestPluginBuilder";
import { PluginBuilder } from "./plugins/PluginBuilder";
import { TerserPluginBuilder } from "./plugins/TerserPluginBuilder";
import { FileRuleBuilder } from "./rules/FileRuleBuilder";
import { JsonRuleBuilder } from "./rules/JsonRuleBuilder";
import { JSRuleBuilder } from "./rules/JSRuleBuilder";
import { RuleBuilder } from "./rules/RuleBuilder";
import { StyleRuleBuilder } from "./rules/StyleRuleBuilder";
import { TSRuleBuilder } from "./rules/TSRuleBuilder";

export class ConfigBuilder extends AbstractConfigBuilder<Configuration> {
  private entry: Array<string>;

  private output: Output;

  private rules: Array<RuleBuilder>;

  private resolve: Resolve;

  private optimization: Options.Optimization;

  private minimizers: Array<PluginBuilder>;

  private plugins: Array<PluginBuilder>;

  private baseConfig: Configuration;

  private devServer: DevServerBuilder;

  private devtool: Options.Devtool;

  private externals: ExternalsBuilder;

  private node: Node;

  private performance: Options.Performance;

  public constructor(options: BuilderOptions) {
    super("ConfigBuilder", options);

    const { paths, config } = options;

    this.entry = [`./${paths.entryFile}`];

    if (this.isWeb && this.isDev) {
      this.entry.unshift("react-dev-utils/webpackHotDevClient");
    }

    this.output = {
      path: this.absoluteBuildDir,

      filename: this.isNode
        ? "index.js"
        : this.isDev
        ? "static/js/bundle.js"
        : "static/js/bundle.[chunkhash:8].js",

      chunkFilename: this.isNode
        ? "[name]-chunk.js"
        : this.isDev
        ? "static/js/[name].chunk.js"
        : "static/js/[name].[chunkhash:8].chunk.js",

      libraryTarget: this.isNode ? "commonjs2" : "var",
      publicPath: paths.publicPath,

      devtoolModuleFilenameTemplate: this.isWeb
        ? "webpack://[namespace]/[resource-path]?[loaders]"
        : info => {
            const targetPath = this.isDev
              ? resolve(info.absoluteResourcePath)
              : relative(paths.srcDir, info.absoluteResourcePath);

            return targetPath.replace(/\\/g, "/");
          },
    };

    this.devServer = new DevServerBuilder(options);

    this.devtool = this.isDev && this.isWeb ? "eval" : "source-map";

    this.externals = new ExternalsBuilder(options);

    this.node = this.isNode
      ? {
          // Polyfill nothing.
          console: false,
          process: false,
          global: false,

          __dirname: false,
          __filename: false,

          Buffer: false,
          setImmediate: false,
        }
      : {
          // Some libraries import Node modules but don't use them in the browser.
          // Tell Webpack to provide empty mocks for them so importing them works.
          dgram: "empty",
          fs: "empty",
          net: "empty",
          tls: "empty",
          // eslint-disable-next-line @typescript-eslint/camelcase
          child_process: "empty",
        };

    this.performance = { hints: false };

    this.rules = [
      // json-loader
      new JsonRuleBuilder(options),

      // babel-loader
      new JSRuleBuilder(options)
        // Load only from `src` and local workspaces.
        .includeSrc(),

      // ts-loader + babel-loader
      new TSRuleBuilder(options),

      // css-loader
      new StyleRuleBuilder(options),

      // css-loader with modules
      new StyleRuleBuilder(options).setModules(true),

      // sass-loader
      new StyleRuleBuilder(options).setPreProcessor("sass-loader"),

      // sass-loader with modules
      new StyleRuleBuilder(options)
        .setModules(true)
        .setPreProcessor("sass-loader"),

      // file-loader
      new FileRuleBuilder(options),
    ];

    this.resolve = {
      /**
       * @see https://webpack.js.org/configuration/resolve/#resolve-extensions
       */
      extensions: [".tsx", ".ts", ".mjs", ".js", ".json"],

      /**
       * @see https://webpack.js.org/configuration/resolve/#resolve-mainfields
       */
      mainFields: this.isWeb
        ? ["module", "browser", "main"]
        : ["module", "main"],
    };

    /**
     * @see https://webpack.js.org/configuration/optimization/
     */
    this.optimization = {
      // Prevents Webpack from printing out compile time stats to the console.
      noEmitOnErrors: true,

      // Tells webpack to set process.env.NODE_ENV to current build mode.
      nodeEnv: options.mode,

      // Minimize only web output.
      minimize: this.isWeb && this.isProd,
      minimizer: [],

      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: this.isWeb,

      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      splitChunks: this.isNode ? undefined : { chunks: "all", name: true },
    };

    this.minimizers = [new TerserPluginBuilder(options)];

    /**
     * @see https://webpack.js.org/configuration/plugins/
     */
    this.plugins = [
      // webpack.DefinePlugin
      new DefinePluginBuilder(options),

      // webpack-manifest-plugin
      new ManifestPluginBuilder(options),

      // webpack.HotModuleReplacementPlugin
      new HotModuleReplacementPluginBuilder(options),

      /**
       * @see https://github.com/webpack-contrib/webpack-bundle-analyzer
       */
      new BundleAnalyzerPluginBuilder(options),

      /**
       * @see https://github.com/aackerman/circular-dependency-plugin
       */
      new CircularDependencyPluginBuilder(options),
    ];

    this.baseConfig = {
      /**
       * @see https://webpack.js.org/configuration/other-options/#bail
       */
      bail: this.isProd,

      /**
       * @see https://webpack.js.org/concepts/mode/
       */
      mode: options.mode,

      /**
       * @see https://webpack.js.org/configuration/entry-context/#context
       */
      context: config.cwd,

      /**
       * @see https://webpack.js.org/configuration/watch/
       */
      watch: this.isDev,

      /**
       * @see https://webpack.js.org/configuration/target/
       */
      target: options.target,
    };
  }

  //
  // Modifiers
  //

  /**
   * @see https://webpack.js.org/configuration/entry-context/#entry
   */
  public modifyEntry(modifier: BuilderModifier<Array<string>>): this {
    this.entry = modifier(this.entry);

    return this;
  }

  /**
   * @see https://webpack.js.org/configuration/output/
   */
  public modifyOutput(modifier: BuilderModifier<Output>): this {
    this.output = modifier(this.output);

    return this;
  }

  /**
   * @see https://webpack.js.org/configuration/node/
   */
  public modifyNode(modifier: BuilderModifier<Node>): this {
    this.node = modifier(this.node);

    return this;
  }

  /**
   * @see https://webpack.js.org/configuration/performance/
   */
  public modifyPerformance(
    modifier: BuilderModifier<Options.Performance>,
  ): this {
    this.performance = modifier(this.performance);

    return this;
  }

  public modifyLoaders(modify: BuilderModifier<Array<RuleBuilder>>): this {
    this.rules = modify(this.rules);

    return this;
  }

  public modifyPlugins(modify: BuilderModifier<Array<PluginBuilder>>): this {
    this.plugins = modify(this.plugins);

    return this;
  }

  public setDevtool(devtool: Options.Devtool): this {
    this.devtool = devtool;

    return this;
  }

  public setExternals(externals: ExternalsBuilder): this {
    this.externals = externals;

    return this;
  }

  // Build

  public build(): Configuration {
    return {
      ...this.baseConfig,

      entry: this.entry,
      output: this.output,

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
            // "oneOf" will traverse all following rules until one will
            // match the requirements. When no loader matches it will fall
            // back to the "file" loader at the end of the loader list.
            oneOf: this.rules
              .map(x => x.build())
              .filter((x): x is RuleSetRule => x != null),
          },
        ],
      },
      resolve: this.resolve,
      optimization: {
        ...this.optimization,
        minimizer: this.minimizers
          .map(x => x.build())
          .filter((x): x is Plugin => x != null),
      },
      plugins: this.plugins
        .map(x => x.build())
        .filter((x): x is Plugin => x != null),

      devServer: this.devServer.build(),
      devtool: this.devtool,
      externals: this.externals.build(),
      node: this.node,
      performance: this.performance,
    };
  }
}
