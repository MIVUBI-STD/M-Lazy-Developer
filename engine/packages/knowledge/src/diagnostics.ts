import { effectiveKnowledge } from "./effective.js";
import type {
  EffectiveKnowledgeProfile,
  KnowledgeCatalog,
  KnowledgeClassification,
  KnowledgeDomain,
} from "./types.js";

export type DiagnosticConfidence = "documented" | "supported" | "conditional";

export interface KnowledgeDiagnosticTemplate {
  id: string;
  factId: string;
  domain: KnowledgeDomain;
  subject: string;
  riskSurface: string;
  sourceIds: readonly string[];
  classification: KnowledgeClassification | undefined;
  confidence: DiagnosticConfidence;
  statement: string;
  capabilityTags: readonly string[];
}

function templateConfidence(
  classification: KnowledgeClassification | undefined,
): DiagnosticConfidence {
  switch (classification) {
    case "engine-fact":
      return "documented";
    case "project-policy":
    case "derived-rule":
      return "supported";
    case "open-assumption":
    case undefined:
      return "conditional";
    default:
      return "conditional";
  }
}

export function compileDiagnosticTemplates(
  catalog: KnowledgeCatalog,
  profile: EffectiveKnowledgeProfile,
): KnowledgeDiagnosticTemplate[] {
  return effectiveKnowledge(catalog, profile)
    .flatMap((fact) =>
      fact.riskSurfaces.map((riskSurface) => ({
        id: `${fact.id}::${riskSurface}`,
        factId: fact.id,
        domain: fact.domain,
        subject: fact.subject,
        riskSurface,
        sourceIds: fact.sourceIds,
        classification: fact.classification,
        confidence: templateConfidence(fact.classification),
        statement: fact.statement,
        capabilityTags: fact.capabilityTags,
      }))
    )
    .sort((a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.riskSurface.localeCompare(b.riskSurface) ||
      a.factId.localeCompare(b.factId)
    );
}
