import type {
  ParsedScriptFile,
  ScriptMethodCall,
  CrossFileCallEdge,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  SourceRef,
  StateAuthorityContract,
  StateSurfaceKind,
} from "../../../project-model/src/index.js";

export type ArenaStateScope =
  | "arena-local"
  | "player-local"
  | "entity-local"
  | "world-global"
  | "module-shared"
  | "unknown";

export type ArenaStateIsolationStatus =
  | "isolated"
  | "partition-proof-required"
  | "shared-global"
  | "unknown";

export interface ArenaStateIsolationObservation {
  scriptId: string;
  region: string;
  surface:
    | "dynamic-property"
    | "scoreboard"
    | "world-property"
    | "world-command"
    | "world-player-enumeration"
    | "entity-tag"
    | "module-state";
  key: string;
  scope: ArenaStateScope;
  status: ArenaStateIsolationStatus;
  reason: string;
  /** Exact owning artifact/module, never inferred from a script identifier. */
  source?: SourceRef;
  authorityContractIds?: readonly string[];
}

export interface ArenaStateIsolationAnalysis {
  arenaRegions: number;
  observations: readonly ArenaStateIsolationObservation[];
  isolated: number;
  partitionProofRequired: number;
  sharedGlobal: number;
  unknown: number;
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const targets =
      graph.get(call.callerRegion) ??
      new Set<string>();
    targets.add(call.targetRegion);
    graph.set(call.callerRegion, targets);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  roots: readonly string[],
): Set<string> {
  const seen = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function arenaRegions(
  script: ParsedScriptFile,
): Set<string> {
  const roots = [
    ...new Set(
      (script.arenaAuthorityPaths ?? [])
        .map((item) => item.executionRegion),
    ),
  ];
  return reachable(graphFor(script), roots);
}

/** Source-only arena reachability across the canonical resolved ESM call sites.
 * A reachable callee is not proof that the caller's arena/player argument is
 * the callee's actual instance, that a guard executes or that state is safe.
 */
function arenaRegionsAcrossScripts(
  scripts: readonly ParsedScriptFile[],
  calls: readonly CrossFileCallEdge[],
): Map<ParsedScriptFile, Set<string>> {
  type Region = { script: ParsedScriptFile; region: string };
  const scopes = new Map<ParsedScriptFile, Set<string>>(
    scripts.map(script => [script, new Set<string>()]),
  );
  const local = new Map(scripts.map(script => [script, graphFor(script)]));
  // Duplicate module paths (even from different revisions) cannot own an
  // unambiguous cross-file edge. Lexical script identifiers are not owners.
  const byPath = new Map<string, ParsedScriptFile[]>();
  const pathOf = (path: string) => path.replaceAll("\\", "/");
  const packOf = (path: string): string | undefined => {
    const segments = pathOf(path).split("/");
    return (segments[0] === "behavior_packs" || segments[0] === "resource_packs")
      && segments.length > 2 ? segments.slice(0, 2).join("/") : undefined;
  };
  for (const script of scripts) {
    if (!script.source?.relativePath) continue;
    const path = pathOf(script.source.relativePath);
    byPath.set(path, [...(byPath.get(path) ?? []), script]);
  }
  const unique = (path: string): ParsedScriptFile | undefined => {
    const candidates = byPath.get(pathOf(path)) ?? [];
    return candidates.length === 1 ? candidates[0] : undefined;
  };

  const imported = new Map<ParsedScriptFile, Map<string, Region[]>>();
  for (const call of calls) {
    if (call.status !== "resolved" || !call.targetModule || !call.targetRegion) {
      continue;
    }
    const caller = unique(call.callerModule);
    const target = unique(call.targetModule);
    if (!caller?.source || !target?.source ||
        caller.source.artifactId !== target.source.artifactId ||
        caller.source.artifactId !== call.source.artifactId ||
        pathOf(caller.source.relativePath) !== pathOf(call.source.relativePath) ||
        packOf(caller.source.relativePath) !== packOf(target.source.relativePath)) {
      continue;
    }
    // Do not trust a standalone "resolved" flag without one exact, current
    // parser-recognized imported call site and its complete source range.
    const exactSites = (caller.importedCallGuardSites ?? []).filter(site =>
      site.executionRegion === call.callerRegion &&
      sameExactCallSite(site.source, call.source));
    if (exactSites.length !== 1) continue;

    const from = imported.get(caller) ?? new Map<string, Region[]>();
    const links = from.get(call.callerRegion) ?? [];
    links.push({ script: target, region: call.targetRegion });
    from.set(call.callerRegion, links);
    imported.set(caller, from);
  }

  const queue: Region[] = [];
  const admit = (next: Region): void => {
    const regions = scopes.get(next.script);
    if (!regions || regions.has(next.region)) return;
    regions.add(next.region);
    queue.push(next);
  };
  for (const script of scripts) {
    for (const root of script.arenaAuthorityPaths ?? []) {
      admit({ script, region: root.executionRegion });
    }
  }
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const item = queue[cursor]!;
    for (const region of local.get(item.script)?.get(item.region) ?? []) {
      admit({ script: item.script, region });
    }
    for (const target of imported.get(item.script)?.get(item.region) ?? []) {
      admit(target);
    }
  }
  return scopes;
}

