import { RuleSetCondition, RuleSetLoader } from "webpack";

import { BuilderOptions } from "../AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { LoaderBuilder } from "./LoaderBuilder";

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

export class JSLoaderBuilder extends LoaderBuilder {
  public static createBabelLoader({
    mode,
    target,
  }: BuilderOptions): null | BabelLoader {
    const loader = tryResolve("babel-loader");

    if (!loader) {
      return null;
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

              targets:
                target === "node"
                  ? // We want to support node 8.0.0.
                    { node: "8.0.0" }
                  : // We want to support IE 9.
                    { ie: 9 },
            },
          ],

          [
            "@babel/preset-react",
            {
              // Adds component stack to warning messages
              // Adds __self attribute to JSX which React will use for some warnings
              development: mode === "development",

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

  public constructor(options: BuilderOptions) {
    super("JSLoaderBuilder", options);

    this.test = [/\.js$/];
    this.exclude = [/node_modules/];

    const loader = JSLoaderBuilder.createBabelLoader(options);

    if (loader) {
      this.use = [loader];
    }
  }

  public setInclude(include: RuleSetCondition[]): this {
    this.include = include;

    return this;
  }
}
