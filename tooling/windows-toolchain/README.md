# Windows Toolchain

This directory owns the repository-level Windows developer command routing.

`DEV.cmd` is the sole root entrypoint and delegates to `dev.ps1`.

The router must remain thin: semantic product behavior belongs in engine/packages, engine/analyzers, and engine/adapters, not PowerShell.

Supported policy is owned by `../../toolchain.json`. `DEV.cmd setup` uses `npm ci --ignore-scripts --no-audit --no-fund` under npm 10. Do not add `--omit=optional`: esbuild requires its platform binary. The native Bedrock LevelDB reader remains optional and unverified until deliberately installed and invoked.


`DEV.cmd doctor` provides a lightweight environment diagnostic for toolchain, branch, dependency-lock, dependency-install, and workspace readiness.
