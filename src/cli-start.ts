import { parseTaskConfigFile } from "./task-config/TaskConfigUtils";
import { StartTask } from "./tasks/StartTask";
import { onExitSignal } from "./cli/CliUtils";

export default start();

async function start() {
  const config = await parseTaskConfigFile(process.cwd());
  const task = new StartTask(config);

  await task.run();

  onExitSignal(() => task.stop());
}
