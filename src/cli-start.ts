import { onExitSignal, onTextEnter } from "./cli/CliUtils";
import { parseTaskConfigFile } from "./task-config/TaskConfigUtils";
import { StartTask } from "./tasks/StartTask";

export default start();

async function start() {
  const config = await parseTaskConfigFile(process.cwd());
  const task = new StartTask(config);

  onTextEnter(task.commands);
  onExitSignal(() => task.stop());

  await task.run();
}
