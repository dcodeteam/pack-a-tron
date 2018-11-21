import { tryExecAsync } from "./ShellUtils";
import { YarnWorkspace } from "../task-config/TaskConfig";

export function getYarnWorkspaces(cwd: string): Promise<YarnWorkspace[]> {
  return tryExecAsync("yarn workspaces info --silent", { cwd })
    .then(json => (!json ? {} : JSON.parse(json)))
    .then(data =>
      Object.keys(data).map<YarnWorkspace>(name => {
        const { location } = data[name];

        return { name, location };
      }),
    );
}
