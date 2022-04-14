'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.MetadataGenerator = void 0;
var mm = require('minimatch');
var ts = require('typescript');
var importClassesFromDirectories_1 = require('../utils/importClassesFromDirectories');
var controllerGenerator_1 = require('./controllerGenerator');
var exceptions_1 = require('./exceptions');
var typeResolver_1 = require('./typeResolver');
var decoratorUtils_1 = require('../utils/decoratorUtils');
var MetadataGenerator = /** @class */ (function () {
  function MetadataGenerator(entryFile, compilerOptions, ignorePaths, controllers) {
    this.compilerOptions = compilerOptions;
    this.ignorePaths = ignorePaths;
    this.controllerNodes = new Array();
    this.referenceTypeMap = {};
    this.circularDependencyResolvers = new Array();
    this.checkForMethodSignatureDuplicates = function (controllers) {
      var map = {};
      controllers.forEach(function (controller) {
        controller.methods.forEach(function (method) {
          var signature = method.path ? '@' + method.method + '(' + controller.path + '/' + method.path + ')' : '@' + method.method + '(' + controller.path + ')';
          var methodDescription = controller.name + '#' + method.name;
          if (map[signature]) {
            map[signature].push(methodDescription);
          } else {
            map[signature] = [methodDescription];
          }
        });
      });
      var message = '';
      Object.keys(map).forEach(function (signature) {
        var controllers = map[signature];
        if (controllers.length > 1) {
          message += 'Duplicate method signature ' + signature + ' found in controllers: ' + controllers.join(', ') + '\n';
        }
      });
      if (message) {
        throw new exceptions_1.GenerateMetadataError(message);
      }
    };
    this.checkForPathParamSignatureDuplicates = function (controllers) {
      var paramRegExp = new RegExp('{(\\w*)}|:(\\w+)', 'g');
      var PathDuplicationType;
      (function (PathDuplicationType) {
        PathDuplicationType[(PathDuplicationType['FULL'] = 0)] = 'FULL';
        PathDuplicationType[(PathDuplicationType['PARTIAL'] = 1)] = 'PARTIAL';
      })(PathDuplicationType || (PathDuplicationType = {}));
      var collisions = [];
      function addCollision(type, method, controller, collidesWith) {
        var existingCollision = collisions.find(function (collision) {
          return collision.type === type && collision.method === method && collision.controller === controller;
        });
        if (!existingCollision) {
          existingCollision = {
            type: type,
            method: method,
            controller: controller,
            collidesWith: [],
          };
          collisions.push(existingCollision);
        }
        existingCollision.collidesWith.push(collidesWith);
      }
      controllers.forEach(function (controller) {
        var methodRouteGroup = {};
        // Group all ts methods with HTTP method decorator into same object in same controller.
        controller.methods.forEach(function (method) {
          if (methodRouteGroup[method.method] === undefined) {
            methodRouteGroup[method.method] = [];
          }
          var params = method.path.match(paramRegExp);
          methodRouteGroup[method.method].push({
            method: method,
            path:
              (params === null || params === void 0
                ? void 0
                : params.reduce(function (s, a) {
                    // replace all params with {} placeholder for comparison
                    return s.replace(a, '{}');
                  }, method.path)) || method.path,
          });
        });
        Object.keys(methodRouteGroup).forEach(function (key) {
          var methodRoutes = methodRouteGroup[key];
          // check each route with the routes that are defined before it
          for (var i = 0; i < methodRoutes.length; i += 1) {
            var _loop_1 = function (j) {
              if (methodRoutes[i].path === methodRoutes[j].path) {
                // full match
                addCollision(PathDuplicationType.FULL, methodRoutes[i].method, controller, methodRoutes[j].method);
              } else if (
                methodRoutes[i].path.split('/').length === methodRoutes[j].path.split('/').length &&
                methodRoutes[j].path
                  .substr(methodRoutes[j].path.lastIndexOf('/')) // compare only the "last" part of the path
                  .split('/')
                  .some(function (v) {
                    return !!v;
                  }) && // ensure the comparison path has a value
                methodRoutes[i].path.split('/').every(function (v, index) {
                  var comparisonPathPart = methodRoutes[j].path.split('/')[index];
                  // if no params, compare values
                  if (!v.includes('{}')) {
                    return v === comparisonPathPart;
                  }
                  // otherwise check if route starts with comparison route
                  return v.startsWith(methodRoutes[j].path.split('/')[index]);
                })
              ) {
                // partial match - reorder routes!
                addCollision(PathDuplicationType.PARTIAL, methodRoutes[i].method, controller, methodRoutes[j].method);
              }
            };
            for (var j = 0; j < i; j += 1) {
              _loop_1(j);
            }
          }
        });
      });
      // print warnings for each collision (grouped by route)
      collisions.forEach(function (collision) {
        var message = '';
        if (collision.type === PathDuplicationType.FULL) {
          message = 'Duplicate path parameter definition signature found in controller ';
        } else if (collision.type === PathDuplicationType.PARTIAL) {
          message = 'Overlapping path parameter definition signature found in controller ';
        }
        message += collision.controller.name;
        message += ' [ method ' + collision.method.method.toUpperCase() + ' ' + collision.method.name + ' route: ' + collision.method.path + ' ] collides with ';
        message += collision.collidesWith
          .map(function (method) {
            return '[ method ' + method.method.toUpperCase() + ' ' + method.name + ' route: ' + method.path + ' ]';
          })
          .join(', ');
        message += '\n';
        console.warn(message);
      });
    };
    typeResolver_1.TypeResolver.clearCache();
    this.program = !!controllers ? this.setProgramToDynamicControllersFiles(controllers) : ts.createProgram([entryFile], compilerOptions || {});
    this.typeChecker = this.program.getTypeChecker();
  }
  MetadataGenerator.prototype.Generate = function () {
    var _this = this;
    this.extractNodeFromProgramSourceFiles();
    var controllers = this.buildControllers();
    this.checkForMethodSignatureDuplicates(controllers);
    this.checkForPathParamSignatureDuplicates(controllers);
    this.circularDependencyResolvers.forEach(function (c) {
      return c(_this.referenceTypeMap);
    });
    return {
      controllers: controllers,
      referenceTypeMap: this.referenceTypeMap,
    };
  };
  MetadataGenerator.prototype.setProgramToDynamicControllersFiles = function (controllers) {
    var allGlobFiles = importClassesFromDirectories_1.importClassesFromDirectories(controllers);
    if (allGlobFiles.length === 0) {
      throw new exceptions_1.GenerateMetadataError('[' + controllers.join(', ') + '] globs found 0 controllers.');
    }
    return ts.createProgram(allGlobFiles, this.compilerOptions || {});
  };
  MetadataGenerator.prototype.extractNodeFromProgramSourceFiles = function () {
    var _this = this;
    this.program.getSourceFiles().forEach(function (sf) {
      var e_1, _a;
      if (_this.ignorePaths && _this.ignorePaths.length) {
        try {
          for (var _b = __values(_this.ignorePaths), _c = _b.next(); !_c.done; _c = _b.next()) {
            var path = _c.value;
            if (mm(sf.fileName, path)) {
              return;
            }
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
          } finally {
            if (e_1) throw e_1.error;
          }
        }
      }
      ts.forEachChild(sf, function (node) {
        if (
          ts.isClassDeclaration(node) &&
          decoratorUtils_1.getDecorators(node, function (identifier) {
            return identifier.text === 'Route';
          }).length
        ) {
          _this.controllerNodes.push(node);
        }
      });
    });
  };
  MetadataGenerator.prototype.TypeChecker = function () {
    return this.typeChecker;
  };
  MetadataGenerator.prototype.AddReferenceType = function (referenceType) {
    if (!referenceType.refName) {
      return;
    }
    this.referenceTypeMap[referenceType.refName] = referenceType;
  };
  MetadataGenerator.prototype.GetReferenceType = function (refName) {
    return this.referenceTypeMap[refName];
  };
  MetadataGenerator.prototype.OnFinish = function (callback) {
    this.circularDependencyResolvers.push(callback);
  };
  MetadataGenerator.prototype.buildControllers = function () {
    var _this = this;
    return this.controllerNodes
      .map(function (classDeclaration) {
        return new controllerGenerator_1.ControllerGenerator(classDeclaration, _this);
      })
      .filter(function (generator) {
        return generator.IsValid();
      })
      .map(function (generator) {
        return generator.Generate();
      });
  };
  return MetadataGenerator;
})();
exports.MetadataGenerator = MetadataGenerator;
//# sourceMappingURL=metadataGenerator.js.map
