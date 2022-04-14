import * as ts from 'typescript';
import { ExtendedSpecConfig } from '../cli';
import { Tsoa } from '@tsoa/runtime';
export declare const getSwaggerOutputPath: (swaggerConfig: ExtendedSpecConfig) => string;
export declare const generateSpec: (
  swaggerConfig: ExtendedSpecConfig,
  compilerOptions?: ts.CompilerOptions | undefined,
  ignorePaths?: string[] | undefined,
  metadata?: Tsoa.Metadata | undefined,
) => Promise<Tsoa.Metadata>;
