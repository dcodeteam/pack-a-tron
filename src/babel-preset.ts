import { tryResolve } from "./builders/utils/ConfigUtils";

type BabelDependency<T = object> = [string, T];

interface Options {
  target: "web" | "node";
  mode: "test" | "development" | "production";
}

const targets = new Set(["web", "node"]);
const modes = new Set(["test", "development", "production"]);

const optionalDependencies = new Set(["@babel/preset-typescript"]);

function createError(message: string): Error {
  const error = new Error(`[pack-a-tron/babel] ERROR: ${message}`);

  // @ts-ignore
  error.framesToPop = 1;

  return error;
}

function parseOptions(options: unknown): Options {
  const optionsType = typeof options;

  if (!options || optionsType !== "object") {
    throw createError(`Invalid options type "${optionsType}".`);
  }

  const { mode, target, ...unknownOptions } = options as Partial<Options>;

  if (!mode || !modes.has(mode)) {
    throw createError(
      `Unknown mode: "${mode}". Expected one of: ${Array.from(modes).join(
        ", ",
      )}.`,
    );
  }

  if (!target || !targets.has(target)) {
    throw createError(
      `Unknown target: "${target}". Expected one of: ${Array.from(targets).join(
        ", ",
      )}.`,
    );
  }

  const unknownKeys = Object.keys(unknownOptions);

  if (unknownKeys.length > 0) {
    throw createError(
      `${unknownKeys.length} unknown option(s): ${unknownKeys.join(", ")}.`,
    );
  }

  return { mode, target };
}

interface BabelConfig {
  presets: Array<BabelDependency>;
  plugins: Array<BabelDependency>;
}

function warning(message: string, ...args: Array<unknown>): void {
  // eslint-disable-next-line no-console
  console.error(message, ...args);
}

function resolveDependencies(
  dependencies: Array<null | BabelDependency>,
): Array<BabelDependency> {
  const unresolved: Array<string> = [];
  const resolved: Array<BabelDependency> = [];

  dependencies.forEach(dependency => {
    if (!dependency) {
      return;
    }

    const [id, options] = dependency;

    const idPath = tryResolve(id);

    if (idPath) {
      resolved.push([idPath, options]);
    } else if (!optionalDependencies.has(id)) {
      unresolved.push(id);
    }
  });

  if (unresolved.length > 0) {
    warning("ERROR: Install: `%s`.", unresolved.join(" "));
  }

  return resolved;
}

interface BabelApi {
  assertVersion(version: number): void;
}

export default function declare(api: BabelApi, options: unknown): BabelConfig {
  api.assertVersion(7);

  const { mode, target } = parseOptions(options);

  const isWeb = target === "web";

  const isDev = mode === "development";
  const isTest = mode === "test";

  return {
    presets: resolveDependencies([
      ["@babel/preset-typescript", {}],

      [
        "@babel/preset-env",
        {
          // Disallow users to change this configuration.
          ignoreBrowserslistConfig: true,

          // If users import all core-js they're probably not concerned with
          // bundle size. We shouldn't rely on magic to try and shrink it.
          useBuiltIns: false,

          // Transform modules only in test environment.
          modules: isTest && "commonjs",

          // Exclude transforms that make all code slower.
          exclude: ["transform-typeof-symbol"],

          // Support IE 9 on web or NodeJS 8.0.0.
          targets: isWeb ? { ie: 9 } : { node: isTest ? true : "8.0.0" },
        },
      ],

      [
        "@babel/preset-react",
        {
          // Adds component stack to warning messages
          // Adds __self attribute to JSX which React will use for some warnings
          development: isDev,

          // Will use the native built-in instead of trying to polyfill
          // behavior for any plugins that require one.
          useBuiltIns: true,
        },
      ],
    ]),

    plugins: resolveDependencies([
      ["@babel/plugin-syntax-dynamic-import", {}],

      [
        "@babel/plugin-transform-destructuring",
        { useBuiltIns: true }, // Use `Object.assign`.
      ],

      [
        "@babel/plugin-proposal-class-properties",
        { loose: true }, // Do not use `Object.defineProperty`.
      ],

      [
        // See discussion in https://github.com/facebook/create-react-app/issues/4263
        "@babel/plugin-proposal-object-rest-spread",
        { useBuiltIns: true }, // Use `Object.assign`.
      ],

      isTest
        ? null
        : [
            "@babel/plugin-transform-runtime",
            {
              // Do not import `core-js`.
              corejs: false,

              // Use `runtime` helpers.
              helpers: true,

              // Do not polyfill `regenerator`.
              regenerator: false,

              // Use es modules only for web.
              useESModules: isWeb,
            },
          ],
    ]),
  };
}
