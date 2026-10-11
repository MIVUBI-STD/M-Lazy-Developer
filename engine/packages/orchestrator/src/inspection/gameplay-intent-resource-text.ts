import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  extractGameplayIntentSurfaceSignal,
  type GameplayIntentSignal,
} from "../../../../analyzers/gameplay-intent/src/index.js";
import type {
  FileInventoryEntry,
} from "../../../project-model/src/index.js";

export interface GameplayResourceTextEntry {
  readonly key: string;
  readonly text: string;
  readonly relativePath: string;
  readonly line: number;
}

function parseLang(
  source: string,
  relativePath: string,
): readonly GameplayResourceTextEntry[] {
  return source
    .split(/\r?\n/)
    .flatMap((raw, index) => {
      const line = raw.trim();
      if (
        !line ||
        line.startsWith("#") ||
        line.startsWith("//")
      ) {
        return [];
      }

      const separator = line.indexOf("=");
      if (separator <= 0) return [];

      const key =
        line.slice(0, separator).trim();
      const text =
        line.slice(separator + 1).trim();

      if (!key || !text) return [];

      return [{
        key,
        text,
        relativePath,
        line: index + 1,
      }];
    });
}

export async function deriveGameplayResourceTextSignals(
  root: string,
  files: readonly FileInventoryEntry[],
): Promise<{
  readonly entries:
    readonly GameplayResourceTextEntry[];
  readonly signals:
    readonly GameplayIntentSignal[];
}> {
  const entries: GameplayResourceTextEntry[] = [];

  for (const file of files) {
    const path =
      file.relativePath.replaceAll("\\", "/");
    if (
      !/\/texts\/[^/]+\.lang$/i.test(
        "/" + path,
      )
    ) {
      continue;
    }

    let source: string;
    try {
      source = await readFile(
        join(root, file.relativePath),
        "utf8",
      );
    } catch {
      continue;
    }

    entries.push(
      ...parseLang(
        source,
        file.relativePath,
      ),
    );
  }

  const signals = entries.flatMap(
    (entry) => {
      const signal =
        extractGameplayIntentSurfaceSignal({
          label: entry.text,
          locator:
            entry.relativePath +
            "#L" +
            String(entry.line),
          evidenceOrigin: "translation",
          status: "inferred",
          summary:
            "Player-facing localized text exposes a gameplay expectation candidate from the selected artifact.",
        });
      return signal ? [signal] : [];
    },
  );

  return {
    entries,
    signals,
  };
}