/**
 * Match the existing parser's typed API-call evidence to THIS dynamic
 * property operation. Two matching file/line labels are insufficient: the
 * complete call span, owning artifact, module, region, method and receiver
 * expression must agree, and the typed call must be unique.
 */
function sameExactCallSite(left: SourceRef, right: SourceRef): boolean {
  const a = left.range;
  const b = right.range;
  return left.artifactId === right.artifactId &&
    left.relativePath === right.relativePath &&
    left.jsonPointer === right.jsonPointer &&
    a?.lineStart !== undefined && a.lineEnd !== undefined &&
    a.columnStart !== undefined && a.columnEnd !== undefined &&
    b?.lineStart !== undefined && b.lineEnd !== undefined &&
    b.columnStart !== undefined && b.columnEnd !== undefined &&
    a.lineStart === b.lineStart && a.lineEnd === b.lineEnd &&
    a.columnStart === b.columnStart && a.columnEnd === b.columnEnd;
}

function resolveDynamicReceiver(
  script: ParsedScriptFile,
  access: ParsedScriptFile["dynamicProperties"][number],
): {
  scope: ArenaStateScope;
  kind: "World" | "Player" | "Entity" | "unresolved";
  basis: "EXACT_TYPED_CALL_SITE" | "STABLE_WORLD_IMPORT" | "UNRESOLVED";
} {
  const method = access.operation === "get" ? "getDynamicProperty"
    : access.operation === "set" ? "setDynamicProperty"
    : access.operation === "clear" ? "clearDynamicProperties"
    : access.operation === "ids" ? "getDynamicPropertyIds"
    : access.operation === "size" ? "getDynamicPropertyTotalByteCount"
    : undefined;
  // Unique typed calls are source-side receiver classifications only. A
  // Player API type still does NOT prove which player instance was targeted.
  const candidates = method === undefined ? [] :
    script.methodCalls.filter(call =>
      call.method === method &&
      (call.receiverType === "World" ||
       call.receiverType === "Player" ||
       call.receiverType === "Entity") &&
      call.receiverHint === access.receiverHint &&
      (call.executionRegion ?? "module") ===
        (access.executionRegion ?? "module") &&
      access.source !== undefined &&
      call.source !== undefined &&
      sameExactCallSite(call.source, access.source));
  if (candidates.length > 1) {
    return { scope: "unknown", kind: "unresolved", basis: "UNRESOLVED" };
  }
  // The parser already records exact unshadowed ESM world-singleton
  // provenance for this statement; unlike spelling, this is admissible.
  if (access.sourceSequence?.stableWorldReceiver === true) {
    return { scope: "world-global", kind: "World",
      basis: "STABLE_WORLD_IMPORT" };
  }
  const call = candidates[0];
  if (!call) {
    return { scope: "unknown", kind: "unresolved", basis: "UNRESOLVED" };
  }
  // A shadowed identifier named "world" can be accepted as World by the
  // parser's broad singleton fallback. Without stable import provenance
  // that is not enough to identify a world receiver.
  if (access.receiverHint === "world" && call.receiverType === "World") {
    return { scope: "unknown", kind: "unresolved", basis: "UNRESOLVED" };
  }
  const kind = call.receiverType;
  if (kind !== "World" && kind !== "Player" && kind !== "Entity") {
    return { scope: "unknown", kind: "unresolved", basis: "UNRESOLVED" };
  }
  const scope: ArenaStateScope = kind === "World"
    ? "world-global" : kind === "Player"
      ? "player-local" : "entity-local";
  return { scope, kind, basis: "EXACT_TYPED_CALL_SITE" };
}

