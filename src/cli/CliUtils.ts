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
