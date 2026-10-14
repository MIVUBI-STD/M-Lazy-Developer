import { describe, expect, it } from "vitest";
import type { KnowledgeCatalog } from "../../../knowledge/src/index.js";
import {
  assessObjectiveAuthorityDeclarations,
  objectiveAuthorityDiagnostics,
  correlateStateAuthority,
  stateAuthorityRuntimeEvidence,
} from "../../src/inspection/state-authority-analysis.js";
import { knowledgeRuntimeDiagnostics } from "../../../../analyzers/diagnostics/src/index.js";

const contract = {
  id: "arena-ready",
  authority: { kind: "scoreboard" as const, key: "ready" },
  mirrors: [{ kind: "tag" as const, key: "ready" }],
};

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "policy",
    title: "Policy",
    url: "project://knowledge/state-authority-test",
    authority: "project-policy",
    confidence: "designed",
    retrievedDate: "2026-09-24",
  }],
  facts: [],
  relations: [{
    id: "authority-needs-mirror",
    domain: "state-authority",
    subject: "state-authority-observed",
    kind: "requires",
    object: "state-mirror-consistent",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }, {
    id: "mirror-needs-authority",
    domain: "state-authority",
    subject: "state-mirror-observed",
    kind: "requires",
    object: "state-authority-observed",
    classification: "project-policy",
    applicability: { editions: ["bedrock"] },
    sourceIds: ["policy"],
  }],
};

function diagnostics(observations: Parameters<typeof correlateStateAuthority>[1]) {
  const correlations = correlateStateAuthority([contract], observations);
  return knowledgeRuntimeDiagnostics({
    catalog,
    profile: { edition: "bedrock" },
    snapshot: {
      schemaVersion: 1,
      records: stateAuthorityRuntimeEvidence(correlations),
    },
  });
}

describe("state authority reconciliation", () => {
  it("accepts a consistent mirror", () => {
    const findings = diagnostics([
      {
        surface: { kind: "scoreboard", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 4,
      },
      {
        surface: { kind: "tag", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 4,
      },
    ]);
    expect(findings).toEqual([]);
  });

  it("turns explicit value drift into a relation violation", () => {
    const findings = diagnostics([
      {
        surface: { kind: "scoreboard", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 4,
      },
      {
        surface: { kind: "tag", key: "ready" },
        scopeKey: "player:a",
        value: 0,
        revision: 4,
      },
    ]);
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "KNOWLEDGE_RELATION_VIOLATION",
      }),
    ]));
  });

  it("detects a stale mirror revision even when values happen to match", () => {
    const correlations = correlateStateAuthority([contract], [
      {
        surface: { kind: "scoreboard", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 5,
      },
      {
        surface: { kind: "tag", key: "ready" },
        scopeKey: "player:a",
        value: 1,
        revision: 4,
      },
    ]);
    expect(correlations[0]?.status).toBe("revision-stale");
    const findings = knowledgeRuntimeDiagnostics({
      catalog,
      profile: { edition: "bedrock" },
      snapshot: {
        schemaVersion: 1,
        records: stateAuthorityRuntimeEvidence(correlations),
      },
    });
    expect(findings.some(
      (finding) => finding.code === "KNOWLEDGE_RELATION_VIOLATION",
    )).toBe(true);
  });

  it("detects mirror evidence with missing authority", () => {
    const findings = diagnostics([
      {
        surface: { kind: "tag", key: "ready" },
        scopeKey: "player:a",
        value: 1,
      },
    ]);
    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "KNOWLEDGE_RELATION_VIOLATION",
      }),
    ]));
  });
});


describe("objective authority declarations", () => {
  const intent = {
    schemaVersion: 1 as const,
    id: "intent:test",
    evidence: [],
    nodes: [{
      id: "objective:flag",
      kind: "objective" as const,
      label: "Flag",
      status: "authored" as const,
      evidenceIds: [],
    }],
    edges: [],
    invariants: [],
    unknowns: [],
  };

  it("accepts exactly one explicitly matched authority", () => {
    const result =
      assessObjectiveAuthorityDeclarations(
        intent,
        [{
          id: "flag-authority",
          purpose: "objective:flag",
          authority: {
            kind: "scoreboard",
            key: "flagHealth",
          },
          mirrors: [{
            kind: "tag",
            key: "flag_low",
          }],
        }],
      );

    expect(result[0]).toMatchObject({
      status: "declared",
      authorityKeys: [
        "scoreboard:flagHealth",
      ],
    });
  });

  it("keeps an objective without an explicit authority declaration unresolved", () => {
    const result =
      assessObjectiveAuthorityDeclarations(
        intent,
        [],
      );

    expect(result[0]?.status)
      .toBe("undeclared");
  });

  it("detects split-brain objective authority declarations", () => {
    const result =
      assessObjectiveAuthorityDeclarations(
        intent,
        [{
          id: "flag-score",
          purpose: "Flag",
          authority: {
            kind: "scoreboard",
            key: "flagHealth",
          },
          mirrors: [],
        }, {
          id: "flag-tag",
          purpose: "objective:flag",
          authority: {
            kind: "tag",
            key: "flag_alive",
          },
          mirrors: [],
        }],
      );

    expect(result[0]).toMatchObject({
      status: "multiple-authorities",
      authorityKeys: [
        "scoreboard:flagHealth",
        "tag:flag_alive",
      ],
    });
  });
});


describe("objective authority diagnostics", () => {
  it("emits no finding for one declared authority", () => {
    const findings =
      objectiveAuthorityDiagnostics([{
        objectiveId: "objective:flag",
        objectiveLabel: "Flag",
        status: "declared",
        contractIds: ["flag"],
        authorityKeys: [
          "scoreboard:flagHealth",
        ],
        reason: "declared",
      }]);
    expect(findings).toEqual([]);
  });

  it("emits canonical diagnostics for undeclared and multiple authority states", () => {
    const findings =
      objectiveAuthorityDiagnostics([{
        objectiveId: "objective:a",
        objectiveLabel: "A",
        status: "undeclared",
        contractIds: [],
        authorityKeys: [],
        reason: "missing",
      }, {
        objectiveId: "objective:b",
        objectiveLabel: "B",
        status: "multiple-authorities",
        contractIds: ["b1", "b2"],
        authorityKeys: [
          "scoreboard:b",
          "tag:b",
        ],
        reason: "split",
      }]);

    expect(
      findings.map((item) =>
        item.code
      ).sort(),
    ).toEqual([
      "STATE_MULTIPLE_AUTHORITIES",
      "STATE_AUTHORITY_UNDECLARED",
    ].sort());
  });
});
