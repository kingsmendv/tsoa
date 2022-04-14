'use strict';
var __extends =
  (this && this.__extends) ||
  (function () {
    var extendStatics = function (d, b) {
      extendStatics =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (d, b) {
            d.__proto__ = b;
          }) ||
        function (d, b) {
          for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p];
        };
      return extendStatics(d, b);
    };
    return function (d, b) {
      extendStatics(d, b);
      function __() {
        this.constructor = d;
      }
      d.prototype = b === null ? Object.create(b) : ((__.prototype = b.prototype), new __());
    };
  })();
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
var __values =
  (this && this.__values) ||
  function (o) {
    var s = typeof Symbol === 'function' && Symbol.iterator,
      m = s && o[s],
      i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === 'number')
      return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return { value: o && o[i++], done: !o };
        },
      };
    throw new TypeError(s ? 'Object is not iterable.' : 'Symbol.iterator is not defined.');
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.SpecGenerator3 = void 0;
var runtime_1 = require('@tsoa/runtime');
var isVoidType_1 = require('../utils/isVoidType');
var pathUtils_1 = require('./../utils/pathUtils');
var specGenerator_1 = require('./specGenerator');
/**
 * TODO:
 * Handle formData parameters
 * Handle requestBodies of type other than json
 * Handle requestBodies as reusable objects
 * Handle headers, examples, responses, etc.
 * Cleaner interface between SpecGenerator2 and SpecGenerator3
 * Also accept OpenAPI 3.0.0 metadata, like components/securitySchemes instead of securityDefinitions
 */
