param(
    [Parameter(Position=0)]
    [ValidateSet("setup","doctor","audit","check","test","inspect","affected","plan","finalize-local","help")]
    [string]$Command = "help",

    [Parameter(Position=1, ValueFromRemainingArguments=$true)]
    [string[]]$Arguments
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Get-ChangedRepositoryPaths {
    $gitCommand = Get-Command git -ErrorAction SilentlyContinue
    if (-not $gitCommand) {
        throw "Git is required to discover changed repository paths."
    }

    $paths = [System.Collections.Generic.List[string]]::new()

    foreach ($path in (& git diff --name-only HEAD --)) {
        if ($path) { $paths.Add($path.Trim()) }
    }
    foreach ($path in (& git ls-files --others --exclude-standard)) {
        if ($path) { $paths.Add($path.Trim()) }
    }

    return @($paths | Sort-Object -Unique)
}

function Write-DoctorStatus {
    param(
        [string]$Label,
        [string]$Status,
        [string]$Detail = ""
    )

    $suffix = if ($Detail) { "  $Detail" } else { "" }
    Write-Host ("{0,-16} {1,-5}{2}" -f $Label, $Status, $suffix)
}

Push-Location $Root
try {
    switch ($Command) {
        "setup" {
            if (-not (Test-Path "package-lock.json")) {
                throw "package-lock.json is required by repository policy."
            }
            npm ci --ignore-scripts --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw "Script-free npm ci failed (exit code $LASTEXITCODE)." }
        }
        "doctor" {
            $toolchain = Get-Content "toolchain.json" -Raw | ConvertFrom-Json
            $expectedNodeVersion = [string]$toolchain.node.version
            $expectedNpmVersion = [string]$toolchain.npm.version
            $expectedPowerShellMajor = [int]$toolchain.powershell.minimumMajor
            $failures = [System.Collections.Generic.List[string]]::new()
            $warnings = [System.Collections.Generic.List[string]]::new()

            $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
            if (-not $nodeCommand) {
                Write-DoctorStatus "Node" "FAIL" "not found"
                $failures.Add("Node.js is required.")
            }
            else {
                $nodeVersion = (& node --version).Trim().TrimStart("v")
                if ($nodeVersion -eq $expectedNodeVersion) {
                    Write-DoctorStatus "Node" "PASS" "v$nodeVersion"
                }
                else {
                    Write-DoctorStatus "Node" "FAIL" "v$nodeVersion; expected v$expectedNodeVersion"
                    $failures.Add("Node.js version does not match toolchain.json.")
                }
            }

            $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
            if ($npmCommand) {
                $npmVersion = (& npm --version).Trim()
                if ($npmVersion -eq $expectedNpmVersion) {
                    Write-DoctorStatus "npm" "PASS" $npmVersion
                }
                else {
                    Write-DoctorStatus "npm" "FAIL" "$npmVersion; expected $expectedNpmVersion"
                    $failures.Add("npm version does not match toolchain.json.")
                }
            }
            else {
                Write-DoctorStatus "npm" "FAIL" "not found"
                $failures.Add("npm is required.")
            }

            if ($PSVersionTable.PSVersion.Major -ge $expectedPowerShellMajor) {
                Write-DoctorStatus "PowerShell" "PASS" $PSVersionTable.PSVersion.ToString()
            }
            else {
                Write-DoctorStatus "PowerShell" "FAIL" "$($PSVersionTable.PSVersion); expected >= $expectedPowerShellMajor"
                $failures.Add("PowerShell version is below toolchain minimum.")
            }

            $gitCommand = Get-Command git -ErrorAction SilentlyContinue
            if ($gitCommand) {
                Write-DoctorStatus "Git" "PASS" ((& git --version).Trim())
                $branch = (& git branch --show-current).Trim()
                if ($branch -eq "Local") {
                    Write-DoctorStatus "Branch" "PASS" $branch
                }
                else {
                    Write-DoctorStatus "Branch" "WARN" "$branch; normal development authority is Local"
                    $warnings.Add("Current branch is not Local.")
                }
            }
            else {
                Write-DoctorStatus "Git" "FAIL" "not found"
                $failures.Add("Git is required.")
            }

            if (Test-Path "package-lock.json") {
                Write-DoctorStatus "Lockfile" "PASS" "package-lock.json"
            }
            else {
                Write-DoctorStatus "Lockfile" "FAIL" "package-lock.json is required"
                $failures.Add("Dependency lockfile is missing.")
            }

            if (Test-Path "node_modules") {
                Write-DoctorStatus "Dependencies" "PASS" "installed"
            }
            else {
                Write-DoctorStatus "Dependencies" "WARN" "not installed; run DEV.cmd setup"
                $warnings.Add("Dependencies are not installed.")
            }

            if ((Test-Path "workspace/README.md") -and (Test-Path "workspace/drive-root.json") -and (Test-Path "workspace/projects")) {
                Write-DoctorStatus "Workspace" "PASS" "project-scoped"
            }
            else {
                Write-DoctorStatus "Workspace" "FAIL" "canonical project workspace missing"
                $failures.Add("Workspace must contain README.md, drive-root.json, and projects/.")
            }

            if ($failures.Count -gt 0) {
                Write-Host ""
                Write-Host "Environment is not ready:"
                foreach ($failure in $failures) { Write-Host "  - $failure" }
                exit 1
            }

            Write-Host ""
            if ($warnings.Count -gt 0) {
                Write-Host "Environment usable with warnings:"
                foreach ($warning in $warnings) { Write-Host "  - $warning" }
            }
            else {
                Write-Host "Environment ready."
            }
        }
        "audit" {
            npm run audit:source
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            npm run audit:api
        }
        "check" {
            npm run verify:full
        }
        "test" {
            npm test -- @Arguments
        }
        "inspect" {
            if (-not $Arguments -or $Arguments.Count -lt 1) {
                throw "Usage: DEV.cmd inspect <path-to-artifact>"
            }
            npm run cli -- inspect $Arguments[0]
        }
        "affected" {
            $paths = if ($Arguments -and $Arguments.Count -gt 0) {
                @($Arguments)
            }
            else {
                @(Get-ChangedRepositoryPaths)
            }

            if ($paths.Count -eq 0) {
                Write-Host "No changed repository paths."
                break
            }

            npm run cli -- affected @paths
        }
        "plan" {
            $paths = if ($Arguments -and $Arguments.Count -gt 0) {
                @($Arguments)
            }
            else {
                @(Get-ChangedRepositoryPaths)
            }

            if ($paths.Count -eq 0) {
                Write-Host "No changed repository paths."
                break
            }

            npm run cli -- plan @paths
        }
        "finalize-local" {
            npm run verify:local-ready
        }
        default {
            Write-Host "Lazy-Developer"
            Write-Host "  DEV.cmd setup"
            Write-Host "  DEV.cmd doctor"
            Write-Host "  DEV.cmd audit"
            Write-Host "  DEV.cmd check"
            Write-Host "  DEV.cmd test [vitest args]"
            Write-Host "  DEV.cmd inspect <artifact>"
            Write-Host "  DEV.cmd affected [changed-path ...]"
            Write-Host "  DEV.cmd plan [changed-path ...]"
            Write-Host "  DEV.cmd finalize-local"
        }
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally {
    Pop-Location
}