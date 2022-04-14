import * as ts from 'typescript';
import { Tsoa } from '@tsoa/runtime';
export declare class MetadataGenerator {
  private readonly compilerOptions?;
  private readonly ignorePaths?;
  readonly controllerNodes: ts.ClassDeclaration[];
  readonly typeChecker: ts.TypeChecker;
  private readonly program;
  private referenceTypeMap;
  private circularDependencyResolvers;
  constructor(entryFile: string, compilerOptions?: ts.CompilerOptions | undefined, ignorePaths?: string[] | undefined, controllers?: string[]);
  Generate(): Tsoa.Metadata;
  private setProgramToDynamicControllersFiles;
  private extractNodeFromProgramSourceFiles;
  private checkForMethodSignatureDuplicates;
  private checkForPathParamSignatureDuplicates;
  TypeChecker(): ts.TypeChecker;
  AddReferenceType(referenceType: Tsoa.ReferenceType): void;
  GetReferenceType(refName: string): Tsoa.ReferenceType;
  OnFinish(callback: (referenceTypes: Tsoa.ReferenceTypeMap) => void): void;
  private buildControllers;
}