function normalizedExpression(
  value: string,
): string {
  return value
    .replace(/\s+/g, "")
    .toLowerCase();
}

function escapedRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}

function expressionUsesAuthority(
  expression: string | undefined,
  authorities: readonly string[],
): boolean {
  if (!expression) return false;
  const normalized =
    normalizedExpression(expression);

  return authorities.some((authority) => {
    const candidate =
      normalizedExpression(authority);
    if (!candidate) return false;

    // A qualified receiver such as "arena.id" must not match the tail
    // of "otherarena.id"; this would silently promote an unrelated world's
    // dynamic property / scoreboard owner to isolated. Match complete
    // authored expression tokens for both simple and dotted identifiers.
    const token = new RegExp(
      "(^|[^a-z0-9_$])" + escapedRegex(candidate) +
        "(?=$|[^a-z0-9_$])",
      "i",
    );
    return token.test(normalized);
  });
}
function scoreboardObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  if (
    call.receiverType !== "ScoreboardObjective" ||
    ![
      "setScore",
      "addScore",
      "removeParticipant",
    ].includes(call.method)
  ) {
    return undefined;
  }

  const participant =
    call.argumentTexts?.[0];

  if (
    expressionUsesAuthority(
      participant,
      authorities,
    )
  ) {
    return {
      scriptId: script.identifier,
      region,
      surface: "scoreboard",
      key:
        call.symbol +
        ":" +
        participant,
      scope: "arena-local",
      status: "isolated",
      reason:
        "Scoreboard participant expression is explicitly keyed by the authored arena authority expression.",
    };
  }

  return {
    scriptId: script.identifier,
    region,
    surface: "scoreboard",
    key:
      call.symbol +
      ":" +
      (participant ?? "*"),
    scope: "world-global",
    status: "partition-proof-required",
    reason:
      "Scoreboard objective is world-shared and the participant expression does not prove arena/player partitioning.",
  };
}

function worldPlayerEnumerationObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  if (
    call.receiverType !== "World" ||
    !["getPlayers", "getAllPlayers"].includes(call.method)
  ) {
    return undefined;
  }

  const query =
    (call.argumentTexts ?? []).join(" ");
  const authorityPartitioned =
    expressionUsesAuthority(query, authorities);

  return {
    scriptId: script.identifier,
    region,
    surface: "world-player-enumeration",
    key:
      call.symbol +
      "(" +
      query +
      ")",
    scope:
      authorityPartitioned
        ? "arena-local"
        : "world-global",
    status:
      authorityPartitioned
        ? "isolated"
        : "partition-proof-required",
    reason:
      authorityPartitioned
        ? "World player enumeration is explicitly filtered by the authored arena authority expression."
        : "Arena flow enumerates world players without proving arena partitioning. Downstream player/tag/state mutations must prove an arena filter or arena-context proxy before isolation can close.",
  };
}

function tagMutationObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  if (
    !["addTag", "removeTag"].includes(call.method) ||
    !/(?:Player|Entity)$/i.test(call.receiverType ?? "")
  ) {
    return undefined;
  }

  const tagExpression =
    call.argumentTexts?.[0];
  if (!tagExpression) {
    return {
      scriptId: script.identifier,
      region,
      surface: "entity-tag",
      key: call.symbol + "(*)",
      scope: "unknown",
      status: "partition-proof-required",
      reason:
        "Arena flow mutates a player/entity tag but the tag expression is unresolved. Prove receiver scope and tag ownership before cross-arena isolation can close.",
    };
  }

  const authorityPartitioned =
    expressionUsesAuthority(
      tagExpression,
      authorities,
    );

  return {
    scriptId: script.identifier,
    region,
    surface: "entity-tag",
    key:
      call.symbol +
      "(" +
      tagExpression +
      ")",
    scope:
      authorityPartitioned
        ? "arena-local"
        : "unknown",
    status:
      authorityPartitioned
        ? "isolated"
        : "partition-proof-required",
    reason:
      authorityPartitioned
        ? "Player/entity tag expression is explicitly keyed by the authored arena authority expression."
        : "Arena flow mutates a player/entity tag without proving the tag or receiver is arena-partitioned. Generic tags are world-visible and cleanup/reconciliation must prove they cannot affect another arena.",
  };
}

