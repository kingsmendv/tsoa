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
exports.ParameterGenerator = void 0;
var ts = require('typescript');
var decoratorUtils_1 = require('./../utils/decoratorUtils');
var jsDocUtils_1 = require('./../utils/jsDocUtils');
var validatorUtils_1 = require('./../utils/validatorUtils');
var exceptions_1 = require('./exceptions');
var initializer_value_1 = require('./initializer-value');
var typeResolver_1 = require('./typeResolver');
var headerTypeHelpers_1 = require('../utils/headerTypeHelpers');
var ParameterGenerator = /** @class */ (function () {
  function ParameterGenerator(parameter, method, path, current) {
    this.parameter = parameter;
    this.method = method;
    this.path = path;
    this.current = current;
  }
  ParameterGenerator.prototype.Generate = function () {
    var _this = this;
    var decoratorName = decoratorUtils_1.getNodeFirstDecoratorName(this.parameter, function (identifier) {
      return _this.supportParameterDecorator(identifier.text);
    });
    switch (decoratorName) {
      case 'Request':
        return [this.getRequestParameter(this.parameter)];
      case 'Body':
        return [this.getBodyParameter(this.parameter)];
      case 'BodyProp':
        return [this.getBodyPropParameter(this.parameter)];
      case 'FormField':
        return [this.getFormFieldParameter(this.parameter)];
      case 'Header':
        return [this.getHeaderParameter(this.parameter)];
      case 'Query':
        return this.getQueryParameters(this.parameter);
      case 'Path':
        return [this.getPathParameter(this.parameter)];
      case 'Res':
        return this.getResParameters(this.parameter);
      case 'Inject':
        return [];
      case 'UploadedFile':
        return [this.getUploadedFileParameter(this.parameter)];
      case 'UploadedFiles':
        return [this.getUploadedFileParameter(this.parameter, true)];
      default:
        return [this.getPathParameter(this.parameter)];
    }
  };
  ParameterGenerator.prototype.getRequestParameter = function (parameter) {
    var parameterName = parameter.name.text;
    return {
      description: this.getParameterDescription(parameter),
      in: 'request',
      name: parameterName,
      parameterName: parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: { dataType: 'object' },
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getResParameters = function (parameter) {
    var _this = this;
    var parameterName = parameter.name.text;
    var decorator =
      decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
        return ident.text === 'Res';
      }) || parameterName;
    if (!decorator) {
      throw new exceptions_1.GenerateMetadataError('Could not find Decorator', parameter);
    }
    var typeNode = parameter.type;
    if (!typeNode || !ts.isTypeReferenceNode(typeNode) || typeNode.typeName.getText() !== 'TsoaResponse') {
      throw new exceptions_1.GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }
    if (!typeNode.typeArguments || !typeNode.typeArguments[0]) {
      throw new exceptions_1.GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
    }
    var statusArgument = typeNode.typeArguments[0];
    var bodyArgument = typeNode.typeArguments[1];
    // support a union of status codes, all with the same response body
    var statusArguments = ts.isUnionTypeNode(statusArgument) ? __spread(statusArgument.types) : [statusArgument];
    var statusArgumentTypes = statusArguments.map(function (a) {
      return _this.current.typeChecker.getTypeAtLocation(a);
    });
    var isNumberLiteralType = function (tsType) {
      // eslint-disable-next-line no-bitwise
      return (tsType.getFlags() & ts.TypeFlags.NumberLiteral) !== 0;
    };
    return statusArgumentTypes.map(function (statusArgumentType) {
      if (!isNumberLiteralType(statusArgumentType)) {
        throw new exceptions_1.GenerateMetadataError('@Res() requires the type to be TsoaResponse<HTTPStatusCode, ResBody>', parameter);
      }
      var status = String(statusArgumentType.value);
      var type = new typeResolver_1.TypeResolver(bodyArgument, _this.current, typeNode).resolve();
      var _a = _this.getParameterExample(parameter, parameterName),
        examples = _a.examples,
        exampleLabels = _a.exampleLabels;
      return {
        description: _this.getParameterDescription(parameter) || '',
        in: 'res',
        name: status,
        parameterName: parameterName,
        examples: examples,
        required: true,
        type: type,
        exampleLabels: exampleLabels,
        schema: type,
        validators: {},
        headers: headerTypeHelpers_1.getHeaderType(typeNode.typeArguments, 2, _this.current),
        deprecated: _this.getParameterDeprecation(parameter),
      };
    });
  };
  ParameterGenerator.prototype.getBodyPropParameter = function (parameter) {
    var parameterName = parameter.name.text;
    var type = this.getValidatedType(parameter);
    if (!this.supportBodyMethod(this.method)) {
      throw new exceptions_1.GenerateMetadataError("@BodyProp('" + parameterName + "') Can't support in " + this.method.toUpperCase() + ' method.');
    }
    var _a = this.getParameterExample(parameter, parameterName),
      example = _a.examples,
      exampleLabels = _a.exampleLabels;
    return {
      default: initializer_value_1.getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: example,
      exampleLabels: exampleLabels,
      in: 'body-prop',
      name:
        decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
          return ident.text === 'BodyProp';
        }) || parameterName,
      parameterName: parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: type,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getBodyParameter = function (parameter) {
    var parameterName = parameter.name.text;
    var type = this.getValidatedType(parameter);
    if (!this.supportBodyMethod(this.method)) {
      throw new exceptions_1.GenerateMetadataError("@Body('" + parameterName + "') Can't support in " + this.method.toUpperCase() + ' method.');
    }
    var _a = this.getParameterExample(parameter, parameterName),
      example = _a.examples,
      exampleLabels = _a.exampleLabels;
    return {
      description: this.getParameterDescription(parameter),
      in: 'body',
      name: parameterName,
      example: example,
      exampleLabels: exampleLabels,
      parameterName: parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: type,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getHeaderParameter = function (parameter) {
    var parameterName = parameter.name.text;
    var type = this.getValidatedType(parameter);
    if (!this.supportPathDataType(type)) {
      throw new exceptions_1.GenerateMetadataError("@Header('" + parameterName + "') Can't support '" + type.dataType + "' type.");
    }
    var _a = this.getParameterExample(parameter, parameterName),
      example = _a.examples,
      exampleLabels = _a.exampleLabels;
    return {
      default: initializer_value_1.getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: example,
      exampleLabels: exampleLabels,
      in: 'header',
      name:
        decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
          return ident.text === 'Header';
        }) || parameterName,
      parameterName: parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: type,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getUploadedFileParameter = function (parameter, isArray) {
    var _a;
    var parameterName = parameter.name.text;
    var elementType = { dataType: 'file' };
    var type;
    if (isArray) {
      type = { dataType: 'array', elementType: elementType };
    } else {
      type = elementType;
    }
    if (!this.supportPathDataType(elementType)) {
      throw new exceptions_1.GenerateMetadataError(
        "Parameter '" + parameterName + ':' + type.dataType + "' can't be passed as an uploaded file(s) parameter in '" + this.method.toUpperCase() + "'.",
        parameter,
      );
    }
    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name:
        (_a = decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
          if (isArray) {
            return ident.text === 'UploadedFiles';
          }
          return ident.text === 'UploadedFile';
        })) !== null && _a !== void 0
          ? _a
          : parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: type,
      parameterName: parameterName,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getFormFieldParameter = function (parameter) {
    var _a;
    var parameterName = parameter.name.text;
    var type = { dataType: 'string' };
    if (!this.supportPathDataType(type)) {
      throw new exceptions_1.GenerateMetadataError(
        "Parameter '" + parameterName + ':' + type.dataType + "' can't be passed as form field parameter in '" + this.method.toUpperCase() + "'.",
        parameter,
      );
    }
    return {
      description: this.getParameterDescription(parameter),
      in: 'formData',
      name:
        (_a = decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
          return ident.text === 'FormField';
        })) !== null && _a !== void 0
          ? _a
          : parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      type: type,
      parameterName: parameterName,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getQueryParameters = function (parameter) {
    var parameterName = parameter.name.text;
    var type = this.getValidatedType(parameter);
    var _a = this.getParameterExample(parameter, parameterName),
      example = _a.examples,
      exampleLabels = _a.exampleLabels;
    var commonProperties = {
      default: initializer_value_1.getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: example,
      exampleLabels: exampleLabels,
      in: 'query',
      name:
        decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
          return ident.text === 'Query';
        }) || parameterName,
      parameterName: parameterName,
      required: !parameter.questionToken && !parameter.initializer,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
    if (this.getQueryParamterIsHidden(parameter)) {
      if (commonProperties.required) {
        throw new exceptions_1.GenerateMetadataError("@Query('" + parameterName + "') Can't support @Hidden because it is required (does not allow undefined and does not have a default value).");
      }
      return [];
    }
    if (type.dataType === 'array') {
      var arrayType = type;
      if (!this.supportPathDataType(arrayType.elementType)) {
        throw new exceptions_1.GenerateMetadataError("@Query('" + parameterName + "') Can't support array '" + arrayType.elementType.dataType + "' type.");
      }
      return [__assign(__assign({}, commonProperties), { collectionFormat: 'multi', type: arrayType })];
    }
    if (!this.supportPathDataType(type)) {
      throw new exceptions_1.GenerateMetadataError("@Query('" + parameterName + "') Can't support '" + type.dataType + "' type.");
    }
    return [__assign(__assign({}, commonProperties), { type: type })];
  };
  ParameterGenerator.prototype.getPathParameter = function (parameter) {
    var parameterName = parameter.name.text;
    var type = this.getValidatedType(parameter);
    var pathName = String(
      decoratorUtils_1.getNodeFirstDecoratorValue(this.parameter, this.current.typeChecker, function (ident) {
        return ident.text === 'Path';
      }) || parameterName,
    );
    if (!this.supportPathDataType(type)) {
      throw new exceptions_1.GenerateMetadataError("@Path('" + parameterName + "') Can't support '" + type.dataType + "' type.");
    }
    if (!this.path.includes('{' + pathName + '}') && !this.path.includes(':' + pathName)) {
      throw new exceptions_1.GenerateMetadataError("@Path('" + parameterName + "') Can't match in URL: '" + this.path + "'.");
    }
    var _a = this.getParameterExample(parameter, parameterName),
      examples = _a.examples,
      exampleLabels = _a.exampleLabels;
    return {
      default: initializer_value_1.getInitializerValue(parameter.initializer, this.current.typeChecker, type),
      description: this.getParameterDescription(parameter),
      example: examples,
      exampleLabels: exampleLabels,
      in: 'path',
      name: pathName,
      parameterName: parameterName,
      required: true,
      type: type,
      validators: validatorUtils_1.getParameterValidators(this.parameter, parameterName),
      deprecated: this.getParameterDeprecation(parameter),
    };
  };
  ParameterGenerator.prototype.getParameterDescription = function (node) {
    var symbol = this.current.typeChecker.getSymbolAtLocation(node.name);
    if (!symbol) {
      return undefined;
    }
    var comments = symbol.getDocumentationComment(this.current.typeChecker);
    if (comments.length) {
      return ts.displayPartsToString(comments);
    }
    return undefined;
  };
  ParameterGenerator.prototype.getParameterDeprecation = function (node) {
    return (
      jsDocUtils_1.isExistJSDocTag(node, function (tag) {
        return tag.tagName.text === 'deprecated';
      }) ||
      decoratorUtils_1.isDecorator(node, function (identifier) {
        return identifier.text === 'Deprecated';
      })
    );
  };
  ParameterGenerator.prototype.getParameterExample = function (node, parameterName) {
    var exampleLabels = [];
    var examples = jsDocUtils_1
      .getJSDocTags(node.parent, function (tag) {
        var _a;
        var isExample = (tag.tagName.text === 'example' || tag.tagName.escapedText === 'example') && !!tag.comment && tag.comment.startsWith(parameterName);
        var hasExampleLabel = (((_a = tag.comment) === null || _a === void 0 ? void 0 : _a.indexOf('.')) || -1) > 0;
        if (isExample) {
          // custom example label is delimited by first '.' and the rest will all be included as example label
          exampleLabels.push(hasExampleLabel ? tag.comment.split(' ')[0].split('.').slice(1).join('.') : undefined);
        }
        return isExample;
      })
      .map(function (tag) {
        var _a;
        return (tag.comment || '').replace('' + (((_a = tag.comment) === null || _a === void 0 ? void 0 : _a.split(' ')[0]) || ''), '').replace(/\r/g, '');
      });
    if (examples.length === 0) {
      return {
        exmaples: undefined,
        exampleLabels: undefined,
      };
    } else {
      try {
        return {
          examples: examples.map(function (example) {
            return JSON.parse(example);
          }),
          exampleLabels: exampleLabels,
        };
      } catch (e) {
        throw new exceptions_1.GenerateMetadataError('JSON format is incorrect: ' + String(e.message));
      }
    }
  };
  ParameterGenerator.prototype.supportBodyMethod = function (method) {
    return ['post', 'put', 'patch', 'delete'].some(function (m) {
      return m === method.toLowerCase();
    });
  };
  ParameterGenerator.prototype.supportParameterDecorator = function (decoratorName) {
    return ['header', 'query', 'path', 'body', 'bodyprop', 'request', 'res', 'inject', 'uploadedfile', 'uploadedfiles', 'formfield'].some(function (d) {
      return d === decoratorName.toLocaleLowerCase();
    });
  };
  ParameterGenerator.prototype.supportPathDataType = function (parameterType) {
    var _this = this;
    var supportedPathDataTypes = ['string', 'integer', 'long', 'float', 'double', 'date', 'datetime', 'buffer', 'boolean', 'enum', 'refEnum', 'file', 'any'];
    if (
      supportedPathDataTypes.find(function (t) {
        return t === parameterType.dataType;
      })
    ) {
      return true;
    }
    if (parameterType.dataType === 'refAlias') {
      return this.supportPathDataType(parameterType.type);
    }
    if (parameterType.dataType === 'union') {
      return !parameterType.types
        .map(function (t) {
          return _this.supportPathDataType(t);
        })
        .some(function (t) {
          return t === false;
        });
    }
    return false;
  };
  ParameterGenerator.prototype.getValidatedType = function (parameter) {
    var typeNode = parameter.type;
    if (!typeNode) {
      var type = this.current.typeChecker.getTypeAtLocation(parameter);
      typeNode = this.current.typeChecker.typeToTypeNode(type, undefined, ts.NodeBuilderFlags.NoTruncation);
    }
    return new typeResolver_1.TypeResolver(typeNode, this.current, parameter).resolve();
  };
  ParameterGenerator.prototype.getQueryParamterIsHidden = function (parameter) {
    var hiddenDecorators = decoratorUtils_1.getDecorators(parameter, function (identifier) {
      return identifier.text === 'Hidden';
    });
    if (!hiddenDecorators || !hiddenDecorators.length) {
      return false;
    }
    if (hiddenDecorators.length > 1) {
      var parameterName = parameter.name.text;
      throw new exceptions_1.GenerateMetadataError("Only one Hidden decorator allowed on @Query('" + parameterName + "').");
    }
    return true;
  };
  return ParameterGenerator;
})();
exports.ParameterGenerator = ParameterGenerator;
//# sourceMappingURL=parameterGenerator.js.map
