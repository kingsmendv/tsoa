import { ExtendedRoutesConfig } from '../cli';
import { Tsoa, TsoaRoute } from '@tsoa/runtime';
export declare class RouteGenerator {
  private readonly metadata;
  private readonly options;
  constructor(metadata: Tsoa.Metadata, options: ExtendedRoutesConfig);
  GenerateRoutes(middlewareTemplate: string, pathTransformer: (path: string) => string): Promise<void>;
  GenerateCustomRoutes(template: string, pathTransformer: (path: string) => string): Promise<void>;
  buildContent(middlewareTemplate: string, pathTransformer: (path: string) => string): string;
  buildModels(): TsoaRoute.Models;
  private getRelativeImportPath;
  private buildPropertySchema;
  private buildParameterSchema;
  private buildProperty;
}
