'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getInitializerValue = void 0;
var ts = require('typescript');
var getInitializerValue = function (initializer, typeChecker, type) {
  if (!initializer || !typeChecker) {
    return;
  }
  switch (initializer.kind) {
    case ts.SyntaxKind.ArrayLiteralExpression:
      var arrayLiteral = initializer;
      return arrayLiteral.elements.map(function (element) {
        return exports.getInitializerValue(element, typeChecker);
      });
    case ts.SyntaxKind.StringLiteral:
      return initializer.text;
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NumberKeyword:
    case ts.SyntaxKind.FirstLiteralToken:
      return Number(initializer.text);
    case ts.SyntaxKind.NewExpression:
      var newExpression = initializer;
      var ident = newExpression.expression;
      if (ident.text === 'Date') {
        var date = new Date();
        if (newExpression.arguments) {
          var newArguments = newExpression.arguments.filter(function (args) {
            return args.kind !== undefined;
          });
          var argsValue = newArguments.map(function (args) {
            return exports.getInitializerValue(args, typeChecker);
          });
          if (argsValue.length > 0) {
            date = new Date(argsValue);
          }
        }
        var dateString = date.toISOString();
        if (type && type.dataType === 'date') {
          return dateString.split('T')[0];
        }
        return dateString;
      }
      return;
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.ObjectLiteralExpression:
      var objectLiteral = initializer;
      var nestedObject_1 = {};
      objectLiteral.properties.forEach(function (p) {
        nestedObject_1[p.name.text] = exports.getInitializerValue(p.initializer, typeChecker);
      });
      return nestedObject_1;
    case ts.SyntaxKind.ImportSpecifier:
      var importSpecifier = initializer;
      var importSymbol = typeChecker.getSymbolAtLocation(importSpecifier.name);
      if (!importSymbol) return;
      var aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
      var declarations = aliasedSymbol.getDeclarations();
      var declaration = declarations && declarations.length > 0 ? declarations[0] : undefined;
      return exports.getInitializerValue(extractInitializer(declaration), typeChecker);
    default:
      var symbol = typeChecker.getSymbolAtLocation(initializer);
      return exports.getInitializerValue(extractInitializer(symbol === null || symbol === void 0 ? void 0 : symbol.valueDeclaration) || extractImportSpecifier(symbol), typeChecker);
  }
};
exports.getInitializerValue = getInitializerValue;
var hasInitializer = function (node) {
  return node.hasOwnProperty('initializer');
};
var extractInitializer = function (decl) {
  return (decl && hasInitializer(decl) && decl.initializer) || undefined;
};
var extractImportSpecifier = function (symbol) {
  return (
    ((symbol === null || symbol === void 0 ? void 0 : symbol.declarations) && symbol.declarations.length > 0 && ts.isImportSpecifier(symbol.declarations[0]) && symbol.declarations[0]) || undefined
  );
};
//# sourceMappingURL=initializer-value.js.map
