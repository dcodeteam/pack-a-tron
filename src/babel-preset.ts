import { tryResolve } from "./builders/utils/ConfigUtils";

type BabelDependency<T = object> = [string, T];

interface Options {
  target: "web" | "node";
  mode: "development" | "production";
}

const targets = new Set(["web", "node"]);
const modes = new Set(["development", "production"]);

function createError(message: string) {
  return new Error(`[pack-a-tron/babel] ERROR: ${message}`);
}

function parseOptions(options: unknown): Options {
  const optionsType = typeof options;

  if (!options || optionsType !== "object") {
    throw createError(`Invalid options type "${optionsType}".`);
  }

  const { mode, target, ...unknownOptions } = options as Partial<Options>;

  if (!mode || !modes.has(mode)) {
    throw createError(`Unknown mode: "${mode}".`);
  }

  if (!target || !targets.has(target)) {
    throw createError(`Unknown target: "${mode}".`);
  }

  const unknownKeys = Object.keys(unknownOptions);

  if (unknownKeys.length > 0) {
    throw createError(
      `${unknownKeys.length} unknown option(s):\n${unknownKeys.join(", ")}.`,
    );
  }

  return { mode, target };
}

interface BabelConfig {
  presets: BabelDependency[];
  plugins: BabelDependency[];
}

function warning(message: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.error(message, ...args);
}

function resolveDependencies(dependencies: BabelDependency[]) {
  const unresolved: string[] = [];
  const resolved: BabelDependency[] = [];

  dependencies.forEach(([id, options]) => {
    const idPath = tryResolve(id);

    if (idPath) {
      resolved.push([idPath, options]);
    } else {
      unresolved.push(id);
    }
  });

  if (unresolved.length > 0) {
    warning("ERROR: Install:\n`%s`.", unresolved.join(" "));
  }

  return resolved;
}

// eslint-disable-next-line typescript/no-explicit-any
export default function declare(api: any, options: unknown): BabelConfig {
  api.assertVersion(7);

  const { mode, target } = parseOptions(options);

  return {
    presets: resolveDependencies([
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
              ? // We want to support LTS Node Version.
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

    plugins: resolveDependencies([
      // `await import('./big-module')`
      ["@babel/plugin-syntax-dynamic-import", {}],

      [
        // Necessary to include regardless of the environment because
        // in practice some other transforms (such as object-rest-spread)
        // don't work without it: https://github.com/babel/babel/issues/7215
        "@babel/plugin-transform-destructuring",

        // Use `Object.assign`.
        { useBuiltIns: true },
      ],

      [
        // See discussion in https://github.com/facebook/create-react-app/issues/4263
        "@babel/plugin-proposal-class-properties",
        // Do not use `Object.defineProperty`.
        { loose: true },
      ],

      [
        // See discussion in https://github.com/facebook/create-react-app/issues/4263
        "@babel/plugin-proposal-object-rest-spread",
        // Use `Object.assign`.
        { useBuiltIns: true },
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
  };
}
