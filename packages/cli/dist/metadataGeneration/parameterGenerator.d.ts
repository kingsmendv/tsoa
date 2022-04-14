import * as ts from 'typescript';
import { MetadataGenerator } from './metadataGenerator';
import { Tsoa } from '@tsoa/runtime';
export declare class ParameterGenerator {
  private readonly parameter;
  private readonly method;
  private readonly path;
  private readonly current;
  constructor(parameter: ts.ParameterDeclaration, method: string, path: string, current: MetadataGenerator);
  Generate(): Tsoa.Parameter[];
  private getRequestParameter;
  private getResParameters;
  private getBodyPropParameter;
  private getBodyParameter;
  private getHeaderParameter;
  private getUploadedFileParameter;
  private getFormFieldParameter;
  private getQueryParameters;
  private getPathParameter;
  private getParameterDescription;
  private getParameterDeprecation;
  private getParameterExample;
  private supportBodyMethod;
  private supportParameterDecorator;
  private supportPathDataType;
  private getValidatedType;
  private getQueryParamterIsHidden;
}
