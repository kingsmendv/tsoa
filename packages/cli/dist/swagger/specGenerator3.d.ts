import { ExtendedSpecConfig } from '../cli';
import { Tsoa, Swagger } from '@tsoa/runtime';
import { SpecGenerator } from './specGenerator';
/**
 * TODO:
 * Handle formData parameters
 * Handle requestBodies of type other than json
 * Handle requestBodies as reusable objects
 * Handle headers, examples, responses, etc.
 * Cleaner interface between SpecGenerator2 and SpecGenerator3
 * Also accept OpenAPI 3.0.0 metadata, like components/securitySchemes instead of securityDefinitions
 */
export declare class SpecGenerator3 extends SpecGenerator {
  protected readonly metadata: Tsoa.Metadata;
  protected readonly config: ExtendedSpecConfig;
  constructor(metadata: Tsoa.Metadata, config: ExtendedSpecConfig);
  GetSpec(): Swagger.Spec3;
  private buildInfo;
  private buildComponents;
  private translateSecurityDefinitions;
  private hasOAuthFlow;
  private hasOAuthFlows;
  private buildServers;
  private buildSchema;
  private buildPaths;
  private buildMethod;
  protected buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation3;
  private buildRequestBodyWithFormData;
  private buildRequestBody;
  private buildMediaType;
  private buildParameter;
  protected buildProperties(
    source: Tsoa.Property[],
  ): {
    [propertyName: string]: Swagger.Schema3;
  };
  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema;
  protected getSwaggerTypeForPrimitiveType(dataType: Tsoa.PrimitiveTypeLiteral): Swagger.Schema;
  private isNull;
  private groupEnums;
  protected removeDuplicateSwaggerTypes(types: Array<Swagger.Schema | Swagger.BaseSchema>): any[];
  protected getSwaggerTypeForUnionType(type: Tsoa.UnionType): any;
  protected getSwaggerTypeForIntersectionType(
    type: Tsoa.IntersectionType,
  ): {
    allOf: (Swagger.Schema | Swagger.BaseSchema)[];
  };
  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumType): Swagger.Schema3;
}