function commandObservation(
  script: ParsedScriptFile,
  command: ParsedScriptFile["commandLiterals"][number],
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  const raw = command.command.trim().replace(/^\//, "");
  const head = raw.split(/\s+/)[0]?.toLowerCase();

  if (
    head === "gamerule" ||
    head === "difficulty" ||
    head === "time" ||
    head === "weather"
  ) {
    return {
      scriptId: script.identifier,
      region: command.executionRegion ?? "module",
      surface: "world-command",
      key: raw,
      scope: "world-global",
      status: "shared-global",
      reason:
        "The command mutates world-global behavior and can affect concurrent arenas unless ownership/arbitration is proven.",
    };
  }

  if (head === "tickingarea") {
    const authorityPartitioned =
      expressionUsesAuthority(raw, authorities);

    return {
      scriptId: script.identifier,
      region: command.executionRegion ?? "module",
      surface: "world-command",
      key: raw,
      scope: authorityPartitioned ? "arena-local" : "world-global",
      status: authorityPartitioned ? "isolated" : "partition-proof-required",
      reason: authorityPartitioned
        ? "Ticking-area command includes the authored arena authority expression, providing arena-specific resource partitioning."
        : "Ticking-area names are world-shared resources. Arena flow using a non-partitioned name requires proof that concurrent arenas cannot remove or replace another arena's residency resource.",
    };
  }

  const targetsAllPlayers =
    /(^|\s)@a(?:\[|\b)/i.test(raw);
  const mutatesPlayerOrWorld =
    /(?:^|\s)(?:fill|setblock|clone|tag|kill|tp|teleport|clear|give|effect|gamemode|scoreboard)\b/i.test(
      raw,
    );

  if (targetsAllPlayers && mutatesPlayerOrWorld) {
    const authorityPartitioned =
      expressionUsesAuthority(raw, authorities);

    return {
      scriptId: script.identifier,
      region: command.executionRegion ?? "module",
      surface: "world-command",
      key: raw,
      scope: authorityPartitioned ? "arena-local" : "world-global",
      status: authorityPartitioned ? "isolated" : "partition-proof-required",
      reason: authorityPartitioned
        ? "Global-selector command is explicitly partitioned by the authored arena authority expression."
        : "Arena flow mutates players or nearby world state through a global @a selector. Arena-context translation or an equivalent partitioning guard must be proven before cross-arena isolation can close.",
    };
  }

  return undefined;
}

function analyzeScript(
  script: ParsedScriptFile,
  regions: Set<string> = arenaRegions(script),
): {
  regions: Set<string>;
  observations: ArenaStateIsolationObservation[];
} {
  const directlyReached = arenaRegions(script);
  const importedOnly = new Set(
    [...regions].filter(region => !directlyReached.has(region)),
  );
  // Authority expressions only prove ownership within their execution region.
  const authoritiesForRegion = (region: string): readonly string[] => [
    ...new Set(
      (script.arenaAuthorityPaths ?? [])
        .filter((item) => item.executionRegion === region)
        .map((item) => item.arenaExpression)
        .filter(Boolean),
    ),
  ];
  const observations: ArenaStateIsolationObservation[] = [];

  for (const access of script.dynamicProperties) {
    if (
      access.operation !== "set" &&
      access.operation !== "delete" &&
      access.operation !== "clear"
    ) {
      continue;
    }
    const region = access.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    // Normal parsed records always have source owners. Older/synthetic
    // partial fixtures must stay UNKNOWN rather than throwing. When both
    // owners exist, a foreign nested operation cannot enter this analysis.
    if (access.source && script.source &&
        (access.source.artifactId !== script.source.artifactId ||
         access.source.relativePath !== script.source.relativePath)) continue;

    const receiver = resolveDynamicReceiver(script, access);
    const keyExpression =
      access.propertyExpression ??
      access.propertyId;

    const authorityPartitioned =
      receiver.basis === "STABLE_WORLD_IMPORT" &&
      expressionUsesAuthority(
        keyExpression,
        authoritiesForRegion(region),
      );
    const scope: ArenaStateScope =
      authorityPartitioned ? "arena-local" : receiver.scope;

    observations.push({
      scriptId: script.identifier,
      region,
      surface: "dynamic-property",
      key:
        (access.receiverHint ?? "unknown") +
        ":" +
        (
          access.propertyId ??
          access.propertyExpression ??
          "*"
        ),
      scope,
      status: authorityPartitioned
        ? "isolated" : "partition-proof-required",
      reason: authorityPartitioned
        ? "World dynamic-property key expression is explicitly partitioned by the authored arena authority expression. Static source claim only; uniqueness and runtime isolation remain unverified."
        : receiver.basis === "EXACT_TYPED_CALL_SITE"
          ? "Exact parser-typed " + receiver.kind +
            " dynamic-property call at the same authored site (" +
            receiver.basis + "). Receiver API type describes the source " +
            "surface, not a unique live player/entity/world instance, " +
            "arena partition, or successful state mutation."
          : scope === "world-global"
            ? "An unshadowed imported Minecraft world singleton owns this dynamic-property source site; globally shared storage requires source partition proof."
            : "Dynamic-property receiver lacks one trustworthy typed call at the exact selected source site; lexical player/arena/session names and unproven aliases cannot establish instance scope.",
    });
  }

  for (const call of script.methodCalls) {
    const region = call.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    const scoreboard = scoreboardObservation(
      script,
      call,
      region,
      authoritiesForRegion(region),
    );
    if (scoreboard) observations.push(scoreboard);

    const playerEnumeration =
      worldPlayerEnumerationObservation(
        script,
        call,
        region,
        authoritiesForRegion(region),
      );
    if (playerEnumeration) {
      observations.push(playerEnumeration);
    }

    const tagMutation =
      tagMutationObservation(
        script,
        call,
        region,
        authoritiesForRegion(region),
      );
    if (tagMutation) {
      observations.push(tagMutation);
    }
  }

  for (const write of script.propertyWrites) {
    if (
      write.receiverType !== "World" &&
      write.receiverType !== "System"
    ) {
      continue;
    }
    observations.push({
      scriptId: script.identifier,
      region: "module",
      surface: "world-property",
      key: write.symbol,
      scope: "world-global",
      status: "shared-global",
      reason:
        "World/System property mutation is process- or world-shared and requires explicit arbitration for concurrent arenas.",
    });
  }

  for (const command of script.commandLiterals) {
    const region = command.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    const observation =
      commandObservation(
        script,
        command,
        authoritiesForRegion(region),
      );
    if (observation) observations.push(observation);
  }

  for (const mutation of script.stateMutations ?? []) {
    if (!regions.has(mutation.executionRegion)) continue;
    const target = mutation.target;
    const authorityOwned = authoritiesForRegion(mutation.executionRegion)
      .some((authority) => target.startsWith(authority + "."));
    // Variable names containing "arena", "session", or "player" are not
    // evidence of ownership. Only a region-local authority receiver qualifies.
    const scope: ArenaStateScope = authorityOwned
      ? "arena-local"
      : target.includes(".")
        ? "unknown"
        : "module-shared";

    observations.push({
      scriptId: script.identifier,
      region: mutation.executionRegion,
      surface: "module-state",
      key: target,
      scope,
      status: authorityOwned ? "isolated" : "partition-proof-required",
      reason: authorityOwned
        ? "Mutation receiver matches an authored arena authority in the same execution region."
        : "Mutation target naming alone does not establish arena/player partitioning; ownership proof is required.",
    });
  }

  return {
    regions,
    observations: observations.map(item => ({
      ...item,
      ...(script.source === undefined ? {} : { source: script.source }),
      ...(importedOnly.has(item.region) ? {
        reason: item.reason +
          " An exact source-resolved imported call reaches this region from " +
          "arena-associated code; cross-module argument identity, arena " +
          "membership and session ownership remain unproven.",
      } : {}),
    })),
  };
}


function contractSurfaceMatches(
  observation: ArenaStateIsolationObservation,
  surface: {
    kind: StateSurfaceKind;
    key: string;
  },
): boolean {
  if (
    observation.surface === "dynamic-property" &&
    surface.kind === "dynamic-property"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.endsWith(
        ":" + surface.key,
      )
    );
  }

  if (
    observation.surface === "scoreboard" &&
    surface.kind === "scoreboard"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.endsWith(":" + surface.key)
    );
  }

  if (
    observation.surface === "module-state" &&
    surface.kind === "script-memory"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.endsWith(
        "." + surface.key,
      )
    );
  }

  return false;
}

