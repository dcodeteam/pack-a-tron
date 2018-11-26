import { onExitSignal } from "./cli/CliUtils";
import { parseTaskConfigFile } from "./task-config/TaskConfigUtils";
import { BuildTask } from "./tasks/BuildTask";

export default build();

async function build() {
  const config = await parseTaskConfigFile(process.cwd());
  const task = new BuildTask(config);

  await task.run();

  onExitSignal(() => task.stop());
}
