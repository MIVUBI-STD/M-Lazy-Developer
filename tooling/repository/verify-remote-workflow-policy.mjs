import { existsSync, readFileSync } from "node:fs";

/**
 * Repository policy guard, not a runtime/application availability check.
 * The current product is a ChatGPT-native Minecraft checker whose canonical
 * source and knowledge live in GitHub. Source CLI/Node metadata does not
 * establish a built or executed application.
 *
 * This existing verifier protects the active operator-entry contracts against
 * regression. It does NOT require an app, runner, CI, Node24, local checkout,
 * package-source workflow, or the user's PC to perform ChatGPT source checks.
 */
const failures = [];

const requiredPolicy = [
  ["README.md", [
    "Lazy-Developer is a ChatGPT-native Minecraft checker",
    "no M-Lazy-Developer application has been built or verified",
    "direct ChatGPT evidence review",
    "if genuinely executed",
  ]],
  ["CONTEXT.md", [
    "ChatGPT-native checker, not an existing executable application",
    "GitHub `Local` is the authority",
  ]],
  ["CONTRIBUTING.md", [
    "This is a ChatGPT-native checker, not a built application",
  ]],
  ["AGENTS.md", [
    "**not** an existing executable app",
    "Treat `runSelectedMapAudit()` as source-declared programmatic contract only unless directly executed",
    "ChatGPT + GitHub only (no external cloud services, no local PC)",
  ]],
  ["GITHUB_RULES.md", [
    "ChatGPT-native checker, not an already built app",
    "Report contract — mandatory on every task",
    "Never ask the user to run npm, Vitest, TypeScript, Minecraft, or a checkout on their own computer",
  ]],
  ["docs/README.md", [
    "ChatGPT-native checker with GitHub-owned source/knowledge",
  ]],
  ["docs/system/development-operations.md", [
    "This is a ChatGPT-native checker, not an installed, built, or running application",
    "Node `22.16.0` and npm `10.9.2`",
    "not for ChatGPT's built-in checking capabilities",
  ]],
  ["docs/system/development-discipline.md", [
    "Current delivery reality: ChatGPT-native checker; no application has been built or verified",
    "actual repository TypeScript execution",
  ]],
  ["docs/system/skill-routing.md", [
    "ChatGPT-native checker boundary",
    "must not claim a programmatic `runSelectedMapAudit()`",
  ]],
  ["docs/system/implementation-map.md", [
    "ChatGPT-native checker operating reality",
    "not deployed services or an existing application",
  ]],
  ["docs/product/README.md", [
    "This is a ChatGPT-native Minecraft checker with GitHub source/knowledge",
  ]],
  ["docs/product/flow.md", [
    "Current operator: ChatGPT-native checker; no M-Lazy-Developer app has been built or verified",
    "source-declared programmatic audit flow",
  ]],
  ["docs/analysis/README.md", [
    "Current execution reality: ChatGPT-native checker, no built app",
  ]],
  ["docs/analysis/master-selected-map-audit-workflow.md", [
    "ChatGPT-native checker is the actual current operator",
    "optional TypeScript implementation flow if actually executed",
  ]],
  [".agents/skills/m-bedrock-map-bug-audit/SKILL.md", [
    "Actual operating environment — ChatGPT-native checker",
    "directly, without pretending this call occurred",
    "never fabricate one for a ChatGPT conversation",
  ]],
  [".agents/skills/m-bedrock-product-development/SKILL.md", [
    "This is a ChatGPT-native checker; no application has been built or operated",
  ]],
  [".agents/skills/m-bedrock-detection-benchmark/SKILL.md", [
    "ChatGPT-native checker reality",
    "only a genuinely executed `runSelectedMapAudit()`",
  ]],
];

for (const [path, required] of requiredPolicy) {
  if (!existsSync(path)) {
    failures.push("Missing active ChatGPT checker policy owner: " + path);
    continue;
  }
  const source = readFileSync(path, "utf8");
  for (const phrase of required) {
    if (!source.includes(phrase)) {
      failures.push(path + " lost ChatGPT-native checking invariant: " + phrase);
    }
  }
}

// Optional legacy developer/portable workflow code may stay in the source
// repository. It cannot become a ChatGPT execution prerequisite. In
// particular, never require a portable package workflow or verify:local-ready
// merely to label direct GitHub+ChatGPT source work complete.
if (existsSync("package.json")) {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  for (const name of ["check", "verify:ready"]) {
    if (Object.prototype.hasOwnProperty.call(pkg.scripts ?? {}, name)) {
      failures.push(
        "Generic mandatory readiness script '" + name +
        "' conflicts with optional ChatGPT source checking.",
      );
    }
  }
}

if (failures.length) {
  console.error("ChatGPT-native checker workflow policy violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exitCode = 1;
} else {
  console.log("ChatGPT-native checker / GitHub source-only policy verified.");
}
