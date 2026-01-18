#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Main build script for the skilld project.

.DESCRIPTION
    Orchestrates the complete build process for skilld:
    1. Validates prerequisites (Bun, Docker for Linux builds)
    2. Installs/updates dependencies
    3. Runs tests
    4. Builds skill executables (Windows and/or Linux)
    5. Validates build outputs

.PARAMETER Clean
    Remove dist directories before building.

.PARAMETER SkipTests
    Skip running tests.

.PARAMETER SkipInstall
    Skip dependency installation.

.PARAMETER WindowsOnly
    Build only Windows executables.

.PARAMETER LinuxOnly
    Build only Linux executables (requires Docker).

.PARAMETER Release
    Build in release mode with minification.

.PARAMETER Deploy
    Deploy to a target directory after build. Prompts if no path provided.

.EXAMPLE
    ./build.ps1                      # Full build with tests
    ./build.ps1 -Clean               # Clean build
    ./build.ps1 -SkipTests           # Build without tests
    ./build.ps1 -WindowsOnly -Clean  # Clean Windows-only build
    ./build.ps1 -Deploy "C:\MyProj"  # Build and deploy

.NOTES
    Requires:
    - Bun 1.1+ (https://bun.sh)
    - Docker Desktop (for Linux builds)
#>

[CmdletBinding()]
param(
    [switch]$Clean,
    [switch]$SkipTests,
    [switch]$SkipInstall,
    [switch]$WindowsOnly,
    [switch]$LinuxOnly,
    [switch]$Release = $true,
    [string]$Deploy,
    [string]$TargetDir = ".agent"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Faster web requests

# Colors for output
function Write-Step { param($Message) Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "  [OK] $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "  --> $Message" -ForegroundColor White }
function Write-Warn { param($Message) Write-Host "  [!] $Message" -ForegroundColor Yellow }
function Write-Failure { param($Message) Write-Host "  [X] $Message" -ForegroundColor Red }

# Helper to run external commands robustly
# Prevents PowerShell from stopping on successful stderr output
function Invoke-Native {
    param(
        [ScriptBlock]$Script,
        [string]$ErrorMsg = "Command failed"
    )
    $oldEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = & $Script 2>&1
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $oldEAP
    
    if ($exitCode -ne 0) {
        Write-Failure $ErrorMsg
        if ($output) {
            Write-Host ($output -join "`n") -ForegroundColor Red
        }
        exit 1
    }
    return $output
}

# Configuration
$ProjectRoot = $PSScriptRoot
$SkillsDir = Join-Path $ProjectRoot "skills"
$AdviserDir = Join-Path $SkillsDir "adviser"
$DistDir = Join-Path $AdviserDir "dist"

# Banner
Write-Host ""
Write-Host "+============================================================+" -ForegroundColor Magenta
Write-Host "|                    SKILLD BUILD SYSTEM                     |" -ForegroundColor Magenta
Write-Host "+============================================================+" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Project Root: $ProjectRoot" -ForegroundColor DarkGray
Write-Host "  Build Time:   $((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor DarkGray
Write-Host ""

# Track build metrics
$BuildStart = Get-Date
$StepResults = @{}

function Test-Prerequisite {
    param(
        [string]$Command,
        [string]$DisplayName,
        [string]$InstallUrl,
        [switch]$Required
    )
    
    $exe = Get-Command $Command -ErrorAction SilentlyContinue
    if ($exe) {
        $version = ""
        try {
            if ($Command -eq "bun") { $version = (bun --version 2>&1) }
            elseif ($Command -eq "docker") { $version = (docker --version 2>&1) -replace "Docker version ", "" -replace ",.*", "" }
        } catch {}
        Write-Success "$DisplayName found $(if($version){"(v$version)"})"
        return $true
    } else {
        if ($Required) {
            Write-Failure "$DisplayName not found!"
            Write-Host "    Install from: $InstallUrl" -ForegroundColor DarkGray
            return $false
        } else {
            Write-Warn "$DisplayName not found (optional)"
            return $false
        }
    }
}

# ============================================================================
# STEP 1: Prerequisites Check
# ============================================================================
Write-Step "Checking prerequisites..."

$hasBun = Test-Prerequisite -Command "bun" -DisplayName "Bun" -InstallUrl "https://bun.sh" -Required
$hasDocker = Test-Prerequisite -Command "docker" -DisplayName "Docker" -InstallUrl "https://docker.com"

if (-not $hasBun) {
    Write-Host "`n  Build cannot continue without Bun." -ForegroundColor Red
    exit 1
}

if (-not $WindowsOnly -and -not $hasDocker) {
    Write-Warn "Docker not available. Linux build will be skipped."
    $WindowsOnly = $true
}

$StepResults["Prerequisites"] = "OK"

# ============================================================================
# STEP 2: Clean (optional)
# ============================================================================
if ($Clean) {
    Write-Step "Cleaning build artifacts..."
    
    if (Test-Path $DistDir) {
        Remove-Item -Path $DistDir -Recurse -Force
        Write-Success "Removed $DistDir"
    }
    
    # Clean any other temp files
    $tempFiles = Get-ChildItem -Path $ProjectRoot -Filter "*.tmp" -Recurse -ErrorAction SilentlyContinue
    if ($tempFiles.Count -gt 0) {
        $tempFiles | Remove-Item -Force
        Write-Success "Removed $($tempFiles.Count) temp files"
    }
    
    $StepResults["Clean"] = "OK"
}

# ============================================================================
# STEP 3: Install Dependencies
# ============================================================================
if (-not $SkipInstall) {
    Write-Step "Installing dependencies..."
    Push-Location $ProjectRoot
    try {
        Invoke-Native -Script { bun install } -ErrorMsg "Dependency installation failed"
        Write-Success "Dependencies installed"
    } finally {
        Pop-Location
    }
    $StepResults["Dependencies"] = "OK"
}

# ============================================================================
# STEP 4: Run Tests
# ============================================================================
if (-not $SkipTests) {
    Write-Step "Running tests..."
    Push-Location $ProjectRoot
    try {
        $testOutput = Invoke-Native -Script { bun test } -ErrorMsg "Tests failed"
        
        # Filter test output for summary
        $summaryLine = $testOutput | Where-Object { $_ -match "^\d+ pass|^\d+ fail|tests completed" } | Select-Object -Last 1
        
        if ($summaryLine) {
            Write-Success "Tests passed: $summaryLine"
        } else {
            Write-Success "Tests passed"
        }
    } finally {
        Pop-Location
    }
    $StepResults["Tests"] = "OK"
}

# ============================================================================
# STEP 5: Build Executables
# ============================================================================
Write-Step "Building skill executables..."

# Ensure dist directory exists
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

$minifyFlag = if ($Release) { "--minify" } else { "" }
$entryPoint = Join-Path $AdviserDir "index.ts"

# Build Windows
if (-not $LinuxOnly) {
    Write-Info "Building Windows executable..."
    $windowsOut = Join-Path $DistDir "adviser.exe"
    
    Invoke-Native -Script { & bun build "$entryPoint" --compile $minifyFlag --target=bun-windows-x64 --outfile "$windowsOut" } -ErrorMsg "Windows build failed"
    
    if (Test-Path $windowsOut) {
        $size = [math]::Round((Get-Item $windowsOut).Length / 1MB, 2)
        Write-Success "adviser.exe ($size MB)"
    } else {
        Write-Failure "Failed to create adviser.exe"
        exit 1
    }
}

# Build Linux (via Docker)
if (-not $WindowsOnly -and $hasDocker) {
    Write-Info "Building Linux executable via Docker..."
    $linuxOut = Join-Path $DistDir "adviser"
    
    Push-Location $ProjectRoot
    try {
        Invoke-Native -Script { docker build -f Dockerfile.adviser --target adviser-export --output "type=local,dest=$DistDir" . } -ErrorMsg "Linux (Docker) build failed"
    } finally {
        Pop-Location
    }
    
    if (Test-Path $linuxOut) {
        $size = [math]::Round((Get-Item $linuxOut).Length / 1MB, 2)
        Write-Success "adviser ($size MB)"
    } else {
        Write-Failure "Failed to create adviser"
        exit 1
    }
}

$StepResults["Build"] = "OK"

# ============================================================================
# STEP 6: Validate Build
# ============================================================================
Write-Step "Validating build outputs..."

$artifacts = @()

if (Test-Path (Join-Path $DistDir "adviser.exe")) {
    $item = Get-Item (Join-Path $DistDir "adviser.exe")
    $artifacts += [PSCustomObject]@{
        Name = "adviser.exe"
        Platform = "Windows x64"
        Size = "$([math]::Round($item.Length / 1MB, 2)) MB"
        Path = $item.FullName
    }
}

if (Test-Path (Join-Path $DistDir "adviser")) {
    $item = Get-Item (Join-Path $DistDir "adviser")
    $artifacts += [PSCustomObject]@{
        Name = "adviser"
        Platform = "Linux x64"
        Size = "$([math]::Round($item.Length / 1MB, 2)) MB"
        Path = $item.FullName
    }
}

if ($artifacts.Count -eq 0) {
    Write-Failure "No build artifacts found!"
    exit 1
}

foreach ($artifact in $artifacts) {
    Write-Success "$($artifact.Name) -> $($artifact.Platform) ($($artifact.Size))"
}

$StepResults["Validate"] = "OK"

# ============================================================================
# STEP 7: Deploy (optional)
# ============================================================================
if ($Deploy) {
    Write-Step "Deploying to target..."
    
    Push-Location $ProjectRoot
    try {
        Invoke-Native -Script { bun run deploy-skill.ts $Deploy --target-dir $TargetDir } -ErrorMsg "Deployment failed"
        Write-Success "Deployed to: $Deploy (target: $TargetDir)"
    } finally {
        Pop-Location
    }
    
    $StepResults["Deploy"] = "OK"
}

# ============================================================================
# Summary
# ============================================================================
$BuildEnd = Get-Date
$BuildDuration = $BuildEnd - $BuildStart

Write-Host ""
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host "|                    BUILD SUCCESSFUL                        |" -ForegroundColor Green
Write-Host "+============================================================+" -ForegroundColor Green
Write-Host ""
Write-Host "  Duration: $([math]::Round($BuildDuration.TotalSeconds, 1)) seconds" -ForegroundColor White
Write-Host ""
Write-Host "  Artifacts:" -ForegroundColor White
foreach ($artifact in $artifacts) {
    Write-Host "    * $($artifact.Name) ($($artifact.Platform))" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "  Output Directory:" -ForegroundColor White
Write-Host "    $DistDir" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Next Steps:" -ForegroundColor White
Write-Host "    Deploy:  .\build.ps1 -Deploy <target-project-path>" -ForegroundColor DarkGray
Write-Host "    Test:    .\skills\adviser\dist\adviser.exe --help" -ForegroundColor DarkGray
Write-Host ""
