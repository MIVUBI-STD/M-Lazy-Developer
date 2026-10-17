import ts from "typescript";

// Derive actual imports from AST, never from text in comments, template strings
// or generated source examples (which previously produced phantom edges).
export function importSpecifiers(filePath, content) {
  const kind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX :
    /\.[cm]?js$/.test(filePath) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const file = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, kind);
  const found = [];
  const visit = (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      const typeOnly = ts.isImportDeclaration(node)
        ? (node.importClause?.isTypeOnly === true ||
           (node.importClause?.namedBindings &&
            ts.isNamedImports(node.importClause.namedBindings) &&
            node.importClause.namedBindings.elements.length > 0 &&
            node.importClause.namedBindings.elements.every(item => item.isTypeOnly)))
        : (node.isTypeOnly ||
           (node.exportClause && ts.isNamedExports(node.exportClause) &&
            node.exportClause.elements.length > 0 &&
            node.exportClause.elements.every(item => item.isTypeOnly)));
      found.push({ specifier: node.moduleSpecifier.text, runtime: !typeOnly });
    }
    if (ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        node.moduleReference.expression && ts.isStringLiteralLike(node.moduleReference.expression)) {
      found.push({specifier: node.moduleReference.expression.text, runtime: !node.isTypeOnly});
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length === 1 && ts.isStringLiteralLike(node.arguments[0])) {
      found.push({specifier: node.arguments[0].text, runtime: true});
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

