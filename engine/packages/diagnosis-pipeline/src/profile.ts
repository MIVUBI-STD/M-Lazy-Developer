import {
  createAnalysisCapabilityRegistry,
  type AnalysisCapability,
  type AnalysisCapabilityRegistry,
} from "../../analysis-planner/src/index.js";

export interface RegisteredDiagnosisCapability
  extends AnalysisCapability {
  owner: string;
  executorId: string;
  cacheRevision: string;
}

const capabilities: readonly RegisteredDiagnosisCapability[] = [{
  id: "diagnosis.source-index",
  owner: "packages/orchestrator/src/inspect-source-index.ts",
  executorId: "diagnosis.source-index",
  cacheRevision: "1",
  executionPhase: "discovery-core",
  evidenceLevel: "static",
  cost: "cheap",
  tags: [
    "artifact",
    "commands",
    "entities",
    "scripts",
    "session",
    "state",
    "structures",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["structural-proof"],
}, {
  id: "diagnosis.semantic-ir",
  owner: "packages/orchestrator/src/diagnosis/semantic-ir-stage.ts",
  executorId: "diagnosis.semantic-ir",
  cacheRevision: "1",
  executionPhase: "discovery-core",
  evidenceLevel: "semantic",
  cost: "moderate",
  tags: [
    "commands",
    "scripts",
    "session",
    "state",
    "structures",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["semantic-model"],
  prerequisites: ["diagnosis.source-index"],
}, {
  id: "diagnosis.intent-grounding",
  owner: "packages/orchestrator/src/inspection/gameplay-intent-stage.ts",
  executorId: "diagnosis.intent-grounding",
  cacheRevision: "1",
  executionPhase: "discovery-core",
  evidenceLevel: "semantic",
  cost: "moderate",
  tags: [
    "gameplay-intent",
    "scripts",
    "session",
    "state",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["intent-grounded"],
  prerequisites: ["diagnosis.source-index"],
}, {
  id: "diagnosis.contract-evidence",
  owner: "packages/orchestrator/src/inspection/gameplay-intent-stage.ts",
  executorId: "diagnosis.contract-evidence",
  cacheRevision: "1",
  executionPhase: "discovery-core",
  evidenceLevel: "semantic",
  cost: "moderate",
  tags: [
    "gameplay-intent",
    "scripts",
    "session",
    "state",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["contract-evidence"],
  prerequisites: ["diagnosis.intent-grounding"],
}, {
  id: "diagnosis.contradiction-proof",
  owner: "packages/diagnosis-pipeline/src/contradiction-executor.ts",
  executorId: "diagnosis.contradiction-proof",
  cacheRevision: "1",
  executionPhase: "rig-directed",
  evidenceLevel: "formal",
  cost: "expensive",
  tags: [
    "behavior",
    "gameplay-intent",
    "session",
    "state",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["contradiction"],
  prerequisites: [
    "diagnosis.semantic-ir",
    "diagnosis.intent-grounding",
  ],
}, {
  id: "diagnosis.runtime-observation",
  owner: "packages/runtime-lab/src/index.ts",
  executorId: "diagnosis.runtime-observation",
  cacheRevision: "1",
  executionPhase: "rig-directed",
  evidenceLevel: "runtime",
  cost: "expensive",
  tags: [
    "behavior",
    "gameplay-intent",
    "session",
    "state",
  ],
  deterministic: false,
  contexts: [
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["runtime-observation"],
  prerequisites: ["diagnosis.intent-grounding"],
}, {
  id: "diagnosis.runtime-integrity",
  owner: "packages/orchestrator/src/diagnosis/runtime-evidence-integrity.ts",
  executorId: "diagnosis.runtime-integrity",
  cacheRevision: "1",
  executionPhase: "rig-directed",
  evidenceLevel: "runtime",
  cost: "moderate",
  tags: [
    "behavior",
    "runtime-evidence",
    "session",
    "state",
  ],
  deterministic: true,
  contexts: [
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
  producesTraits: ["runtime-integrity"],
  prerequisites: ["diagnosis.runtime-observation"],
}];

export const DIAGNOSIS_ANALYSIS_CAPABILITIES =
  capabilities;

export const DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY:
  AnalysisCapabilityRegistry =
  createAnalysisCapabilityRegistry(capabilities);

export function diagnosisCapabilityByExecutorId(
  executorId: string,
): RegisteredDiagnosisCapability | undefined {
  return capabilities.find(
    (capability) =>
      capability.executorId === executorId,
  );
}
