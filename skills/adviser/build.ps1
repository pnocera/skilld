#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Build self-contained adviser executables for Windows and Linux.

.DESCRIPTION
    Uses Bun's --compile feature to create standalone executables that bundle:
    - All TypeScript code and dependencies
    - Text/Markdown motif files
    - The Bun runtime

    Output:
    - dist/adviser.exe (Windows x64) - built natively with Bun
    - dist/adviser     (Linux x64)   - built via Docker

.NOTES
    Requires: 
    - Bun 1.1+ (for Windows build)
    - Docker (for Linux build)
    The target machine still needs Claude CLI installed.

.EXAMPLE
    ./build.ps1              # Build both platforms
    ./build.ps1 -WindowsOnly # Build only Windows
    ./build.ps1 -LinuxOnly   # Build only Linux (requires Docker)
#>

param(
    [switch]$WindowsOnly,
    [switch]$LinuxOnly,
    [switch]$Minify = $true
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = (Resolve-Path (Join-Path $ScriptDir "../..")).Path
$DistDir = Join-Path $ScriptDir "dist"

# Ensure dist directory exists
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir -Force | Out-Null
}

Write-Host "[Adviser Build] Starting build..." -ForegroundColor Cyan
Write-Host "  Project root: $ProjectRoot"
Write-Host "  Source dir:   $ScriptDir"
Write-Host "  Output dir:   $DistDir"
Write-Host ""

$minifyFlag = if ($Minify) { "--minify" } else { "" }

# Build Windows executable (native Bun)
if (-not $LinuxOnly) {
    Write-Host "[Windows] Building adviser.exe..." -ForegroundColor Yellow
    $windowsOut = Join-Path $DistDir "adviser.exe"
    $entryPoint = Join-Path $ScriptDir "index.ts"
    
    $cmd = "bun build `"$entryPoint`" --compile $minifyFlag --target=bun-windows-x64 --outfile `"$windowsOut`""
    Write-Host "  > $cmd" -ForegroundColor DarkGray
    Invoke-Expression $cmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[Windows] Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
    
    if (Test-Path $windowsOut) {
        $size = (Get-Item $windowsOut).Length / 1MB
        Write-Host "[Windows] Success: adviser.exe ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "[Windows] Failed to create adviser.exe" -ForegroundColor Red
        exit 1
    }
}

# Build Linux executable (via Docker)
if (-not $WindowsOnly) {
    Write-Host "[Linux] Building adviser via Docker..." -ForegroundColor Yellow
    
    # Check Docker is available
    $dockerCheck = Get-Command docker -ErrorAction SilentlyContinue
    if (-not $dockerCheck) {
        Write-Host "[Linux] Error: Docker not found. Install Docker Desktop or use -WindowsOnly" -ForegroundColor Red
        exit 1
    }
    
    $linuxOut = Join-Path $DistDir "adviser"
    $dockerfile = Join-Path $ProjectRoot "Dockerfile.adviser"
    
    # Build using Docker with output to local filesystem
    Write-Host "  > docker build -f Dockerfile.adviser --target adviser-export --output type=local,dest=`"$DistDir`" ." -ForegroundColor DarkGray
    
    Push-Location $ProjectRoot
    try {
        docker build -f Dockerfile.adviser --target adviser-export --output "type=local,dest=$DistDir" .
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[Linux] Docker build failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
    
    if (Test-Path $linuxOut) {
        $size = (Get-Item $linuxOut).Length / 1MB
        Write-Host "[Linux] Success: adviser ($([math]::Round($size, 2)) MB)" -ForegroundColor Green
    } else {
        Write-Host "[Linux] Failed to create adviser" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "[Adviser Build] Complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Executables ready in: $DistDir" -ForegroundColor White
Write-Host ""
Write-Host "Usage:" -ForegroundColor White
Write-Host "  Windows: .\adviser.exe design-review -c @document.md" -ForegroundColor DarkGray
Write-Host "  Linux:   ./adviser design-review -c @document.md" -ForegroundColor DarkGray