function applyAuthorityContracts(
  observations: readonly ArenaStateIsolationObservation[],
  contracts: readonly StateAuthorityContract[],
): ArenaStateIsolationObservation[] {
  // Each observed operation carries its own authoring owner. A scriptId
  // reused across packs/revisions cannot assign another file's contracts.
  return observations.map((observation) => {
    const matches = contracts.filter((contract) => {
      if (
        contract.scope !== "arena" &&
        contract.scope !== "round" &&
        contract.scope !== "player" &&
        contract.scope !== "entity"
      ) {
        return false;
      }

      return [
        contract.authority,
        ...contract.mirrors,
      ].some((surface) =>
        contractSurfaceMatches(
          observation,
          surface,
        )
      );
    });

    if (matches.length === 0) {
      return observation;
    }

    // Contract declarations without source references are claims, not proof.
    // Keep the matched IDs, but never promote unproven metadata to isolation.
    if (matches.some((item) => !item.sourceRefs?.length)) {
      return {
        ...observation,
        scope: "unknown",
        status: "partition-proof-required",
        reason: "Matching state-authority contract lacks source provenance; isolation is not proven.",
        authorityContractIds: [...new Set(matches.map((item) => item.id))].sort(),
      };
    }

    // A supplied SourceRef must at least belong to the analyzed artifact.
    // This is an identity check, not proof that the contract semantics are true.
    if (matches.some((item) =>
      !item.sourceRefs?.length ||
      !item.sourceRefs.some((source) => {
        const owner = observation.source;
        return owner !== undefined &&
          source.artifactId === owner.artifactId &&
          source.relativePath === owner.relativePath;
      })
    )) {
      return {
        ...observation,
        scope: "unknown",
        status: "partition-proof-required",
        reason: "State-authority contract lacks a matching source file for the observed script; isolation is not proven.",
        authorityContractIds: [...new Set(matches.map((item) => item.id))].sort(),
      };
    }

    const scopes = [...new Set(matches.map((item) => item.scope))];
    // Different ownership scopes cannot prove one isolated state surface.
    // Preserve contract IDs so the conflict can be investigated upstream.
    if (scopes.length > 1) {
      return {
        ...observation,
        scope: "unknown",
        status: "partition-proof-required",
        reason: "Matching state-authority contracts disagree on ownership scope; isolation is not proven.",
        authorityContractIds: [...new Set(matches.map((item) => item.id))].sort(),
      };
    }

    // Same-file source metadata establishes attribution, not unique live
    // storage partitions; do not promote unresolved/shared surfaces.
    return {
      ...observation,
      reason: observation.reason +
        " Matching sourced state-authority contract declares " +
        scopes[0] +
        " ownership; file provenance is not per-instance partition proof.",
      authorityContractIds: [...new Set(matches.map((item) => item.id))].sort(),
    };
  });
}

