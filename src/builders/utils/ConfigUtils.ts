interface Env {
  [key: string]: string;
}

export function envToRaw(env: { [key: string]: unknown }): Env {
  return Object.keys(env).reduce<Env>((acc, key) => {
    const value = env[key];

    // Skip `nil` values.
    if (value != null) {
      acc[`process.env.${key}`] = JSON.stringify(value);
    }

    return acc;
  }, {});
}

export function tryResolve(id: string): null | string {
  try {
    return require.resolve(id);
  } catch (e) {
    return null;
  }
}

export function assertWebpack() {
  if (!tryResolve("webpack")) {
    throw new Error("Failed to run command: `webpack` is not installed.");
  }
}

export function assertWebpackDevServer() {
  if (!tryResolve("webpack-dev-server")) {
    throw new Error(
      "Failed to run command: `webpack-dev-server` is not installed.",
    );
  }
}
