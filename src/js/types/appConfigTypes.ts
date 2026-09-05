import { DeploymentConfig } from 'op-deployment-configs';

export type TranslationTree = { [key: string]: string | TranslationTree };

/** Per-language translation overrides supplied by a deployment config, keyed by language code */
export type TranslationOverrides = { [lang: string]: TranslationTree };

// `DeploymentConfig` is a type alias in op-deployment-configs, so it can't be augmented in place
export type DeploymentConfigWithOverrides = DeploymentConfig & {
  translation_overrides?: TranslationOverrides;
};
