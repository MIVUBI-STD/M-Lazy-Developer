import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { applyPatchTransaction, rollbackAppliedFiles } from "../src/apply.js";
import { createPatchTransaction } from "../src/create.js";
import { fixtureRepairAuthorization } from "./fixture-authorization.js";

describe("applyPatchTransaction", () => {
  it("applies a command replacement only inside working root", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-dev-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    await mkdir(join(sourceRoot, "functions"), { recursive: true });
    await mkdir(join(workingRoot, "functions"), { recursive: true });

    const original = "fill 298 0 0 301 2 3 stone\n";
    await writeFile(join(sourceRoot, "functions/a.mcfunction"), original);
    await writeFile(join(workingRoot, "functions/a.mcfunction"), original);

    const tx = createPatchTransaction({
      title: "repair topology outlier",
      sourceFingerprint: "fixture",
      authorization: fixtureRepairAuthorization("fixture"),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "fixture",
          relativePath: "functions/a.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expected: "fill 298 0 0 301 2 3 stone",
        replacement: "fill 300 0 0 303 2 3 stone",
      }],
      preconditions: [{ kind: "source-fingerprint", expected: "fixture" }],
      validation: [{
        kind: "topology-compare",
        source: {
          artifactId: "fixture",
          relativePath: "functions/a.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expectation: "outlier-absent",
      }],
    });

    const result = await applyPatchTransaction(
      tx,
      { sourceRoot, workingRoot },
      { currentSourceFingerprint: "fixture" },
    );
    expect(result.ok).toBe(true);
    expect(await readFile(join(workingRoot, "functions/a.mcfunction"), "utf8"))
      .toBe("fill 300 0 0 303 2 3 stone\n");
    expect(await readFile(join(sourceRoot, "functions/a.mcfunction"), "utf8")).toBe(original);
  });

  it("fails closed on independently supplied source fingerprint mismatch", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-dev-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    await mkdir(sourceRoot, { recursive: true });
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    await writeFile(join(workingRoot, "functions/a.mcfunction"), "say old\n");

    const tx = createPatchTransaction({
      title: "stale source",
      sourceFingerprint: "expected",
      authorization: fixtureRepairAuthorization("expected"),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "fixture",
          relativePath: "functions/a.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [{ kind: "source-fingerprint", expected: "expected" }],
      validation: [],
    });

    const result = await applyPatchTransaction(
      tx,
      { sourceRoot, workingRoot },
      { currentSourceFingerprint: "actual" },
    );
    expect(result.ok).toBe(false);
    expect(result.failure).toBe("PRECONDITION_FAILED");
    expect(await readFile(join(workingRoot, "functions/a.mcfunction"), "utf8")).toBe("say old\n");
  });

  it("fails closed when a command line changed", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-dev-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    await writeFile(join(workingRoot, "functions/a.mcfunction"), "say changed\n");

    const tx = createPatchTransaction({
      title: "stale patch",
      sourceFingerprint: "fixture",
      authorization: fixtureRepairAuthorization("fixture"),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "fixture",
          relativePath: "functions/a.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [{ kind: "source-fingerprint", expected: "fixture" }],
      validation: [],
    });

    const result = await applyPatchTransaction(
      tx,
      { sourceRoot, workingRoot },
      { currentSourceFingerprint: "fixture" },
    );
    expect(result.ok).toBe(false);
    expect(await readFile(join(workingRoot, "functions/a.mcfunction"), "utf8")).toBe("say changed\n");
  });

  it("restores an applied working-copy mutation from rollback evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "m-bedrock-dev-"));
    const sourceRoot = join(root, "source");
    const workingRoot = join(root, "working");
    await mkdir(join(sourceRoot, "functions"), { recursive: true });
    await mkdir(join(workingRoot, "functions"), { recursive: true });
    await writeFile(join(sourceRoot, "functions/a.mcfunction"), "say old\n");
    await writeFile(join(workingRoot, "functions/a.mcfunction"), "say old\n");

    const tx = createPatchTransaction({
      title: "rollback demo",
      sourceFingerprint: "fixture",
      authorization: fixtureRepairAuthorization("fixture"),
      operations: [{
        kind: "replace-command",
        source: {
          artifactId: "fixture",
          relativePath: "functions/a.mcfunction",
          range: { lineStart: 1, lineEnd: 1 },
        },
        expected: "say old",
        replacement: "say new",
      }],
      preconditions: [{
        kind: "source-fingerprint",
        expected: "fixture",
      }],
      validation: [],
    });

    const applied = await applyPatchTransaction(
      tx,
      { sourceRoot, workingRoot },
      { currentSourceFingerprint: "fixture" },
    );
    expect(applied.ok).toBe(true);
    expect(await readFile(
      join(workingRoot, "functions/a.mcfunction"),
      "utf8",
    )).toBe("say new\n");

    const rollback = await rollbackAppliedFiles(
      { sourceRoot, workingRoot },
      applied.rollback,
    );
    expect(rollback).toEqual({
      ok: true,
      restoredFiles: 1,
    });
    expect(await readFile(
      join(workingRoot, "functions/a.mcfunction"),
      "utf8",
    )).toBe("say old\n");
  });

});
