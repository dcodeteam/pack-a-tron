import * as path from "path";

import {
  Configuration,
  Node,
  Options,
  Output,
  Plugin,
  Resolve,
  RuleSetRule,
} from "webpack";
import * as WebpackDevServer from "webpack-dev-server";

import {
  AbstractConfigBuilder,
  BuilderModifier,
  BuilderOptions,
} from "./abstract/AbstractConfigBuilder";
import { ExternalsBuilder } from "./others/ExternalsBuilder";
import { DefinePluginBuilder } from "./plugins/DefinePluginBuilder";
import { ManifestPluginBuilder } from "./plugins/ManifestPluginBuilder";
import { PluginBuilder } from "./plugins/PluginBuilder";
import { JsonRuleBuilder } from "./rules/JsonRuleBuilder";
import { JSRuleBuilder } from "./rules/JSRuleBuilder";
import { RuleBuilder } from "./rules/RuleBuilder";
import { StyleRuleBuilder } from "./rules/StyleRuleBuilder";
import { TSRuleBuilder } from "./rules/TSRuleBuilder";

export class ConfigBuilder extends AbstractConfigBuilder<Configuration> {
  private entry: string[];

  private output: Output;

  private rules: RuleBuilder[];

  private resolve: Resolve;

  private optimization: Options.Optimization;

  private plugins: PluginBuilder[];

  private baseConfig: Configuration;

  private devServer: undefined | WebpackDevServer.Configuration;

  private devtool: Options.Devtool;

  private externals: ExternalsBuilder;

  private node: Node;

  private performance: Options.Performance;

  public constructor(options: BuilderOptions) {
    super("ConfigBuilder", options);

    this.entry = [`./${options.paths.entryFile}`];
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
      publicPath: options.paths.publicPath,

      devtoolModuleFilenameTemplate: this.isNode
        ? undefined
        : // Point sourcemap entries to original disk location (format as URL on Windows)
          info => {
            const relativePath = this.isDev
              ? path.resolve(info.absoluteResourcePath)
              : path.relative(this.absoluteSrcDir, info.absoluteResourcePath);

            return relativePath.replace(/\\/g, "/");
          },
    };