var SpecGenerator3 = /** @class */ (function (_super) {
  __extends(SpecGenerator3, _super);
  function SpecGenerator3(metadata, config) {
    var _this = _super.call(this, metadata, config) || this;
    _this.metadata = metadata;
    _this.config = config;
    return _this;
  }
  SpecGenerator3.prototype.GetSpec = function () {
    var spec = {
      components: this.buildComponents(),
      info: this.buildInfo(),
      openapi: '3.0.0',
      paths: this.buildPaths(),
      servers: this.buildServers(),
      tags: this.config.tags,
    };
    if (this.config.spec) {
      this.config.specMerging = this.config.specMerging || 'immediate';
      var mergeFuncs = {
        immediate: Object.assign,
        recursive: require('merge').recursive,
        deepmerge: function (spec, merge) {
          return require('deepmerge').all([spec, merge]);
        },
      };
      spec = mergeFuncs[this.config.specMerging](spec, this.config.spec);
    }
    return spec;
  };
  SpecGenerator3.prototype.buildInfo = function () {
    var info = {
      title: this.config.name || '',
    };
    if (this.config.version) {
      info.version = this.config.version;
    }
    if (this.config.description) {
      info.description = this.config.description;
    }
    if (this.config.license) {
      info.license = { name: this.config.license };
    }
    if (this.config.contact) {
      info.contact = this.config.contact;
    }
    return info;
  };
  SpecGenerator3.prototype.buildComponents = function () {
    var components = {
      examples: {},
      headers: {},
      parameters: {},
      requestBodies: {},
      responses: {},
      schemas: this.buildSchema(),
      securitySchemes: {},
    };
    if (this.config.securityDefinitions) {
      components.securitySchemes = this.translateSecurityDefinitions(this.config.securityDefinitions);
    }
    return components;
  };
  SpecGenerator3.prototype.translateSecurityDefinitions = function (definitions) {
    var _this = this;
    var defs = {};
    Object.keys(definitions).forEach(function (key) {
      if (definitions[key].type === 'basic') {
        defs[key] = {
          scheme: 'basic',
          type: 'http',
        };
      } else if (definitions[key].type === 'oauth2') {
        var definition = definitions[key];
        var oauth = defs[key] || {
          type: 'oauth2',
          description: definitions[key].description,
          flows: (_this.hasOAuthFlows(definition) && definition.flows) || {},
        };
        if (_this.hasOAuthFlow(definition) && definition.flow === 'password') {
          oauth.flows.password = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} };
        } else if (_this.hasOAuthFlow(definition) && definition.flow === 'accessCode') {
          oauth.flows.authorizationCode = { tokenUrl: definition.tokenUrl, authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} };
        } else if (_this.hasOAuthFlow(definition) && definition.flow === 'application') {
          oauth.flows.clientCredentials = { tokenUrl: definition.tokenUrl, scopes: definition.scopes || {} };
        } else if (_this.hasOAuthFlow(definition) && definition.flow === 'implicit') {
          oauth.flows.implicit = { authorizationUrl: definition.authorizationUrl, scopes: definition.scopes || {} };
        }
        defs[key] = oauth;
      } else {
        defs[key] = definitions[key];
      }
    });
    return defs;
  };
  SpecGenerator3.prototype.hasOAuthFlow = function (definition) {
    return !!definition.flow;
  };
  SpecGenerator3.prototype.hasOAuthFlows = function (definition) {
    return !!definition.flows;
  };
  SpecGenerator3.prototype.buildServers = function () {
    var basePath = pathUtils_1.normalisePath(this.config.basePath, '/', undefined, false);
    var scheme = this.config.schemes ? this.config.schemes[0] : 'https';
    var url = this.config.host ? scheme + '://' + this.config.host + basePath : basePath;
    return [
      {
        url: url,
      },
    ];
  };
  SpecGenerator3.prototype.buildSchema = function () {
    var _this = this;
    var schema = {};
    Object.keys(this.metadata.referenceTypeMap).map(function (typeName) {
      var referenceType = _this.metadata.referenceTypeMap[typeName];
      if (referenceType.dataType === 'refObject') {
        var required = referenceType.properties
          .filter(function (p) {
            return p.required;
          })
          .map(function (p) {
            return p.name;
          });
        schema[referenceType.refName] = {
          description: referenceType.description,
          properties: _this.buildProperties(referenceType.properties),
          required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
          type: 'object',
        };
        if (referenceType.additionalProperties) {
          schema[referenceType.refName].additionalProperties = _this.buildAdditionalProperties(referenceType.additionalProperties);
        } else {
          // Since additionalProperties was not explicitly set in the TypeScript interface for this model
          //      ...we need to make a decision
          schema[referenceType.refName].additionalProperties = _this.determineImplicitAdditionalPropertiesValue();
        }
        if (referenceType.example) {
          schema[referenceType.refName].example = referenceType.example;
        }
      } else if (referenceType.dataType === 'refEnum') {
        var enumTypes = _this.determineTypesUsedInEnum(referenceType.enums);
        if (enumTypes.size === 1) {
          schema[referenceType.refName] = {
            description: referenceType.description,
            enum: referenceType.enums,
            type: enumTypes.has('string') ? 'string' : 'number',
          };
          if (_this.config.xEnumVarnames && referenceType.enumVarnames !== undefined && referenceType.enums.length === referenceType.enumVarnames.length) {
            schema[referenceType.refName]['x-enum-varnames'] = referenceType.enumVarnames;
          }
        } else {
          schema[referenceType.refName] = {
            description: referenceType.description,
            anyOf: [
              {
                type: 'number',
                enum: referenceType.enums.filter(function (e) {
                  return typeof e === 'number';
                }),
              },
              {
                type: 'string',
                enum: referenceType.enums.filter(function (e) {
                  return typeof e === 'string';
                }),
              },
            ],
          };
        }
      } else if (referenceType.dataType === 'refAlias') {
        var swaggerType = _this.getSwaggerType(referenceType.type);
        var format = referenceType.format;
        var validators = Object.keys(referenceType.validators)
          .filter(function (key) {
            return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
          })
          .reduce(function (acc, key) {
            var _a;
            return __assign(__assign({}, acc), ((_a = {}), (_a[key] = referenceType.validators[key].value), _a));
          }, {});
        schema[referenceType.refName] = __assign(
          __assign(__assign({}, swaggerType), {
            default: referenceType.default || swaggerType.default,
            example: referenceType.example,
            format: format || swaggerType.format,
            description: referenceType.description,
          }),
          validators,
        );
      } else {
        runtime_1.assertNever(referenceType);
      }
      if (referenceType.deprecated) {
        schema[referenceType.refName].deprecated = true;
      }
    });
    return schema;
  };
  SpecGenerator3.prototype.buildPaths = function () {
    var _this = this;
    var paths = {};
    this.metadata.controllers.forEach(function (controller) {
      var normalisedControllerPath = pathUtils_1.normalisePath(controller.path, '/');
      // construct documentation using all methods except @Hidden
      controller.methods
        .filter(function (method) {
          return !method.isHidden;
        })
        .forEach(function (method) {
          var normalisedMethodPath = pathUtils_1.normalisePath(method.path, '/');
          var path = pathUtils_1.normalisePath('' + normalisedControllerPath + normalisedMethodPath, '/', '', false);
          path = pathUtils_1.convertColonPathParams(path);
          paths[path] = paths[path] || {};
          _this.buildMethod(controller.name, method, paths[path]);
        });
    });
    return paths;
  };
  SpecGenerator3.prototype.buildMethod = function (controllerName, method, pathObject) {
    var _this = this;
    var pathMethod = (pathObject[method.method] = this.buildOperation(controllerName, method));
    pathMethod.description = method.description;
    pathMethod.summary = method.summary;
    pathMethod.tags = method.tags;
    // Use operationId tag otherwise fallback to generated. Warning: This doesn't check uniqueness.
    pathMethod.operationId = method.operationId || pathMethod.operationId;
    if (method.deprecated) {
      pathMethod.deprecated = method.deprecated;
    }
    if (method.security) {
      pathMethod.security = method.security;
    }
    var bodyParams = method.parameters.filter(function (p) {
      return p.in === 'body';
    });
    var formParams = method.parameters.filter(function (p) {
      return p.in === 'formData';
    });
    pathMethod.parameters = method.parameters
      .filter(function (p) {
        return ['body', 'formData', 'request', 'body-prop', 'res'].indexOf(p.in) === -1;
      })
      .map(function (p) {
        return _this.buildParameter(p);
      });
    if (bodyParams.length > 1) {
      throw new Error('Only one body parameter allowed per controller method.');
    }
    if (bodyParams.length > 0 && formParams.length > 0) {
      throw new Error('Either body parameter or form parameters allowed per controller method - not both.');
    }
    if (bodyParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBody(controllerName, method, bodyParams[0]);
    } else if (formParams.length > 0) {
      pathMethod.requestBody = this.buildRequestBodyWithFormData(controllerName, method, formParams);
    }
    method.extensions.forEach(function (ext) {
      return (pathMethod[ext.key] = ext.value);
    });
  };
  SpecGenerator3.prototype.buildOperation = function (controllerName, method) {
    var _this = this;
    var swaggerResponses = {};
    method.responses.forEach(function (res) {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && !isVoidType_1.isVoidType(res.schema)) {
        swaggerResponses[res.name].content = {
          'application/json': {
            schema: _this.getSwaggerType(res.schema),
          },
        };
        if (res.examples) {
          var exampleCounter_1 = 1;
          var examples = res.examples.reduce(function (acc, ex, currentIndex) {
            var _a;
            var _b;
            var exampleLabel = (_b = res.exampleLabels) === null || _b === void 0 ? void 0 : _b[currentIndex];
            return __assign(__assign({}, acc), ((_a = {}), (_a[exampleLabel === undefined ? 'Example ' + exampleCounter_1++ : exampleLabel] = { value: ex }), _a));
          }, {});
          /* eslint-disable @typescript-eslint/dot-notation */
          (swaggerResponses[res.name].content || {})['application/json']['examples'] = examples;
        }
      }
      if (res.headers) {
        var headers_1 = {};
        if (res.headers.dataType === 'refObject') {
          headers_1[res.headers.refName] = {
            schema: _this.getSwaggerTypeForReferenceType(res.headers),
            description: res.headers.description,
          };
        } else if (res.headers.dataType === 'nestedObjectLiteral') {
          res.headers.properties.forEach(function (each) {
            headers_1[each.name] = {
              schema: _this.getSwaggerType(each.type),
              description: each.description,
              required: each.required,
            };
          });
        } else {
          runtime_1.assertNever(res.headers);
        }
        swaggerResponses[res.name].headers = headers_1;
      }
    });
    var operation = {
      operationId: this.getOperationId(method.name),
      responses: swaggerResponses,
    };
    return operation;
  };
  SpecGenerator3.prototype.buildRequestBodyWithFormData = function (controllerName, method, parameters) {
    var e_1, _a;
    var required = [];
    var properties = {};
    try {
      for (var parameters_1 = __values(parameters), parameters_1_1 = parameters_1.next(); !parameters_1_1.done; parameters_1_1 = parameters_1.next()) {
        var parameter = parameters_1_1.value;
        var mediaType = this.buildMediaType(controllerName, method, parameter);
        properties[parameter.name] = mediaType.schema;
        if (parameter.required) {
          required.push(parameter.name);
        }
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (parameters_1_1 && !parameters_1_1.done && (_a = parameters_1.return)) _a.call(parameters_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
    var requestBody = {
      required: required.length > 0,
      content: {
        'multipart/form-data': {
          schema: __assign({ type: 'object', properties: properties }, required && required.length && { required: required }),
        },
      },
    };
    return requestBody;
  };
  SpecGenerator3.prototype.buildRequestBody = function (controllerName, method, parameter) {
    var mediaType = this.buildMediaType(controllerName, method, parameter);
    var requestBody = {
      description: parameter.description,
      required: parameter.required,
      content: {
        'application/json': mediaType,
      },
    };
    return requestBody;
  };
  SpecGenerator3.prototype.buildMediaType = function (controllerName, method, parameter) {
    var validators = Object.keys(parameter.validators)
      .filter(function (key) {
        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
      })
      .reduce(function (acc, key) {
        var _a;
        return __assign(__assign({}, acc), ((_a = {}), (_a[key] = validators[key].value), _a));
      }, {});
    var mediaType = {
      schema: __assign(__assign({}, this.getSwaggerType(parameter.type)), validators),
    };
    var parameterExamples = parameter.example;
    var parameterExampleLabels = parameter.exampleLabels;
    if (parameterExamples === undefined) {
      mediaType.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      mediaType.example = parameterExamples[0];
    } else {
      var exampleCounter_2 = 1;
      mediaType.examples = parameterExamples.reduce(function (acc, ex, currentIndex) {
        var _a;
        var exampleLabel = parameterExampleLabels === null || parameterExampleLabels === void 0 ? void 0 : parameterExampleLabels[currentIndex];
        return __assign(__assign({}, acc), ((_a = {}), (_a[exampleLabel === undefined ? 'Example ' + exampleCounter_2++ : exampleLabel] = { value: ex }), _a));
      }, {});
    }
    return mediaType;
  };
  SpecGenerator3.prototype.buildParameter = function (source) {
    var parameter = {
      description: source.description,
      in: source.in,
      name: source.name,
      required: source.required,
      schema: {
        default: source.default,
        format: undefined,
      },
    };
    if (source.deprecated) {
      parameter.deprecated = true;
    }
    var parameterType = this.getSwaggerType(source.type);
    if (parameterType.format) {
      parameter.schema.format = this.throwIfNotDataFormat(parameterType.format);
    }
    if (parameterType.$ref) {
      parameter.schema = parameterType;
      return parameter;
    }
    var validatorObjs = {};
    Object.keys(source.validators)
      .filter(function (key) {
        return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
      })
      .forEach(function (key) {
        validatorObjs[key] = source.validators[key].value;
      });
    if (source.type.dataType === 'any') {
      parameter.schema.type = 'string';
    } else {
      if (parameterType.type) {
        parameter.schema.type = this.throwIfNotDataType(parameterType.type);
      }
      parameter.schema.items = parameterType.items;
      parameter.schema.enum = parameterType.enum;
    }
    parameter.schema = Object.assign({}, parameter.schema, validatorObjs);
    var parameterExamples = source.example;
    var parameterExampleLabels = source.exampleLabels;
    if (parameterExamples === undefined) {
      parameter.example = parameterExamples;
    } else if (parameterExamples.length === 1) {
      parameter.example = parameterExamples[0];
    } else {
      var exampleCounter_3 = 1;
      parameter.examples = parameterExamples.reduce(function (acc, ex, currentIndex) {
        var _a;
        var exampleLabel = parameterExampleLabels === null || parameterExampleLabels === void 0 ? void 0 : parameterExampleLabels[currentIndex];
        return __assign(__assign({}, acc), ((_a = {}), (_a[exampleLabel === undefined ? 'Example ' + exampleCounter_3++ : exampleLabel] = { value: ex }), _a));
      }, {});
    }
    return parameter;
  };
  SpecGenerator3.prototype.buildProperties = function (source) {
    var _this = this;
    var properties = {};
    source.forEach(function (property) {
      var swaggerType = _this.getSwaggerType(property.type);
      var format = property.format;
      swaggerType.description = property.description;
      swaggerType.example = property.example;
      swaggerType.format = format || swaggerType.format;
      if (!swaggerType.$ref) {
        swaggerType.default = property.default;
        Object.keys(property.validators)
          .filter(function (key) {
            return !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate';
          })
          .forEach(function (key) {
            swaggerType[key] = property.validators[key].value;
          });
      }
      if (property.deprecated) {
        swaggerType.deprecated = true;
      }
      if (property.extensions) {
        property.extensions.forEach(function (property) {
          swaggerType[property.key] = property.value;
        });
      }
      properties[property.name] = swaggerType;
    });
    return properties;
  };
  SpecGenerator3.prototype.getSwaggerTypeForReferenceType = function (referenceType) {
    return { $ref: '#/components/schemas/' + referenceType.refName };
  };
  SpecGenerator3.prototype.getSwaggerTypeForPrimitiveType = function (dataType) {
    if (dataType === 'any') {
      // Setting additionalProperties causes issues with code generators for OpenAPI 3
      // Therefore, we avoid setting it explicitly (since it's the implicit default already)
      return {};
    } else if (dataType === 'file') {
      return { type: 'string', format: 'binary' };
    }
    return _super.prototype.getSwaggerTypeForPrimitiveType.call(this, dataType);
  };
  SpecGenerator3.prototype.isNull = function (type) {
    return type.dataType === 'enum' && type.enums.length === 1 && type.enums[0] === null;
  };
  // Join disparate enums with the same type into one.
  //
  // grouping enums is helpful because it makes the spec more readable and it
  // bypasses a failure in openapi-generator caused by using anyOf with
  // duplicate types.
  SpecGenerator3.prototype.groupEnums = function (types) {
    var e_2, _a, e_3, _b;
    var returnTypes = [];
    var enumValuesByType = {};
    try {
      for (var types_1 = __values(types), types_1_1 = types_1.next(); !types_1_1.done; types_1_1 = types_1.next()) {
        var type = types_1_1.value;
        if (type.enum && type.type) {
          try {
            for (var _c = ((e_3 = void 0), __values(type.enum)), _d = _c.next(); !_d.done; _d = _c.next()) {
              var enumValue = _d.value;
              if (!enumValuesByType[type.type]) {
                enumValuesByType[type.type] = [];
              }
              enumValuesByType[type.type][enumValue] = enumValue;
            }
          } catch (e_3_1) {
            e_3 = { error: e_3_1 };
          } finally {
            try {
              if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            } finally {
              if (e_3) throw e_3.error;
            }
          }
        }
        // preserve non-enum types
        else {
          returnTypes.push(type);
        }
      }
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (types_1_1 && !types_1_1.done && (_a = types_1.return)) _a.call(types_1);
      } finally {
        if (e_2) throw e_2.error;
      }
    }
    Object.keys(enumValuesByType).forEach(function (dataType) {
      return returnTypes.push({
        type: dataType,
        enum: Object.values(enumValuesByType[dataType]),
      });
    });
    return returnTypes;
  };
  SpecGenerator3.prototype.removeDuplicateSwaggerTypes = function (types) {
    var e_4, _a;
    if (types.length === 1) {
      return types;
    } else {
      var typesSet = new Set();
      try {
        for (var types_2 = __values(types), types_2_1 = types_2.next(); !types_2_1.done; types_2_1 = types_2.next()) {
          var type = types_2_1.value;
          typesSet.add(JSON.stringify(type));
        }
      } catch (e_4_1) {
        e_4 = { error: e_4_1 };
      } finally {
        try {
          if (types_2_1 && !types_2_1.done && (_a = types_2.return)) _a.call(types_2);
        } finally {
          if (e_4) throw e_4.error;
        }
      }
      return Array.from(typesSet).map(function (typeString) {
        return JSON.parse(typeString);
      });
    }
  };
  SpecGenerator3.prototype.getSwaggerTypeForUnionType = function (type) {
    var _this = this;
    var notNullSwaggerTypes = this.removeDuplicateSwaggerTypes(
      this.groupEnums(
        type.types
          .filter(function (x) {
            return !_this.isNull(x);
          })
          .map(function (x) {
            return _this.getSwaggerType(x);
          }),
      ),
    );
    var nullable = type.types.some(function (x) {
      return _this.isNull(x);
    });
    if (nullable && notNullSwaggerTypes.length === 1) {
      var _a = __read(notNullSwaggerTypes, 1),
        swaggerType = _a[0];
      // let special case of ref union with null to use an allOf with a single
      // element since you can't attach nullable directly to a ref.
      // https://swagger.io/docs/specification/using-ref/#syntax
      //
      // Using this format has the benefit that its already supported by the
      // openapi typescript-fetch generation.
      if (swaggerType.$ref) {
        return { allOf: [swaggerType], nullable: true };
      } else {
        swaggerType['nullable'] = true;
        return swaggerType;
      }
    }
    if (nullable) {
      if (notNullSwaggerTypes.length === 1) {
        var _b = __read(notNullSwaggerTypes, 1),
          swaggerType = _b[0];
        // for ref union with null, use an allOf with a single
        // element since you can't attach nullable directly to a ref.
        // https://swagger.io/docs/specification/using-ref/#syntax
        if (swaggerType.$ref) {
          return { allOf: [swaggerType], nullable: nullable };
        }
        return __assign(__assign({}, swaggerType), { nullable: nullable });
      } else {
        return { anyOf: notNullSwaggerTypes, nullable: nullable };
      }
    } else {
      if (notNullSwaggerTypes.length === 1) {
        return notNullSwaggerTypes[0];
      } else {
        return { anyOf: notNullSwaggerTypes };
      }
    }
  };
  SpecGenerator3.prototype.getSwaggerTypeForIntersectionType = function (type) {
    var _this = this;
    return {
      allOf: type.types.map(function (x) {
        return _this.getSwaggerType(x);
      }),
    };
  };
  SpecGenerator3.prototype.getSwaggerTypeForEnumType = function (enumType) {
    var types = this.determineTypesUsedInEnum(enumType.enums);
    if (types.size === 1) {
      var type = types.values().next().value;
      var nullable = enumType.enums.includes(null) ? true : false;
      return {
        type: type,
        enum: enumType.enums.map(function (member) {
          return member === null ? null : String(member);
        }),
        nullable: nullable,
      };
    } else {
      var valuesDelimited = Array.from(types).join(',');
      throw new Error('Enums can only have string or number values, but enum had ' + valuesDelimited);
    }
  };
  return SpecGenerator3;
})(specGenerator_1.SpecGenerator);
exports.SpecGenerator3 = SpecGenerator3;
//# sourceMappingURL=specGenerator3.js.map
