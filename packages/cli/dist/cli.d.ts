#!/usr/bin/env node
import { Config, RoutesConfig, SpecConfig, Tsoa } from '@tsoa/runtime';
export interface ExtendedSpecConfig extends SpecConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
}
export declare const validateSpecConfig: (config: Config) => Promise<ExtendedSpecConfig>;
export interface ExtendedRoutesConfig extends RoutesConfig {
  entryFile: Config['entryFile'];
  noImplicitAdditionalProperties: Exclude<Config['noImplicitAdditionalProperties'], undefined>;
  controllerPathGlobs?: Config['controllerPathGlobs'];
}
export interface ConfigArgs {
  basePath?: string;
  configuration?: string | Config;
}
export interface SwaggerArgs extends ConfigArgs {
  host?: string;
  json?: boolean;
  yaml?: boolean;
}
export declare function runCLI(): void;
export declare function generateSpecAndRoutes(args: SwaggerArgs, metadata?: Tsoa.Metadata): Promise<Tsoa.Metadata>;
