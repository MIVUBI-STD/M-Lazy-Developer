import ts from "typescript";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";

export interface InteractionLifecycleAnalysis {
  formShowPaths: number;
  formResponseRevalidationPaths: number;
  formCancelGuardPaths: number;
  staleFormResponseGaps: number;
  singlePressInteractionPaths: number;
  firstEventOrDebouncePaths: number;
  repeatedInputRisks: number;
  actorTargetScopePaths: number;
  actorTargetScopeGaps: number;
  inputDisablePaths: number;
  inputEnablePaths: number;
  inputOwnerSetEvidence: number;
  inputLifecycleRestoreEvidence: number;
  directInputLockRisks: number;
}

function textOf(
  scripts: readonly {
    parsed: ParsedScriptFile;
    text?: string;
  }[],
): string {
  return scripts
    .map((item) =>
      item.text ?? item.parsed.text ?? "",
    )
    .join("\n");
}

export function analyzeInteractionLifecycle(
  scripts: readonly {
    parsed: ParsedScriptFile;
    text?: string;
  }[],
): InteractionLifecycleAnalysis {
  const text = textOf(scripts);

  const formShowPaths =
    (
      text.match(
        /\.show\s*\([^)]*\)/g,
      ) ?? []
    ).length;
  const formResponseRevalidationPaths =
    (
      text.match(
        /(?:\.then\s*\([^)]*=>|await\s+[^;]*\.show\s*\()[\s\S]{0,700}(?:connectionGeneration|arenaGeneration|interactionGeneration|formGeneration|currentArena|currentState|isCurrent|validate[A-Za-z]*State|validate[A-Za-z]*Ownership)/gi,
      ) ?? []
    ).length;
  const formCancelGuardPaths =
    (
      text.match(
        /if\s*\([^)]*(?:canceled|cancelled|selection\s*===?\s*undefined|!\s*response|!\s*result)[^)]*\)\s*(?:\{\s*)?(?:return|throw)/gi,
      ) ?? []
    ).length;

  const singlePressInteractionPaths =
    (
      text.match(
        /(?:playerInteractWithBlock|playerInteractWithEntity|itemUse|buttonPush|pressurePlatePush|projectileHit)[\s\S]{0,160}?subscribe\s*\(/gi,
      ) ?? []
    ).length;
  const firstEventOrDebouncePaths =
    (
      text.match(
        /(?:isFirstEvent|debounce|operationToken|interactionGeneration|processedInteractions|inFlightInteractions)/gi,
      ) ?? []
    ).length;

  const actorTargetScopePaths =
    (
      text.match(
        /(?:actor|player|source)[\s\S]{0,240}?(?:target|entity|block)[\s\S]{0,300}?(?:arena|round|session|generation)[\s\S]{0,180}?(?:===|!==|==|!=)/gi,
      ) ?? []
    ).length;

  const inputDisablePaths =
    (
      text.match(
        /(?:inputPermissions|setPermissionCategory|movementEnabled|cameraEnabled|inputEnabled)[\s\S]{0,100}?(?:false|disabled)/gi,
      ) ?? []
    ).length;
  const inputEnablePaths =
    (
      text.match(
        /(?:inputPermissions|setPermissionCategory|movementEnabled|cameraEnabled|inputEnabled)[\s\S]{0,100}?(?:true|enabled)/gi,
      ) ?? []
    ).length;
  const inputOwnerSetEvidence =
    (
      text.match(
        /(?:inputLock|inputLease|lockOwners|inputOwners|ownerSet|referenceCount|refCount)[\s\S]{0,120}?(?:add|delete|acquire|release|set|clear)/gi,
      ) ?? []
    ).length;
  const inputLifecycleRestoreEvidence =
    (
      text.match(
        /(?:playerLeave|playerSpawn|worldLoad|reset|abort|disconnect|reconnect)[\s\S]{0,500}?(?:inputLock|inputLease|inputPermissions|movementEnabled|cameraEnabled|inputEnabled)/gi,
      ) ?? []
    ).length;

  return {
    formShowPaths,
    formResponseRevalidationPaths,
    formCancelGuardPaths,
    staleFormResponseGaps:
      formShowPaths === 0
        ? 0
        : Math.max(
            0,
            formShowPaths -
              Math.min(
                formResponseRevalidationPaths,
                formCancelGuardPaths,
              ),
          ),
    singlePressInteractionPaths,
    firstEventOrDebouncePaths,
    repeatedInputRisks:
      singlePressInteractionPaths > 0 &&
      firstEventOrDebouncePaths === 0
        ? singlePressInteractionPaths
        : 0,
    actorTargetScopePaths,
    actorTargetScopeGaps:
      singlePressInteractionPaths > 0 &&
      actorTargetScopePaths === 0
        ? singlePressInteractionPaths
        : 0,
    inputDisablePaths,
    inputEnablePaths,
    inputOwnerSetEvidence,
    inputLifecycleRestoreEvidence,
    directInputLockRisks:
      inputDisablePaths > 0 &&
      inputOwnerSetEvidence === 0
        ? inputDisablePaths
        : 0,
  };
}