    this.devServer =
      this.isProd || this.isNode
        ? undefined
        : {
            // WebpackDevServer 2.4.3 introduced a security fix that prevents remote
            // websites from potentially accessing local content through DNS rebinding:
            // https://github.com/webpack/webpack-dev-server/issues/887
            // https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
            // However, it made several existing use cases such as development in cloud
            // environment or subdomains in development significantly more complicated:
            // https://github.com/facebook/create-react-app/issues/2271
            // https://github.com/facebook/create-react-app/issues/2233
            // While we're investigating better solutions, for now we will take a
            // compromise. Since our WDS configuration only serves files in the `public`
            // folder we won't consider accessing them a vulnerability. However, if you
            // use the `proxy` feature, it gets more dangerous because it can expose
            // remote code execution vulnerabilities in backends like Django and Rails.
            // So we will disable the host check normally, but enable it if you have
            // specified the `proxy` setting. Finally, we let you override it if you
            // really know what you're doing with a special environment variable.
            disableHostCheck: false,

            // Enable gzip compression of generated files.
            compress: true,

            // Silence WebpackDevServer's own logs since they're generally not useful.
            // It will still show compile warnings and errors with this setting.
            clientLogLevel: "none",
            // By default WebpackDevServer serves physical files from current directory
            // in addition to all the virtual build products that it serves from memory.
            // This is confusing because those files won’t automatically be available in
            // production build folder unless we copy them. However, copying the whole
            // project directory is dangerous because we may expose sensitive files.
            // Instead, we establish a convention that only files in `public` directory
            // get served. Our build script will copy `public` into the `build` folder.
            // In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
            // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
            // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
            // Note that we only recommend to use `public` folder as an escape hatch
            // for files like `favicon.ico`, `manifest.json`, and libraries that are
            // for some reason broken when imported through Webpack. If you just want to
            // use an image, put it in `src` and `import` it from JavaScript instead.
            // contentBase: paths.appPublic,
            // By default files from `contentBase` will not trigger a page reload.
            watchContentBase: true,

            // Enable hot reloading server. It will provide /sockjs-node/ endpoint
            // for the WebpackDevServer client so it can learn when the files were
            // updated. The WebpackDevServer client is included as an entry point
            // in the Webpack development configuration. Note that only changes
            // to CSS are currently hot reloaded. JS changes will refresh the browser.
            hot: true,

            // It is important to tell WebpackDevServer to use the same "root" path
            // as we specified in the config. In development, we always serve from /.
            // publicPath,

            // WebpackDevServer is noisy by default so we emit custom message instead
            // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
            quiet: true,

            watchOptions: {
              poll: 1000,
              aggregateTimeout: 300,

              // Reportedly, this avoids CPU overload on some systems.
              // https://github.com/facebook/create-react-app/issues/293
              // src/node_modules is not ignored to support absolute imports
              // https://github.com/facebook/create-react-app/issues/1065
              // ignored: ignoredFiles(paths.appSrc) // TODO: Enable.
            },

            // Enable HTTPS if the HTTPS environment variable is set to 'true'
            https: options.ctx.appProtocol === "https",

            overlay: false,
            historyApiFallback: {
              // Paths with dots should still use the history fallback.
              // See https://github.com/facebook/create-react-app/issues/387.
              disableDotRule: true,
            },

            // public: allowedHost, // TODO: Enable.

            // Use reverse proxy.
            proxy: { "**": { target: options.ctx.appFullDevHost } },

            // before(app, server) { // TODO: Enable.
            // if (fs.existsSync(paths.proxySetup)) {
            //   // This registers user provided middleware for proxy reasons
            //   require(paths.proxySetup)(app);
            // }
            //
            // This lets us fetch source contents from webpack for the error overlay
            // app.use(evalSourceMapMiddleware(server));
            // This lets us open files from the runtime error overlay.
            // app.use(errorOverlayMiddleware());
            //
            // This service worker file is effectively a 'no-op' that will reset any
            // previous service worker registered for the same host:port combination.
            // We do this in development to avoid hitting the production cache if
            // it used the same host and port.
            // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
            // app.use(noopServiceWorkerMiddleware());
            // }
          };

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
    ];

    this.resolve = {
      /**
       * @see https://webpack.js.org/configuration/resolve/#resolve-extensions
       */
      extensions: [".tsx", ".ts", ".mjs", ".js", ".json"],
    };

    /**
     * @see https://webpack.js.org/configuration/optimization/
     */
    this.optimization = {
      // Prevents Webpack from printing out compile time stats to the console.
      noEmitOnErrors: true,

      // Tells webpack to set process.env.NODE_ENV to current build mode.
      nodeEnv: this.options.mode,

      // Minimize only web output.
      minimize: this.isWeb && this.isProd,

      // Keep the runtime chunk seperated to enable long term caching
      // https://twitter.com/wSokra/status/969679223278505985
      runtimeChunk: this.isWeb,

      // Automatically split vendor and commons
      // https://twitter.com/wSokra/status/969633336732905474
      // https://medium.com/webpack/webpack-4-code-splitting-chunk-graph-and-the-splitchunks-optimization-be739a861366
      // splitChunks: { // TODO: Enable.
      //   chunks: "all",
      //   name: false,
      // },
    };

    /**
     * @see https://webpack.js.org/configuration/plugins/
     */
    this.plugins = [
      // webpack.DefinePlugin
      new DefinePluginBuilder(options),

      // webpack-manifest-plugin
      new ManifestPluginBuilder(options),
    ];

    this.baseConfig = {
      /**
       * @see https://webpack.js.org/configuration/other-options/#bail
       */
      bail: this.isProd,

      /**
       * @see https://webpack.js.org/concepts/mode/
       */
      mode: this.options.mode,

      /**
       * @see https://webpack.js.org/configuration/entry-context/#context
       */
      context: this.options.ctx.cwd,

      /**
       * @see https://webpack.js.org/configuration/watch/
       */
      watch: this.isDev,

      /**
       * @see https://webpack.js.org/configuration/target/
       */
      target: this.options.target,
    };
  }

  //
  // Modifiers
  //

  /**
   * @see https://webpack.js.org/configuration/entry-context/#entry
   */
  public modifyEntry(modifier: BuilderModifier<string[]>): this {
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

  public modifyLoaders(modify: BuilderModifier<RuleBuilder[]>): this {
    this.rules = modify(this.rules);

    return this;
  }

  public modifyPlugins(modify: BuilderModifier<PluginBuilder[]>): this {
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
      optimization: this.optimization,
      plugins: this.plugins
        .map(x => x.build())
        .filter((x): x is Plugin => x != null),

      devServer: this.devServer,
      devtool: this.devtool,
      externals: this.externals.build(),
      node: this.node,
      performance: this.performance,
    };
  }
}
