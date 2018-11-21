import { parseTaskConfigFile } from "./task-config/TaskConfigUtils";
import { onExitSignal } from "./cli/CliUtils";
import { BuildTask } from "./tasks/BuildTask";

export default build();

async function build() {
  const config = await parseTaskConfigFile(process.cwd());
  const task = new BuildTask(config);

  await task.run();

  onExitSignal(() => task.stop());
}
