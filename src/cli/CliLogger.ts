import chalk from "chalk";

export type CliLoggerLabelBg =
  | "bgBlack"
  | "bgRed"
  | "bgGreen"
  | "bgYellow"
  | "bgBlue"
  | "bgMagenta"
  | "bgCyan"
  | "bgWhite"
  | "bgBlackBright"
  | "bgRedBright"
  | "bgGreenBright"
  | "bgYellowBright"
  | "bgBlueBright"
  | "bgMagentaBright"
  | "bgCyanBright"
  | "bgWhiteBright";

export class CliLogger {
  private readonly label: string;

  public constructor(label: string, bg: CliLoggerLabelBg) {
    this.label = chalk.bold(` ${label.toUpperCase()} `);

    if (typeof chalk[bg] === "function") {
      this.label = chalk.black(chalk[bg](this.label));
    }
  }

  public log(message: string, ...args: Array<unknown>): void {
    // eslint-disable-next-line no-console
    console.log([this.label, message].join(" "), ...args);
  }

  public alert(message: string, ...args: Array<unknown>): void {
    this.log(chalk.red(message), ...args);
  }

  public error(error: Error): void {
    const unknownError = new Error("Unknown Error");

    const message =
      error && error.message ? error.message : unknownError.message;
    const stack = error && error.stack ? error.stack : unknownError.stack!;

    this.log("%s\n%s", message, chalk.red(stack));
  }
}
