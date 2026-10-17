import { describe, expect, it } from "vitest";
import { importSpecifiers } from "./source-import-specifiers.mjs";

describe("canonical repository import discovery", () => {
  it("does not turn comments or string examples into dependency edges", () => {
    const imports = importSpecifiers(
      "file.ts",
      '// import fake from "./not-a-module.js";\n' +
        'const documentation = `export { X } from "./also-not-a-module.js"`;',
    );
    expect(imports).toEqual([]);
  });

  it("keeps type-only imports separate from runtime imports", () => {
    const imports = importSpecifiers(
      "file.ts",
      'import type { Config } from "./types.js";\n' +
        'import { type Options } from "./only-types.js";\n' +
        'import { type State, run } from "./runtime.js";',
    );
    expect(imports).toEqual([
      { specifier: "./types.js", runtime: false },
      { specifier: "./only-types.js", runtime: false },
      { specifier: "./runtime.js", runtime: true },
    ]);
  });

  it("does not report named type-only re-exports as runtime dependencies", () => {
    const imports = importSpecifiers(
      "file.ts",
      'export { type Foo } from "./types.js";\n' +
        'export { type Bar, Baz } from "./mixed.js";\n' +
        'export type { Other } from "./other-types.js";',
    );
    expect(imports).toEqual([
      { specifier: "./types.js", runtime: false },
      { specifier: "./mixed.js", runtime: true },
      { specifier: "./other-types.js", runtime: false },
    ]);
  });

  it("records type-position import() for source validation but not runtime cycles", () => {
    const imports = importSpecifiers(
      "file.ts",
      'type Contract = import("./contract.js").Type;\n' +
        'interface Box { value: import("./schema.js").Record; }\n' +
        'const loaded = import("./runtime.js");\n' +
        'const unknown = import(expression);',
    );
    expect(imports).toEqual([
      { specifier: "./contract.js", runtime: false },
      { specifier: "./schema.js", runtime: false },
      { specifier: "./runtime.js", runtime: true },
    ]);
  });
});
