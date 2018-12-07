import * as WebpackDevServer from "webpack-dev-server";

import {
  AbstractConfigBuilder,
  BuilderOptions,
} from "../abstract/AbstractConfigBuilder";

export class DevServerBuilder extends AbstractConfigBuilder<
  undefined | WebpackDevServer.Configuration
> {
  protected allowedHost?: string;

  public constructor(options: BuilderOptions) {
    super("DevServerBuilder", options);

    if (this.isWeb && this.isDev) {
      const { clientProtocol, clientHost, clientServerPort } = this.config;
      const { prepareUrls } = require("react-dev-utils/WebpackDevServerUtils");
      const { lanUrlForConfig } = prepareUrls(
        clientProtocol,
        clientHost,
        clientServerPort,
      );

      this.allowedHost = lanUrlForConfig;
    }
  }

  public build(): undefined | WebpackDevServer.Configuration {
    if (this.isProd || this.isNode) {
      return undefined;
    }

    const { config } = this.options;

    return {
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
      https: config.clientProtocol === "https",

      overlay: false,
      historyApiFallback: {
        // Paths with dots should still use the history fallback.
        // See https://github.com/facebook/create-react-app/issues/387.
        disableDotRule: true,
      },

      public: this.allowedHost,

      // Use reverse proxy.
      proxy: {
        "**": {
          logLevel: "silent",
          target: config.clientServerUrl,
          onError: (err, req, res) => {
            // eslint-disable-next-line typescript/no-explicit-any
            const { code } = err as any;

            if (code === "ECONNREFUSED" || code === "ECONNRESET") {
              const timer = setTimeout(() => {
                res.writeHead(302, { Location: req.url });
                res.end();
              }, 1000);

              res.once("close", () => clearTimeout(timer));
            } else {
              res.end(`Failed to redirect:\n${err.stack}`);
            }
          },
        },
      },

      before: (app, ...args: unknown[]) => {
        const errorOverlayMiddleware = require("react-dev-utils/errorOverlayMiddleware");
        const evalSourceMapMiddleware = require("react-dev-utils/evalSourceMapMiddleware");

        // This lets us fetch source contents from webpack for the error overlay
        app.use(evalSourceMapMiddleware(args[0]));

        // This lets us open files from the runtime error overlay.
        app.use(errorOverlayMiddleware());
      },
    };
  }
}
