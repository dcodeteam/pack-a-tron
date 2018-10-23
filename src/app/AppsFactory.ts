import { BuilderMode } from "../builders/abstract/AbstractConfigBuilder";
import { TaskContext } from "../tasks/TaskContext";
import { App } from "./App";

export type AppsFactory = (ctx: TaskContext, mode: BuilderMode) => Array<App>;
