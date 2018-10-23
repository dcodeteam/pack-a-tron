import { RuleSetLoader } from "webpack";

import { BuilderOptions } from "../abstract/AbstractConfigBuilder";
import { tryResolve } from "../utils/ConfigUtils";
import { RuleBuilder } from "./RuleBuilder";

const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;

const scssRegex = /\.scss$/;
const scssModuleRegex = /\.module\.scss$/;

export class StyleRuleBuilder extends RuleBuilder {
  private modules?: boolean;

  private preProcessor?: "sass-loader";

  public constructor(options: BuilderOptions) {
    super("StyleRuleBuilder", options);

    // Define default values.
    this.normalize();
  }

  private tryCreateSassLoader(): null | RuleSetLoader {
    const sassLoader = tryResolve("sass-loader");

    return !sassLoader ? null : { loader: sassLoader };
  }

  private tryCreatePostcssLoader(): null | RuleSetLoader {
    const postcssLoader = tryResolve("postcss-loader");
    const postcssPresetEnv = tryResolve("postcss-preset-env");
    const postcssFlexbugsFixes = tryResolve("postcss-flexbugs-fixes");

    return !postcssLoader || !postcssPresetEnv || !postcssFlexbugsFixes
      ? null
      : {
          loader: postcssLoader,
          options: {
            // Necessary for external CSS imports to work
            // https://github.com/facebook/create-react-app/issues/2677
            ident: "postcss",
            plugins() {
              const presetEnv = require(postcssPresetEnv);

              return [
                require(postcssFlexbugsFixes),
                presetEnv({
                  stage: 3,

                  autoprefixer: { flexbox: "no-2009" },

                  // We want to support IE 9 until React itself no longer works with IE 9.
                  browsers: ">0.5%, IE 9, IE 10, IE 11",
                }),
              ];
            },
          },
        };
  }

  private tryCreateCssLoader(importLoaders: number): null | RuleSetLoader {
    const cssLoader = tryResolve("css-loader");

    if (!cssLoader) {
      return null;
    }

    return {
      loader: cssLoader,
      options: {
        importLoaders,
        modules: this.modules,
        localIdentName: "[name]__[local]___[hash:base64:5]",
      },
    };
  }

  private tryCreateStyleLoader(): null | RuleSetLoader {
    const loader = tryResolve("style-loader");

    return !loader ? null : { loader };
  }

  private tryCreateMiniCssExtractPluginLoader(): null | RuleSetLoader {
    const id = tryResolve("mini-css-extract-plugin");

    return !id ? null : require(id).loader;
  }

  private normalize(): this {
    const { preProcessor } = this;

    const isCss = !preProcessor;
    const isScss = preProcessor === "sass-loader";

    // Don't consider CSS imports dead code even if the
    // containing package claims to have no side effects.
    // Remove this when webpack adds a warning or an error for this.
    // See https://github.com/webpack/webpack/issues/6571
    this.sideEffects = true;

    this.test = [];
    this.exclude = [];

    if (isCss) {
      if (this.modules) {
        this.test.push(cssModuleRegex);
      } else {
        this.test.push(cssRegex);
        this.exclude.push(cssModuleRegex);
      }
    }

    if (isScss) {
      if (this.modules) {
        this.test.push(scssModuleRegex);
      } else {
        this.test.push(scssRegex);
        this.exclude.push(scssModuleRegex);
      }
    }

    this.use = [];

    if (isScss) {
      const sassLoader = this.tryCreateSassLoader();

      if (sassLoader) {
        this.use.unshift(sassLoader);
      }
    }

    const postCssLoader = this.tryCreatePostcssLoader();

    if (postCssLoader) {
      this.use.unshift(postCssLoader);
    }

    const cssLoader = this.tryCreateCssLoader(this.use.length);

    if (cssLoader) {
      this.use.unshift(cssLoader);
    }

    if (this.isWeb) {
      if (this.isDev) {
        const styleLoader = this.tryCreateStyleLoader();

        if (styleLoader) {
          this.use.unshift(styleLoader);
        }
      } else {
        const miniCssExtractPluginLoader = this.tryCreateMiniCssExtractPluginLoader();

        if (miniCssExtractPluginLoader) {
          this.use.unshift(miniCssExtractPluginLoader);
        }
      }
    }

    return this;
  }

  public setModules(modules: boolean): this {
    this.modules = modules;

    return this.normalize();
  }

  public setPreProcessor(preProcessor: null | "sass-loader"): this {
    this.preProcessor = preProcessor || undefined;

    return this.normalize();
  }
}
