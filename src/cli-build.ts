import { onExitSignal, onTextEnter } from "./cli/CliUtils";
import { parseTaskConfigFile } from "./task-config/TaskConfigUtils";
import { BuildTask } from "./tasks/BuildTask";

export default build();

async function build() {
  const config = await parseTaskConfigFile(process.cwd());
  const task = new BuildTask(config);

  onTextEnter(task.commands);
  onExitSignal(() => task.stop());

  await task.run();
}
