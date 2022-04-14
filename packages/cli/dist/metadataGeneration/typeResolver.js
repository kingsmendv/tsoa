'use strict';
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
var __read =
  (this && this.__read) ||
  function (o, n) {
    var m = typeof Symbol === 'function' && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o),
      r,
      ar = [],
      e;
    try {
      while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    } catch (error) {
      e = { error: error };
    } finally {
      try {
        if (r && !r.done && (m = i['return'])) m.call(i);
      } finally {
        if (e) throw e.error;
      }
    }
    return ar;
  };
var __spread =
  (this && this.__spread) ||
  function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.TypeResolver = void 0;
var ts = require('typescript');
var jsDocUtils_1 = require('./../utils/jsDocUtils');
var decoratorUtils_1 = require('./../utils/decoratorUtils');
var validatorUtils_1 = require('./../utils/validatorUtils');
var exceptions_1 = require('./exceptions');
var initializer_value_1 = require('./initializer-value');
var runtime_1 = require('@tsoa/runtime');
var extension_1 = require('./extension');
var jsonUtils_1 = require('../utils/jsonUtils');
var localReferenceTypeCache = {};
var inProgressTypes = {};
var TypeResolver = /** @class */ (function () {
  function TypeResolver(typeNode, current, parentNode, context, referencer) {
    if (context === void 0) {
      context = {};
    }
    this.typeNode = typeNode;
    this.current = current;
    this.parentNode = parentNode;
    this.context = context;
    this.referencer = referencer;
    this.attemptToResolveKindToPrimitive = function (syntaxKind) {
      if (syntaxKind === ts.SyntaxKind.NumberKeyword) {
        return {
          foundMatch: true,
          resolvedType: 'number',
        };
      } else if (syntaxKind === ts.SyntaxKind.StringKeyword) {
        return {
          foundMatch: true,
          resolvedType: 'string',
        };
      } else if (syntaxKind === ts.SyntaxKind.BooleanKeyword) {
        return {
          foundMatch: true,
          resolvedType: 'boolean',
        };
      } else if (syntaxKind === ts.SyntaxKind.VoidKeyword) {
        return {
          foundMatch: true,
          resolvedType: 'void',
        };
      } else {
        return {
          foundMatch: false,
        };
      }
    };
  }
  TypeResolver.clearCache = function () {
    Object.keys(localReferenceTypeCache).forEach(function (key) {
      delete localReferenceTypeCache[key];
    });
    Object.keys(inProgressTypes).forEach(function (key) {
      delete inProgressTypes[key];
    });
  };
  TypeResolver.prototype.resolve = function () {
    var _this = this;
    var primitiveType = this.getPrimitiveType(this.typeNode, this.parentNode);
    if (primitiveType) {
      return primitiveType;
    }
    if (this.typeNode.kind === ts.SyntaxKind.NullKeyword) {
      var enumType = {
        dataType: 'enum',
        enums: [null],
      };
      return enumType;
    }
    if (ts.isArrayTypeNode(this.typeNode)) {
      var arrayMetaType = {
        dataType: 'array',
        elementType: new TypeResolver(this.typeNode.elementType, this.current, this.parentNode, this.context).resolve(),
      };
      return arrayMetaType;
    }
    if (ts.isUnionTypeNode(this.typeNode)) {
      var types = this.typeNode.types.map(function (type) {
        return new TypeResolver(type, _this.current, _this.parentNode, _this.context).resolve();
      });
      var unionMetaType = {
        dataType: 'union',
        types: types,
      };
      return unionMetaType;
    }
    if (ts.isIntersectionTypeNode(this.typeNode)) {
      var types = this.typeNode.types.map(function (type) {
        return new TypeResolver(type, _this.current, _this.parentNode, _this.context).resolve();
      });
      var intersectionMetaType = {
        dataType: 'intersection',
        types: types,
      };
      return intersectionMetaType;
    }
    if (this.typeNode.kind === ts.SyntaxKind.AnyKeyword || this.typeNode.kind === ts.SyntaxKind.UnknownKeyword) {
      var literallyAny = {
        dataType: 'any',
      };
      return literallyAny;
    }
    if (ts.isLiteralTypeNode(this.typeNode)) {
      var enumType = {
        dataType: 'enum',
        enums: [this.getLiteralValue(this.typeNode)],
      };
      return enumType;
    }
    if (ts.isTypeLiteralNode(this.typeNode)) {
      var properties = this.typeNode.members
        .filter(function (member) {
          return ts.isPropertySignature(member);
        })
        .reduce(function (res, propertySignature) {
          var type = new TypeResolver(propertySignature.type, _this.current, propertySignature, _this.context).resolve();
          var property = {
            example: _this.getNodeExample(propertySignature),
            default: jsDocUtils_1.getJSDocComment(propertySignature, 'default'),
            description: _this.getNodeDescription(propertySignature),
            format: _this.getNodeFormat(propertySignature),
            name: propertySignature.name.text,
            required: !propertySignature.questionToken,
            type: type,
            validators: validatorUtils_1.getPropertyValidators(propertySignature) || {},
            deprecated: jsDocUtils_1.isExistJSDocTag(propertySignature, function (tag) {
              return tag.tagName.text === 'deprecated';
            }),
            extensions: _this.getNodeExtension(propertySignature),
          };
          return __spread([property], res);
        }, []);
      var indexMember = this.typeNode.members.find(function (member) {
        return ts.isIndexSignatureDeclaration(member);
      });
      var additionalType = void 0;
      if (indexMember) {
        var indexSignatureDeclaration = indexMember;
        var indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type, this.current, this.parentNode, this.context).resolve();
        if (indexType.dataType !== 'string') {
          throw new exceptions_1.GenerateMetadataError('Only string indexers are supported.', this.typeNode);
        }
        additionalType = new TypeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
      }
      var objLiteral = {
        additionalProperties: indexMember && additionalType,
        dataType: 'nestedObjectLiteral',
        properties: properties,
      };
      return objLiteral;
    }
    if (this.typeNode.kind === ts.SyntaxKind.ObjectKeyword) {
      return { dataType: 'object' };
    }
    if (ts.isMappedTypeNode(this.typeNode) && this.referencer) {
      var type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);
      var mappedTypeNode_1 = this.typeNode;
      var typeChecker_1 = this.current.typeChecker;
      var getDeclaration_1 = function (prop) {
        return prop.declarations && prop.declarations[0];
      };
      var isIgnored_1 = function (prop) {
        var declaration = getDeclaration_1(prop);
        return (
          prop.getJsDocTags().find(function (tag) {
            return tag.name === 'ignore';
          }) !== undefined ||
          (declaration !== undefined && !ts.isPropertyDeclaration(declaration) && !ts.isPropertySignature(declaration) && !ts.isParameter(declaration))
        );
      };
      var properties = type
        .getProperties()
        // Ignore methods, getter, setter and @ignored props
        .filter(function (property) {
          return isIgnored_1(property) === false;
        })
        // Transform to property
        .map(function (property) {
          var propertyType = typeChecker_1.getTypeOfSymbolAtLocation(property, _this.typeNode);
          var declaration = getDeclaration_1(property);
          if (declaration && ts.isPropertySignature(declaration)) {
            return __assign(__assign({}, _this.propertyFromSignature(declaration, mappedTypeNode_1.questionToken)), { name: property.getName() });
          } else if (declaration && (ts.isPropertyDeclaration(declaration) || ts.isParameter(declaration))) {
            return __assign(__assign({}, _this.propertyFromDeclaration(declaration, mappedTypeNode_1.questionToken)), { name: property.getName() });
          }
          // Resolve default value, required and typeNode
          var required = false;
          var typeNode = _this.current.typeChecker.typeToTypeNode(propertyType, undefined, ts.NodeBuilderFlags.NoTruncation);
          if (mappedTypeNode_1.questionToken && mappedTypeNode_1.questionToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
          } else if (mappedTypeNode_1.questionToken && mappedTypeNode_1.questionToken.kind === ts.SyntaxKind.QuestionToken) {
            required = false;
          }
          // Push property
          return {
            name: property.getName(),
            required: required,
            // Mapped types with any amount of indirection (template strings, unions, Exclude<>, etc.)
            // don't provide an underlying declaration in the AST, thus we cannot know if the original
            // property is deprecated. This matches intellisense's behavior in vscode.
            deprecated: false,
            type: new TypeResolver(typeNode, _this.current, _this.typeNode, _this.context, _this.referencer).resolve(),
            validators: {},
          };
        });
      var objectLiteral = {
        dataType: 'nestedObjectLiteral',
        properties: properties,
      };
      return objectLiteral;
    }
    if (ts.isConditionalTypeNode(this.typeNode) && this.referencer && ts.isTypeReferenceNode(this.referencer)) {
      var type_1 = this.current.typeChecker.getTypeFromTypeNode(this.referencer);
      if (type_1.aliasSymbol) {
        var declaration_1 = type_1.aliasSymbol.declarations[0];
        if (declaration_1.name) {
          declaration_1 = this.getModelTypeDeclaration(declaration_1.name);
        }
        var name_1 = this.getRefTypeName(this.referencer.getText());
        return this.handleCachingAndCircularReferences(name_1, function () {
          if (ts.isTypeAliasDeclaration(declaration_1)) {
            // Note: I don't understand why typescript lose type for `this.referencer` (from above with isTypeReferenceNode())
            return _this.getTypeAliasReference(declaration_1, _this.current.typeChecker.typeToString(type_1), _this.referencer);
          } else if (ts.isEnumDeclaration(declaration_1)) {
            return _this.getEnumerateType(declaration_1.name);
          } else {
            throw new exceptions_1.GenerateMetadataError(
              "Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. We found an aliasSymbol and it's declaration was of kind " + declaration_1.kind,
              _this.typeNode,
            );
          }
        });
      } else if (type_1.isClassOrInterface()) {
        var declaration_2 = type_1.symbol.declarations[0];
        if (declaration_2.name) {
          declaration_2 = this.getModelTypeDeclaration(declaration_2.name);
        }
        var name_2 = this.getRefTypeName(this.referencer.getText());
        return this.handleCachingAndCircularReferences(name_2, function () {
          return _this.getModelReference(declaration_2, _this.current.typeChecker.typeToString(type_1));
        });
      } else {
        try {
          return new TypeResolver(this.current.typeChecker.typeToTypeNode(type_1, undefined, ts.NodeBuilderFlags.NoTruncation), this.current, this.typeNode, this.context, this.referencer).resolve();
        } catch (_a) {
          throw new exceptions_1.GenerateMetadataError(
            "Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. The flags on the result of the ConditionalType was " + type_1.flags,
            this.typeNode,
          );
        }
      }
    }
    if (ts.isTypeOperatorNode(this.typeNode) && this.typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
      var type = this.current.typeChecker.getTypeFromTypeNode(this.typeNode);
      try {
        return new TypeResolver(this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation), this.current, this.typeNode, this.context, this.referencer).resolve();
      } catch (err) {
        var indexedTypeName = this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.type));
        throw new exceptions_1.GenerateMetadataError('Could not determine the keys on ' + indexedTypeName, this.typeNode);
      }
    }
    // Handle `readonly` arrays
    if (ts.isTypeOperatorNode(this.typeNode) && this.typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
      return new TypeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
    }
    if (ts.isIndexedAccessTypeNode(this.typeNode) && (this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword || this.typeNode.indexType.kind === ts.SyntaxKind.StringKeyword)) {
      var numberIndexType = this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword;
      var objectType = this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType);
      var type = numberIndexType ? objectType.getNumberIndexType() : objectType.getStringIndexType();
      if (type === undefined) {
        throw new exceptions_1.GenerateMetadataError(
          'Could not determine ' + (numberIndexType ? 'number' : 'string') + ' index on ' + this.current.typeChecker.typeToString(objectType),
          this.typeNode,
        );
      }
      return new TypeResolver(this.current.typeChecker.typeToTypeNode(type, undefined, undefined), this.current, this.typeNode, this.context, this.referencer).resolve();
    }
    if (
      ts.isIndexedAccessTypeNode(this.typeNode) &&
      ts.isLiteralTypeNode(this.typeNode.indexType) &&
      (ts.isStringLiteral(this.typeNode.indexType.literal) || ts.isNumericLiteral(this.typeNode.indexType.literal))
    ) {
      var hasType = function (node) {
        return node !== undefined && node.hasOwnProperty('type');
      };
      var symbol = this.current.typeChecker.getPropertyOfType(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType), this.typeNode.indexType.literal.text);
      if (symbol === undefined) {
        throw new exceptions_1.GenerateMetadataError(
          'Could not determine the keys on ' + this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType)),
          this.typeNode,
        );
      }
      if (hasType(symbol.valueDeclaration) && symbol.valueDeclaration.type) {
        return new TypeResolver(symbol.valueDeclaration.type, this.current, this.typeNode, this.context, this.referencer).resolve();
      }
      var declaration = this.current.typeChecker.getTypeOfSymbolAtLocation(symbol, this.typeNode.objectType);
      try {
        return new TypeResolver(this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined), this.current, this.typeNode, this.context, this.referencer).resolve();
      } catch (_b) {
        throw new exceptions_1.GenerateMetadataError(
          'Could not determine the keys on ' +
            this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined))),
          this.typeNode,
        );
      }
    }
    if (ts.isTemplateLiteralTypeNode(this.typeNode)) {
      var type = this.current.typeChecker.getTypeFromTypeNode(this.referencer || this.typeNode);
      if (
        type.isUnion() &&
        type.types.every(function (unionElementType) {
          return unionElementType.isStringLiteral();
        })
      ) {
        var stringLiteralEnum = {
          dataType: 'enum',
          enums: type.types.map(function (stringLiteralType) {
            return stringLiteralType.value;
          }),
        };
        return stringLiteralEnum;
      } else {
        throw new exceptions_1.GenerateMetadataError(
          'Could not the type of ' + this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode), this.typeNode),
          this.typeNode,
        );
      }
    }
    if (ts.isParenthesizedTypeNode(this.typeNode)) {
      return new TypeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
    }
    if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
      throw new exceptions_1.GenerateMetadataError('Unknown type: ' + ts.SyntaxKind[this.typeNode.kind], this.typeNode);
    }
    var typeReference = this.typeNode;
    if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
      if (typeReference.typeName.text === 'Date') {
        return this.getDateType(this.parentNode);
      }
      if (typeReference.typeName.text === 'Buffer') {
        var bufferMetaType = { dataType: 'buffer' };
        return bufferMetaType;
      }
      if (typeReference.typeName.text === 'Readable') {
        var streamMetaType = { dataType: 'buffer' };
        return streamMetaType;
      }
      if (typeReference.typeName.text === 'Array' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        var arrayMetaType = {
          dataType: 'array',
          elementType: new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve(),
        };
        return arrayMetaType;
      }
      if (typeReference.typeName.text === 'Promise' && typeReference.typeArguments && typeReference.typeArguments.length === 1) {
        return new TypeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve();
      }
      if (typeReference.typeName.text === 'String') {
        var stringMetaType = { dataType: 'string' };
        return stringMetaType;
      }
      if (this.context[typeReference.typeName.text]) {
        return new TypeResolver(this.context[typeReference.typeName.text], this.current, this.parentNode, this.context).resolve();
      }
    }
    var referenceType = this.getReferenceType(typeReference);
    this.current.AddReferenceType(referenceType);
    return referenceType;
  };
  TypeResolver.prototype.getLiteralValue = function (typeNode) {
    var value;
    switch (typeNode.literal.kind) {
      case ts.SyntaxKind.TrueKeyword:
        value = true;
        break;
      case ts.SyntaxKind.FalseKeyword:
        value = false;
        break;
      case ts.SyntaxKind.StringLiteral:
        value = typeNode.literal.text;
        break;
      case ts.SyntaxKind.NumericLiteral:
        value = parseFloat(typeNode.literal.text);
        break;
      case ts.SyntaxKind.NullKeyword:
        value = null;
        break;
      default:
        if (typeNode.literal.hasOwnProperty('text')) {
          value = typeNode.literal.text;
        } else {
          throw new exceptions_1.GenerateMetadataError("Couldn't resolve literal node: " + typeNode.literal.getText());
        }
    }
    return value;
  };
  TypeResolver.prototype.getPrimitiveType = function (typeNode, parentNode) {
    var resolution = this.attemptToResolveKindToPrimitive(typeNode.kind);
    if (!resolution.foundMatch) {
      return;
    }
    if (resolution.resolvedType === 'number') {
      if (!parentNode) {
        return { dataType: 'double' };
      }
      var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
        return ['isInt', 'isLong', 'isFloat', 'isDouble'].some(function (m) {
          return m === name;
        });
      });
      if (tags.length === 0) {
        return { dataType: 'double' };
      }
      switch (tags[0]) {
        case 'isInt':
          return { dataType: 'integer' };
        case 'isLong':
          return { dataType: 'long' };
        case 'isFloat':
          return { dataType: 'float' };
        case 'isDouble':
          return { dataType: 'double' };
        default:
          return { dataType: 'double' };
      }
    } else if (resolution.resolvedType === 'string') {
      return {
        dataType: 'string',
      };
    } else if (resolution.resolvedType === 'boolean') {
      return {
        dataType: 'boolean',
      };
    } else if (resolution.resolvedType === 'void') {
      return {
        dataType: 'void',
      };
    } else {
      return runtime_1.assertNever(resolution.resolvedType);
    }
  };
  TypeResolver.prototype.getDateType = function (parentNode) {
    if (!parentNode) {
      return { dataType: 'datetime' };
    }
    var tags = jsDocUtils_1.getJSDocTagNames(parentNode).filter(function (name) {
      return ['isDate', 'isDateTime'].some(function (m) {
        return m === name;
      });
    });
    if (tags.length === 0) {
      return { dataType: 'datetime' };
    }
    switch (tags[0]) {
      case 'isDate':
        return { dataType: 'date' };
      case 'isDateTime':
        return { dataType: 'datetime' };
      default:
        return { dataType: 'datetime' };
    }
  };
  TypeResolver.prototype.getDesignatedModels = function (nodes, typeName) {
    /**
     * Model is marked with '@tsoaModel', indicating that it should be the 'canonical' model used
     */
    var designatedNodes = nodes.filter(function (enumNode) {
      return jsDocUtils_1.isExistJSDocTag(enumNode, function (tag) {
        return tag.tagName.text === 'tsoaModel';
      });
    });
    if (designatedNodes.length > 0) {
      if (designatedNodes.length > 1) {
        throw new exceptions_1.GenerateMetadataError('Multiple models for ' + typeName + " marked with '@tsoaModel'; '@tsoaModel' should only be applied to one model.");
      }
      return designatedNodes;
    }
    return nodes;
  };
  TypeResolver.prototype.hasFlag = function (type, flag) {
    return (type.flags & flag) === flag;
  };
  TypeResolver.prototype.getEnumerateType = function (typeName) {
    var _this = this;
    var _a, _b;
    var enumName = typeName.text;
    var symbol = this.getSymbolAtLocation(typeName);
    // resolve value
    var declaredType = ((_a = this.current.typeChecker.getDeclaredTypeOfSymbol(symbol)) === null || _a === void 0 ? void 0 : _a.symbol) || symbol;
    // if we are a EnumMember, return parent instead (this happens if a enum has only one entry, not quite sure why though...)
    if (this.hasFlag(declaredType, ts.SymbolFlags.EnumMember) && ((_b = declaredType.parent) === null || _b === void 0 ? void 0 : _b.valueDeclaration.kind) === ts.SyntaxKind.EnumDeclaration) {
      declaredType = declaredType.parent;
    }
    var declarations = declaredType.getDeclarations();
    if (!declarations) {
      return;
    }
    var enumNodes = declarations.filter(function (node) {
      return ts.isEnumDeclaration(node) && node.name.getText() === enumName;
    });
    if (!enumNodes.length) {
      return;
    }
    enumNodes = this.getDesignatedModels(enumNodes, enumName);
    if (enumNodes.length > 1) {
      throw new exceptions_1.GenerateMetadataError('Multiple matching enum found for enum ' + enumName + '; please make enum names unique.');
    }
    var enumDeclaration = enumNodes[0];
    var isNotUndefined = function (item) {
      return item === undefined ? false : true;
    };
    var enums = enumDeclaration.members
      .map(function (e) {
        return _this.current.typeChecker.getConstantValue(e);
      })
      .filter(isNotUndefined);
    var enumVarnames = enumDeclaration.members
      .map(function (e) {
        return e.name.getText();
      })
      .filter(isNotUndefined);
    return {
      dataType: 'refEnum',
      description: this.getNodeDescription(enumDeclaration),
      enums: enums,
      enumVarnames: enumVarnames,
      refName: enumName,
      deprecated: jsDocUtils_1.isExistJSDocTag(enumDeclaration, function (tag) {
        return tag.tagName.text === 'deprecated';
      }),
    };
  };
  TypeResolver.prototype.getReferenceType = function (node) {
    var _this = this;
    var type;
    if (ts.isTypeReferenceNode(node)) {
      type = node.typeName;
    } else if (ts.isExpressionWithTypeArguments(node)) {
      type = node.expression;
    } else {
      throw new exceptions_1.GenerateMetadataError("Can't resolve Reference type.");
    }
    // Can't invoke getText on Synthetic Nodes
    var resolvableName = node.pos !== -1 ? node.getText() : type.text;
    if (node.pos === -1 && 'typeArguments' in node && Array.isArray(node.typeArguments)) {
      // Add typearguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
      var argumentsString = node.typeArguments.map(function (arg) {
        if (ts.isLiteralTypeNode(arg)) {
          return "'" + String(_this.getLiteralValue(arg)) + "'";
        }
        var resolved = _this.attemptToResolveKindToPrimitive(arg.kind);
        if (resolved.foundMatch === false) return 'any';
        return resolved.resolvedType;
      });
      resolvableName += '<' + argumentsString.join(', ') + '>';
    }
    var name = this.contextualizedName(resolvableName);
    this.typeArgumentsToContext(node, type, this.context);
    try {
      var existingType = localReferenceTypeCache[name];
      if (existingType) {
        return existingType;
      }
      var refEnumType = this.getEnumerateType(type);
      if (refEnumType) {
        localReferenceTypeCache[name] = refEnumType;
        return refEnumType;
      }
      if (inProgressTypes[name]) {
        return this.createCircularDependencyResolver(name);
      }
      inProgressTypes[name] = true;
      var declaration = this.getModelTypeDeclaration(type);
      var referenceType = void 0;
      if (ts.isTypeAliasDeclaration(declaration)) {
        referenceType = this.getTypeAliasReference(declaration, name, node);
      } else if (ts.isEnumMember(declaration)) {
        referenceType = {
          dataType: 'refEnum',
          refName: this.getRefTypeName(name),
          enums: [this.current.typeChecker.getConstantValue(declaration)],
          enumVarnames: [declaration.name.getText()],
          deprecated: jsDocUtils_1.isExistJSDocTag(declaration, function (tag) {
            return tag.tagName.text === 'deprecated';
          }),
        };
      } else {
        referenceType = this.getModelReference(declaration, name);
      }
      localReferenceTypeCache[name] = referenceType;
      return referenceType;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("There was a problem resolving type of '" + name + "'.");
      throw err;
    }
  };
  TypeResolver.prototype.getTypeAliasReference = function (declaration, name, referencer) {
    var example = this.getNodeExample(declaration);
    return __assign(
      {
        dataType: 'refAlias',
        default: jsDocUtils_1.getJSDocComment(declaration, 'default'),
        description: this.getNodeDescription(declaration),
        refName: this.getRefTypeName(name),
        format: this.getNodeFormat(declaration),
        type: new TypeResolver(declaration.type, this.current, declaration, this.context, this.referencer || referencer).resolve(),
        validators: validatorUtils_1.getPropertyValidators(declaration) || {},
      },
      example && { example: example },
    );
  };
  TypeResolver.prototype.getModelReference = function (modelType, name) {
    var example = this.getNodeExample(modelType);
    var description = this.getNodeDescription(modelType);
    var deprecated =
      jsDocUtils_1.isExistJSDocTag(modelType, function (tag) {
        return tag.tagName.text === 'deprecated';
      }) ||
      decoratorUtils_1.isDecorator(modelType, function (identifier) {
        return identifier.text === 'Deprecated';
      });
    // Handle toJSON methods
    if (!modelType.name) {
      throw new exceptions_1.GenerateMetadataError("Can't get Symbol from anonymous class", modelType);
    }
    var type = this.current.typeChecker.getTypeAtLocation(modelType.name);
    var toJSON = this.current.typeChecker.getPropertyOfType(type, 'toJSON');
    if (toJSON && toJSON.valueDeclaration && (ts.isMethodDeclaration(toJSON.valueDeclaration) || ts.isMethodSignature(toJSON.valueDeclaration))) {
      var nodeType = toJSON.valueDeclaration.type;
      if (!nodeType) {
        var signature = this.current.typeChecker.getSignatureFromDeclaration(toJSON.valueDeclaration);
        var implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature);
        nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation);
      }
      var type_2 = new TypeResolver(nodeType, this.current).resolve();
      var referenceType_1 = __assign(
        { refName: this.getRefTypeName(name), dataType: 'refAlias', description: description, type: type_2, validators: {}, deprecated: deprecated },
        example && { example: example },
      );
      return referenceType_1;
    }
    var properties = this.getModelProperties(modelType);
    var additionalProperties = this.getModelAdditionalProperties(modelType);
    var inheritedProperties = this.getModelInheritedProperties(modelType) || [];
    var referenceType = __assign(
      { additionalProperties: additionalProperties, dataType: 'refObject', description: description, properties: inheritedProperties, refName: this.getRefTypeName(name), deprecated: deprecated },
      example && { example: example },
    );
    referenceType.properties = referenceType.properties.concat(properties);
    return referenceType;
  };
  TypeResolver.prototype.getRefTypeName = function (name) {
    return encodeURIComponent(
      name
        .replace(/<|>/g, '_')
        .replace(/\s+/g, '')
        .replace(/,/g, '.')
        .replace(/\'([^']*)\'/g, '$1')
        .replace(/\"([^"]*)\"/g, '$1')
        .replace(/&/g, '-and-')
        .replace(/\|/g, '-or-')
        .replace(/\[\]/g, '-Array')
        .replace(/{|}/g, '_') // SuccessResponse_{indexesCreated-number}_ -> SuccessResponse__indexesCreated-number__
        .replace(/([a-z]+):([a-z]+)/gi, '$1-$2') // SuccessResponse_indexesCreated:number_ -> SuccessResponse_indexesCreated-number_
        .replace(/;/g, '--')
        .replace(/([a-z]+)\[([a-z]+)\]/gi, '$1-at-$2'),
    );
  };
  TypeResolver.prototype.contextualizedName = function (name) {
    return Object.entries(this.context).reduce(function (acc, _a) {
      var _b = __read(_a, 2),
        key = _b[0],
        entry = _b[1];
      return acc
        .replace(new RegExp('<\\s*([^>]*\\s)*\\s*(' + key + ')(\\s[^>]*)*\\s*>', 'g'), '<$1' + entry.getText() + '$3>')
        .replace(new RegExp('<\\s*([^,]*\\s)*\\s*(' + key + ')(\\s[^,]*)*\\s*,', 'g'), '<$1' + entry.getText() + '$3,')
        .replace(new RegExp(',\\s*([^>]*\\s)*\\s*(' + key + ')(\\s[^>]*)*\\s*>', 'g'), ',$1' + entry.getText() + '$3>')
        .replace(new RegExp('<\\s*([^<]*\\s)*\\s*(' + key + ')(\\s[^<]*)*\\s*<', 'g'), '<$1' + entry.getText() + '$3<');
    }, name);
  };
  TypeResolver.prototype.handleCachingAndCircularReferences = function (name, declarationResolver) {
    try {
      var existingType = localReferenceTypeCache[name];
      if (existingType) {
        return existingType;
      }
      if (inProgressTypes[name]) {
        return this.createCircularDependencyResolver(name);
      }
      inProgressTypes[name] = true;
      var reference = declarationResolver();
      localReferenceTypeCache[name] = reference;
      this.current.AddReferenceType(reference);
      return reference;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("There was a problem resolving type of '" + name + "'.");
      throw err;
    }
  };
  TypeResolver.prototype.createCircularDependencyResolver = function (refName) {
    var referenceType = {
      dataType: 'refObject',
      refName: refName,
    };
    this.current.OnFinish(function (referenceTypes) {
      var realReferenceType = referenceTypes[refName];
      if (!realReferenceType) {
        return;
      }
      referenceType.description = realReferenceType.description;
      if (realReferenceType.dataType === 'refObject' && referenceType.dataType === 'refObject') {
        referenceType.properties = realReferenceType.properties;
      }
      referenceType.dataType = realReferenceType.dataType;
      referenceType.refName = realReferenceType.refName;
    });
    return referenceType;
  };
  TypeResolver.prototype.nodeIsUsable = function (node) {
    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
      case ts.SyntaxKind.ClassDeclaration:
      case ts.SyntaxKind.TypeAliasDeclaration:
      case ts.SyntaxKind.EnumDeclaration:
      case ts.SyntaxKind.EnumMember:
        return true;
      default:
        return false;
    }
  };
  TypeResolver.prototype.getModelTypeDeclaration = function (type) {
    var _this = this;
    var typeName = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;
    var symbol = this.getSymbolAtLocation(type);
    var declarations = symbol === null || symbol === void 0 ? void 0 : symbol.getDeclarations();
    if (!declarations) {
      throw new exceptions_1.GenerateMetadataError('No declarations found for referenced type ' + typeName + '.');
    }
    var modelTypes = declarations.filter(function (node) {
      var _a;
      return _this.nodeIsUsable(node) && ((_a = node.name) === null || _a === void 0 ? void 0 : _a.getText()) === typeName;
    });
    if (!modelTypes.length) {
      throw new exceptions_1.GenerateMetadataError('No matching model found for referenced type ' + typeName + '.');
    }
    if (modelTypes.length > 1) {
      // remove types that are from typescript e.g. 'Account'
      modelTypes = modelTypes.filter(function (modelType) {
        return modelType.getSourceFile().fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1;
      });
      modelTypes = this.getDesignatedModels(modelTypes, typeName);
    }
    if (modelTypes.length > 1) {
      var conflicts = modelTypes
        .map(function (modelType) {
          return modelType.getSourceFile().fileName;
        })
        .join('"; "');
      throw new exceptions_1.GenerateMetadataError('Multiple matching models found for referenced type ' + typeName + '; please make model names unique. Conflicts found: "' + conflicts + '".');
    }
    return modelTypes[0];
  };
  TypeResolver.prototype.getSymbolAtLocation = function (type) {
    var symbol = this.current.typeChecker.getSymbolAtLocation(type) || type.symbol;
    // resolve alias if it is an alias, otherwise take symbol directly
    return (symbol && this.hasFlag(symbol, ts.SymbolFlags.Alias) && this.current.typeChecker.getAliasedSymbol(symbol)) || symbol;
  };
  TypeResolver.prototype.getModelProperties = function (node, overrideToken) {
    var _this = this;
    var isIgnored = function (e) {
      var ignore = jsDocUtils_1.isExistJSDocTag(e, function (tag) {
        return tag.tagName.text === 'ignore';
      });
      return ignore;
    };
    // Interface model
    if (ts.isInterfaceDeclaration(node)) {
      return node.members
        .filter(function (member) {
          return !isIgnored(member) && ts.isPropertySignature(member);
        })
        .map(function (member) {
          return _this.propertyFromSignature(member, overrideToken);
        });
    }
    // Class model
    var properties = node.members
      .filter(function (member) {
        return !isIgnored(member);
      })
      .filter(function (member) {
        return member.kind === ts.SyntaxKind.PropertyDeclaration;
      })
      .filter(function (member) {
        return !_this.hasStaticModifier(member);
      })
      .filter(function (member) {
        return _this.hasPublicModifier(member);
      });
    var classConstructor = node.members.find(function (member) {
      return ts.isConstructorDeclaration(member);
    });
    if (classConstructor && classConstructor.parameters) {
      var constructorProperties = classConstructor.parameters.filter(function (parameter) {
        return _this.isAccessibleParameter(parameter);
      });
      properties.push.apply(properties, __spread(constructorProperties));
    }
    return properties.map(function (property) {
      return _this.propertyFromDeclaration(property, overrideToken);
    });
  };
  TypeResolver.prototype.propertyFromSignature = function (propertySignature, overrideToken) {
    var identifier = propertySignature.name;
    if (!propertySignature.type) {
      throw new exceptions_1.GenerateMetadataError('No valid type found for property declaration.');
    }
    var required = !propertySignature.questionToken;
    if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
      required = false;
    }
    var property = {
      default: jsDocUtils_1.getJSDocComment(propertySignature, 'default'),
      description: this.getNodeDescription(propertySignature),
      example: this.getNodeExample(propertySignature),
      format: this.getNodeFormat(propertySignature),
      name: identifier.text,
      required: required,
      type: new TypeResolver(propertySignature.type, this.current, propertySignature.type.parent, this.context, propertySignature.type).resolve(),
      validators: validatorUtils_1.getPropertyValidators(propertySignature) || {},
      deprecated: jsDocUtils_1.isExistJSDocTag(propertySignature, function (tag) {
        return tag.tagName.text === 'deprecated';
      }),
      extensions: this.getNodeExtension(propertySignature),
    };
    return property;
  };
  TypeResolver.prototype.propertyFromDeclaration = function (propertyDeclaration, overrideToken) {
    var identifier = propertyDeclaration.name;
    var typeNode = propertyDeclaration.type;
    if (!typeNode) {
      var tsType = this.current.typeChecker.getTypeAtLocation(propertyDeclaration);
      typeNode = this.current.typeChecker.typeToTypeNode(tsType, undefined, ts.NodeBuilderFlags.NoTruncation);
    }
    if (!typeNode) {
      throw new exceptions_1.GenerateMetadataError('No valid type found for property declaration.');
    }
    var type = new TypeResolver(typeNode, this.current, propertyDeclaration, this.context, typeNode).resolve();
    var required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
    if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
      required = true;
    } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
      required = false;
    }
    var property = {
      default: initializer_value_1.getInitializerValue(propertyDeclaration.initializer, this.current.typeChecker),
      description: this.getNodeDescription(propertyDeclaration),
      example: this.getNodeExample(propertyDeclaration),
      format: this.getNodeFormat(propertyDeclaration),
      name: identifier.text,
      required: required,
      type: type,
      validators: validatorUtils_1.getPropertyValidators(propertyDeclaration) || {},
      // class properties and constructor parameters may be deprecated either via jsdoc annotation or decorator
      deprecated:
        jsDocUtils_1.isExistJSDocTag(propertyDeclaration, function (tag) {
          return tag.tagName.text === 'deprecated';
        }) ||
        decoratorUtils_1.isDecorator(propertyDeclaration, function (identifier) {
          return identifier.text === 'Deprecated';
        }),
      extensions: this.getNodeExtension(propertyDeclaration),
    };
    return property;
  };
  TypeResolver.prototype.getModelAdditionalProperties = function (node) {
    if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
      var interfaceDeclaration = node;
      var indexMember = interfaceDeclaration.members.find(function (member) {
        return member.kind === ts.SyntaxKind.IndexSignature;
      });
      if (!indexMember) {
        return undefined;
      }
      var indexSignatureDeclaration = indexMember;
      var indexType = new TypeResolver(indexSignatureDeclaration.parameters[0].type, this.current, this.parentNode, this.context).resolve();
      if (indexType.dataType !== 'string') {
        throw new exceptions_1.GenerateMetadataError('Only string indexers are supported.', this.typeNode);
      }
      return new TypeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
    }
    return undefined;
  };
  TypeResolver.prototype.typeArgumentsToContext = function (type, targetEntitiy, context) {
    var _a;
    this.context = {};
    var declaration = this.getModelTypeDeclaration(targetEntitiy);
    var typeParameters = 'typeParameters' in declaration ? declaration.typeParameters : undefined;
    if (typeParameters) {
      for (var index = 0; index < typeParameters.length; index++) {
        var typeParameter = typeParameters[index];
        var typeArg = type.typeArguments && type.typeArguments[index];
        var resolvedType = void 0;
        // Argument may be a forward reference from context
        if (typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) && context[typeArg.typeName.text]) {
          resolvedType = context[typeArg.typeName.text];
        } else if (typeArg) {
          resolvedType = typeArg;
        } else if (typeParameter.default) {
          resolvedType = typeParameter.default;
        } else {
          throw new exceptions_1.GenerateMetadataError('Could not find a value for type parameter ' + typeParameter.name.text, type);
        }
        this.context = __assign(__assign({}, this.context), ((_a = {}), (_a[typeParameter.name.text] = resolvedType), _a));
      }
    }
    return context;
  };
  TypeResolver.prototype.getModelInheritedProperties = function (modelTypeDeclaration) {
    var _this = this;
    var properties = [];
    var heritageClauses = modelTypeDeclaration.heritageClauses;
    if (!heritageClauses) {
      return properties;
    }
    heritageClauses.forEach(function (clause) {
      if (!clause.types) {
        return;
      }
      clause.types.forEach(function (t) {
        var baseEntityName = t.expression;
        // create subContext
        var resetCtx = _this.typeArgumentsToContext(t, baseEntityName, _this.context);
        var referenceType = _this.getReferenceType(t);
        if (referenceType) {
          if (referenceType.dataType === 'refEnum') {
            // since it doesn't have properties to iterate over, then we don't do anything with it
          } else if (referenceType.dataType === 'refAlias') {
            var type = referenceType;
            while (type.dataType === 'refAlias') {
              type = type.type;
            }
            if (type.dataType === 'refObject') {
              properties = __spread(properties, type.properties);
            } else if (type.dataType === 'nestedObjectLiteral') {
              properties = __spread(properties, type.properties);
            }
          } else if (referenceType.dataType === 'refObject') {
            referenceType.properties.forEach(function (property) {
              return properties.push(property);
            });
          } else {
            runtime_1.assertNever(referenceType);
          }
        }
        // reset subContext
        _this.context = resetCtx;
      });
    });
    return properties;
  };
  TypeResolver.prototype.hasPublicModifier = function (node) {
    return (
      !node.modifiers ||
      node.modifiers.every(function (modifier) {
        return modifier.kind !== ts.SyntaxKind.ProtectedKeyword && modifier.kind !== ts.SyntaxKind.PrivateKeyword;
      })
    );
  };
  TypeResolver.prototype.hasStaticModifier = function (node) {
    return (
      node.modifiers &&
      node.modifiers.some(function (modifier) {
        return modifier.kind === ts.SyntaxKind.StaticKeyword;
      })
    );
  };
  TypeResolver.prototype.isAccessibleParameter = function (node) {
    // No modifiers
    if (!node.modifiers) {
      return false;
    }
    // public || public readonly
    if (
      node.modifiers.some(function (modifier) {
        return modifier.kind === ts.SyntaxKind.PublicKeyword;
      })
    ) {
      return true;
    }
    // readonly, not private readonly, not public readonly
    var isReadonly = node.modifiers.some(function (modifier) {
      return modifier.kind === ts.SyntaxKind.ReadonlyKeyword;
    });
    var isProtectedOrPrivate = node.modifiers.some(function (modifier) {
      return modifier.kind === ts.SyntaxKind.ProtectedKeyword || modifier.kind === ts.SyntaxKind.PrivateKeyword;
    });
    return isReadonly && !isProtectedOrPrivate;
  };
  TypeResolver.prototype.getNodeDescription = function (node) {
    var symbol = this.getSymbolAtLocation(node.name);
    if (!symbol) {
      return undefined;
    }
    /**
     * TODO: Workaround for what seems like a bug in the compiler
     * Warrants more investigation and possibly a PR against typescript
     */
    if (node.kind === ts.SyntaxKind.Parameter) {
      // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
      symbol.flags = 0;
    }
    var comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) {
      return ts.displayPartsToString(comments);
    }
    return undefined;
  };
  TypeResolver.prototype.getNodeFormat = function (node) {
    return jsDocUtils_1.getJSDocComment(node, 'format');
  };
  TypeResolver.prototype.getNodeExample = function (node) {
    var exampleJSDoc = jsDocUtils_1.getJSDocComment(node, 'example');
    if (exampleJSDoc) {
      return jsonUtils_1.safeFromJson(exampleJSDoc);
    }
    return decoratorUtils_1.getNodeFirstDecoratorValue(node, this.current.typeChecker, function (dec) {
      return dec.text === 'Example';
    });
  };
  TypeResolver.prototype.getNodeExtension = function (node) {
    var decorators = this.getDecoratorsByIdentifier(node, 'Extension');
    var extensionDecorator = extension_1.getExtensions(decorators, this.current);
    var extensionComments = jsDocUtils_1.getJSDocComments(node, 'extension');
    var extensionJSDoc = extensionComments ? extension_1.getExtensionsFromJSDocComments(extensionComments) : [];
    return extensionDecorator.concat(extensionJSDoc);
  };
  TypeResolver.prototype.getDecoratorsByIdentifier = function (node, id) {
    return decoratorUtils_1.getDecorators(node, function (identifier) {
      return identifier.text === id;
    });
  };
  return TypeResolver;
})();
exports.TypeResolver = TypeResolver;
//# sourceMappingURL=typeResolver.js.map
