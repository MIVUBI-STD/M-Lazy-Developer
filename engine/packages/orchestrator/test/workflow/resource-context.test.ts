import { describe, expect, it } from "vitest";
import type { RetrievalResult } from "../../../analysis-planner/src/index.js";
import {
  compileResourceContext,
  compileSectionContext,
  type RetrievedKnowledgeContext,
} from "../../src/workflow/resource-context.js";

const selection: readonly RetrievalResult[] = [
  {
    resource: {
      id: "document.analysis.player-lifecycle",
      class: "DOCUMENT",
      domain: "analysis",
      role: "DOMAIN",
      authority: "CANONICAL",
      path: "docs/analysis/player-lifecycle.md",
      lifecycle: "ACTIVE",
    },
    score: {
      routing: 30,
      graph: 12,
      structural: 16,
      lexical: 0,
      semantic: 0,
      authority: 20,
      total: 78,
    },
    reasons: [
      "domain-route",
      "graph-relation",
      "structural-match",
      "authority:CANONICAL",
    ],
  },
  {
    resource: {
      id: "reliability.system.history",
      class: "RELIABILITY",
      domain: "system",
      authority: "HISTORICAL",
      path: "engine/reliability/history",
      lifecycle: "ACTIVE",
    },
    score: {
      routing: 0,
      graph: 0,
      structural: 8,
      lexical: 0,
      semantic: 0,
      authority: 0,
      total: 8,
    },
    reasons: [
      "structural-match",
      "authority:HISTORICAL",
    ],
  },
];

describe("compileResourceContext", () => {
  it("preserves authority and ranking provenance", () => {
    const context = compileResourceContext(selection, 1);

    expect(context).toEqual({
      items: [
        {
          id: "document.analysis.player-lifecycle",
          class: "DOCUMENT",
          domain: "analysis",
          role: "DOMAIN",
          authority: "CANONICAL",
          path: "docs/analysis/player-lifecycle.md",
          score: 78,
          reasons: [
            "domain-route",
            "graph-relation",
            "structural-match",
            "authority:CANONICAL",
          ],
        },
      ],
      omitted: 1,
    });
  });

  it("delivers selected Knowledge content with provenance and explicit unknown applicability", () => {
    const chosen: RetrievalResult = {
      ...selection[0]!,
      resource: {
        id: "knowledge.persistence.relation-worldload-gates-reconcile",
        class: "KNOWLEDGE",
        domain: "persistence",
        authority: "REFERENCE",
        path: "engine/knowledge/world-engine/persistence-bedrock.json",
        locator: "persistence.relation-worldload-gates-reconcile",
        lifecycle: "ACTIVE",
      },
    };
    const record: RetrievedKnowledgeContext = {
      kind: "relation",
      subject: "worldLoad",
      summary: "worldLoad gates durable-state-reconciliation",
      classification: "derived-rule",
      applicability: { editions: ["bedrock", "education"] },
      applicabilityStatus: "NOT_EVALUATED",
      sourceIds: ["ms-persist-v2"],
      sources: [{
        id: "ms-persist-v2",
        title: "Multiplayer-Aware Scripts",
        url: "https://learn.microsoft.com/en-us/minecraft/creator/",
        authority: "official",
        confidence: "documented",
        retrievedDate: "2026-09-23",
      }],
      relation: { kind: "gates", object: "durable-state-reconciliation" },
    };
    const withContent = compileResourceContext([chosen], 1, {
      [chosen.resource.id]: record,
    });
    expect(withContent?.items[0]?.knowledge).toEqual(record);
    expect(withContent?.knowledgeContent).toEqual({
      status: "COMPLETE",
      missingResourceIds: [],
    });

    const withoutContent = compileResourceContext([chosen], 1, {});
    expect(withoutContent?.items[0]?.knowledge).toBeUndefined();
    expect(withoutContent?.knowledgeContent).toEqual({
      status: "PARTIAL",
      missingResourceIds: [chosen.resource.id],
    });
  });

  it("rejects invalid resource context limits", () => {
    expect(() => compileResourceContext(selection, 0)).toThrow(
      /positive integer/,
    );
  });
});

describe("compileSectionContext", () => {
  it("preserves exact document range and ranking provenance", () => {
    const context = compileSectionContext([
      {
        section: {
          id: "document.analysis.mandatory-audit-procedure#prove",
          documentId: "document.analysis.mandatory-audit-procedure",
          path: "docs/analysis/mandatory-audit-procedure.md",
          heading: "PROVE",
          level: 2,
          anchor: "prove",
          startLine: 100,
          endLine: 180,
        },
        score: {
          documentScope: 30,
          heading: 40,
          lexical: 0,
          semantic: 0,
          level: 8,
          total: 78,
        },
        reasons: [
          "document-scope",
          "heading-match",
          "heading-level:2",
        ],
      },
    ]);

    expect(context).toEqual({
      items: [
        {
          id: "document.analysis.mandatory-audit-procedure#prove",
          documentId: "document.analysis.mandatory-audit-procedure",
          path: "docs/analysis/mandatory-audit-procedure.md",
          heading: "PROVE",
          anchor: "prove",
          startLine: 100,
          endLine: 180,
          score: 78,
          reasons: [
            "document-scope",
            "heading-match",
            "heading-level:2",
          ],
        },
      ],
      omitted: 0,
    });
  });
});