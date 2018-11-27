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
    if (e && e.code === "MODULE_NOT_FOUND") {
      return null;
    }

    throw e;
  }
}
