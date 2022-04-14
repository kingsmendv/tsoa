import { Node, TypeNode } from 'typescript';
export declare class GenerateMetadataError extends Error {
  constructor(message?: string, node?: Node | TypeNode, onlyCurrent?: boolean);
}
export declare function prettyLocationOfNode(node: Node | TypeNode): string;
export declare function prettyTroubleCause(node: Node | TypeNode, onlyCurrent?: boolean): string;
