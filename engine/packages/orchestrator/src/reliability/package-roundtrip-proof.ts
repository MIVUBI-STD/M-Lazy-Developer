import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NORMAL_EXTRACTION_BUDGET,
  extractZipSafely,
  packageDirectoryDeterministically,
} from "../../../archive/src/index.js";
import { buildFilesystemInventory } from "../../../project-model/src/index.js";

export interface PackageRoundtripDifference {
  path: string;
  kind: "missing-after" | "unexpected-after" | "content-changed";
  beforeHash?: string;
  afterHash?: string;
  beforeSize?: number;
  afterSize?: number;
}

export interface PackageRoundtripProof {
  equivalent: boolean;
  beforeFiles: number;
  afterFiles: number;
  differences: PackageRoundtripDifference[];
}

export async function proveNoopPackageRoundtrip(
  artifactPath: string,
): Promise<PackageRoundtripProof> {
  const root = await mkdtemp(join(tmpdir(), "m-bedrock-roundtrip-"));
  const beforeRoot = join(root, "before");
  const packagedPath = join(root, "roundtrip.mcworld");
  const afterRoot = join(root, "after");

  try {
    await extractZipSafely(
      artifactPath,
      beforeRoot,
      NORMAL_EXTRACTION_BUDGET,
    );
    const before = await buildFilesystemInventory(beforeRoot);

    await packageDirectoryDeterministically(beforeRoot, packagedPath);
    await extractZipSafely(
      packagedPath,
      afterRoot,
      NORMAL_EXTRACTION_BUDGET,
    );
    const after = await buildFilesystemInventory(afterRoot);

    const beforeByPath = new Map(
      before.map((entry) => [entry.relativePath, entry]),
    );
    const afterByPath = new Map(
      after.map((entry) => [entry.relativePath, entry]),
    );

    const differences: PackageRoundtripDifference[] = [];
    const paths = new Set([
      ...beforeByPath.keys(),
      ...afterByPath.keys(),
    ]);

    for (const path of [...paths].sort()) {
      const beforeEntry = beforeByPath.get(path);
      const afterEntry = afterByPath.get(path);

      if (!beforeEntry) {
        differences.push({
          path,
          kind: "unexpected-after",
          ...(afterEntry?.contentHash === undefined ? {} : { afterHash: afterEntry.contentHash }),
          ...(afterEntry?.size === undefined ? {} : { afterSize: afterEntry.size }),
        });
        continue;
      }

      if (!afterEntry) {
        differences.push({
          path,
          kind: "missing-after",
          ...(beforeEntry.contentHash === undefined ? {} : { beforeHash: beforeEntry.contentHash }),
          beforeSize: beforeEntry.size,
        });
        continue;
      }

      if (
        beforeEntry.contentHash !== afterEntry.contentHash ||
        beforeEntry.size !== afterEntry.size
      ) {
        differences.push({
          path,
          kind: "content-changed",
          ...(beforeEntry.contentHash === undefined ? {} : { beforeHash: beforeEntry.contentHash }),
          ...(afterEntry.contentHash === undefined ? {} : { afterHash: afterEntry.contentHash }),
          beforeSize: beforeEntry.size,
          afterSize: afterEntry.size,
        });
      }
    }

    return {
      equivalent: differences.length === 0,
      beforeFiles: before.length,
      afterFiles: after.length,
      differences,
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
