import * as readline from "readline";

const EXIT_SIGNALS: Array<NodeJS.Signals> = ["SIGINT", "SIGTERM"];

export function onExitSignal(fn: () => void | Promise<void>): void {
  EXIT_SIGNALS.forEach(signal => {
    process.once(signal, async () => {
      await fn();

      process.exit();
    });
  });
}

export interface TextCommand {
  readonly text: string;
  readonly fn: () => void;
}

export function onTextEnter(commands: Array<TextCommand>): void {
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
