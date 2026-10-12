export interface GameplaySurfaceDiscoveryInput {
  readonly intentSubjectIds: readonly string[];
  readonly arenaDetected: boolean;
  readonly arenaCapacityEvidence: boolean;
  readonly arenaLifecycleEvidence: boolean;
  readonly arenaCleanupEvidence: boolean;
  readonly arenaIsolationEvidence: boolean;
  readonly arenaReplicaEvidence?: boolean;
  readonly stateEvidence: boolean;
  readonly terminalOutcomeUnresolved?: boolean;
  readonly chunkEvidence: boolean;
  readonly persistenceEvidence: boolean;
  readonly economyEvidence: boolean;
  readonly combatEvidence: boolean;
  readonly inventoryEvidence: boolean;
  readonly spatialEvidence: boolean;
  readonly structureEvidence: boolean;
  readonly entityEvidence: boolean;
  readonly boundaryEvidence?: boolean;
  readonly teleportEvidence?: boolean;
  readonly uiFormEvidence?: boolean;
  readonly environmentEvidence?: boolean;
  readonly playerCapabilityEvidence?: boolean;
  readonly asyncCommandTransactionEvidence?: boolean;
  readonly dynamicCommandEvidence?: boolean;
}

export interface GameplaySurfaceDiscoveryResult {
  readonly surfaceIds: readonly string[];
  readonly runtimeSurfaceIds: readonly string[];
}

export function discoverGameplaySurfaces(
  input: GameplaySurfaceDiscoveryInput,
): GameplaySurfaceDiscoveryResult {
  const runtime = new Set<string>();

  if (input.arenaDetected) {
    runtime.add("runtime:arena");
  }
  if (input.arenaCapacityEvidence) {
    runtime.add("runtime:arena-capacity");
  }
  if (input.arenaLifecycleEvidence) {
    runtime.add("runtime:arena-lifecycle");
  }
  if (input.arenaCleanupEvidence) {
    runtime.add("runtime:arena-cleanup");
  }
  if (input.arenaIsolationEvidence) {
    runtime.add("runtime:arena-isolation");
  }
  if (input.arenaReplicaEvidence) {
    runtime.add("runtime:arena-replica-integrity");
  }
  if (input.stateEvidence) {
    runtime.add("runtime:state");
  }
  if (input.terminalOutcomeUnresolved) {
    runtime.add("runtime:terminal-outcome");
  }
  if (input.chunkEvidence) {
    runtime.add("runtime:chunks");
  }
  if (input.persistenceEvidence) {
    runtime.add("runtime:persistence");
  }
  if (input.economyEvidence) {
    runtime.add("runtime:economy");
  }
  if (input.combatEvidence) {
    runtime.add("runtime:combat");
  }
  if (input.inventoryEvidence) {
    runtime.add("runtime:inventory");
  }
  if (input.spatialEvidence) {
    runtime.add("runtime:spatial");
  }
  if (input.structureEvidence) {
    runtime.add("runtime:structures");
  }
  if (input.entityEvidence) {
    runtime.add("runtime:entities");
  }
  if (input.boundaryEvidence) {
    runtime.add("runtime:boundaries");
  }
  if (input.teleportEvidence) {
    runtime.add("runtime:teleport");
  }
  if (input.uiFormEvidence) {
    runtime.add("runtime:ui-form");
  }
  if (input.environmentEvidence) {
    runtime.add("runtime:environment");
  }
  if (input.playerCapabilityEvidence) {
    runtime.add("runtime:player-capability");
  }
  if (input.asyncCommandTransactionEvidence) {
    runtime.add("runtime:async-command-transaction");
  }
  if (input.dynamicCommandEvidence) {
    runtime.add("runtime:dynamic-command");
  }

  const runtimeSurfaceIds = [...runtime].sort();
  const surfaceIds = [
    ...new Set([
      ...input.intentSubjectIds,
      ...runtimeSurfaceIds,
    ]),
  ].sort();

  return {
    surfaceIds,
    runtimeSurfaceIds,
  };
}
