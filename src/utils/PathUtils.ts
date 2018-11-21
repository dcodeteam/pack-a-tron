import { isAbsolute, join } from "path";

export function toAbsolutePath(cwd: string, path: string): string {
  return isAbsolute(path) ? path : join(cwd, path);
}