export function analyzeArenaStateIsolation(
  scripts: readonly ParsedScriptFile[],
  contracts: readonly StateAuthorityContract[] = [],
  crossFileCalls: readonly CrossFileCallEdge[] = [],
): ArenaStateIsolationAnalysis {
  const scoped = crossFileCalls.length > 0
    ? arenaRegionsAcrossScripts(scripts, crossFileCalls) : undefined;
  const analyzed = scripts.map(script =>
    analyzeScript(script, scoped?.get(script) ?? arenaRegions(script)));
  const observations = applyAuthorityContracts(
    analyzed.flatMap(
      (item) => item.observations,
    ),
    contracts,
  ).sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.region.localeCompare(b.region) ||
      a.surface.localeCompare(b.surface) ||
      a.key.localeCompare(b.key)
    );

  return {
    arenaRegions: analyzed.reduce(
      (sum, item) => sum + item.regions.size,
      0,
    ),
    observations,
    isolated: observations.filter(
      (item) => item.status === "isolated",
    ).length,
    partitionProofRequired: observations.filter(
      (item) =>
        item.status === "partition-proof-required",
    ).length,
    sharedGlobal: observations.filter(
      (item) => item.status === "shared-global",
    ).length,
    unknown: observations.filter(
      (item) => item.status === "unknown",
    ).length,
  };
}
