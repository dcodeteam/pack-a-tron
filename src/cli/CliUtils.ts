import * as readline from "readline";

const EXIT_SIGNALS: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

function asyncTimeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

export function onExitSignal(fn: () => void | Promise<void>): void {
  EXIT_SIGNALS.forEach(signal => {
    process.on(signal, async () => {
      await Promise.race([fn(), asyncTimeout(100)]);

      process.exit(0);
    });
  });
}

export interface TextCommand {
  readonly text: string;
  readonly fn: () => void;
}

export function onTextEnter(commands: TextCommand[]): void {
  if (commands.length === 0) {
    return;
  }

  const reader = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  reader.resume();

  reader.on("line", input => {
    commands.forEach(x => {
      if (input === x.text) {
        x.fn();
      }
    });
  });
}
