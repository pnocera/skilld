#!/bin/bash

# Main build script for the skilld project
# Translated from build.ps1 for Linux environments

set -e # Exit on error

# Configuration
PROJECT_ROOT=$(pwd)
SKILLS_DIR="$PROJECT_ROOT/skills"
ADVISER_DIR="$SKILLS_DIR/adviser"
DIST_DIR="$ADVISER_DIR/dist"

# Colors for output
CYAN='\033[0;36m'
GREEN='\033[0;32m'
WHITE='\033[0;37m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

write_step() { echo -e "\n${CYAN}[$(date +%H:%M:%S)] $1${NC}"; }
write_success() { echo -e "  ${GREEN}[OK] $1${NC}"; }
write_info() { echo -e "  --> ${WHITE}$1${NC}"; }
write_warn() { echo -e "  ${YELLOW}[!] $1${NC}"; }
write_failure() { echo -e "  ${RED}[X] $1${NC}"; }

# Help function
show_help() {
    echo "Usage: ./build.sh [options]"
    echo ""
    echo "Options:"
    echo "  --clean, -Clean          Remove dist directories before building."
    echo "  --skip-tests, -SkipTests  Skip running tests."
    echo "  --skip-install, -SkipInstall Skip dependency installation."
    echo "  --windows-only, -WindowsOnly Build only Windows executables."
    echo "  --linux-only, -LinuxOnly   Build only Linux executables (requires Docker)."
    echo "  --no-release             Build without minification (default is release mode)."
    echo "  --deploy, -Deploy <path>  Deploy to a target directory after build."
    echo "  --target-dir, -TargetDir <dir> Output dir: .agent (default) or .claude"
    echo "  --claude                 Shorthand for --target-dir .claude"
    echo "  --help, -h               Show this help message."
    echo ""
}

# Defaults
CLEAN=false
SKIP_TESTS=false
SKIP_INSTALL=false
WINDOWS_ONLY=false
LINUX_ONLY=false
RELEASE=true
DEPLOY=""
TARGET_DIR=".agent"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --clean|-Clean) CLEAN=true ;;
        --skip-tests|-SkipTests) SKIP_TESTS=true ;;
        --skip-install|-SkipInstall) SKIP_INSTALL=true ;;
        --windows-only|-WindowsOnly) WINDOWS_ONLY=true ;;
        --linux-only|-LinuxOnly) LINUX_ONLY=true ;;
        --no-release) RELEASE=false ;;
        --deploy|-Deploy) DEPLOY="$2"; shift ;;
        --target-dir|-TargetDir) TARGET_DIR="$2"; shift ;;
        --claude) TARGET_DIR=".claude" ;;
        --help|-h) show_help; exit 0 ;;
        *) echo "Unknown parameter: $1"; show_help; exit 1 ;;
    esac
    shift
done

# Banner
echo -e ""
echo -e "${MAGENTA}+============================================================+${NC}"
echo -e "${MAGENTA}|                    SKILLD BUILD SYSTEM                     |${NC}"
echo -e "${MAGENTA}+============================================================+${NC}"
echo -e ""
echo -e "${GRAY}  Project Root: $PROJECT_ROOT${NC}"
echo -e "${GRAY}  Build Time:   $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e ""

BUILD_START=$(date +%s)

# Step 1: Prerequisites Check
write_step "Checking prerequisites..."

has_bun=false
if command -v bun &> /dev/null; then
    version=$(bun --version)
    write_success "Bun found (v$version)"
    has_bun=true
else
    write_failure "Bun not found!"
    echo -e "${GRAY}    Install from: https://bun.sh${NC}"
    exit 1
fi

has_docker=false
if command -v docker &> /dev/null; then
    version=$(docker --version | grep "Docker version" | sed 's/Docker version //' | sed 's/,.*//')
    write_success "Docker found (v$version)"
    has_docker=true
else
    write_warn "Docker not found (optional)"
fi

if [ "$WINDOWS_ONLY" = false ] && [ "$has_docker" = false ]; then
    write_warn "Docker not available. Linux build will be skipped."
    WINDOWS_ONLY=true
fi

# Step 2: Clean
if [ "$CLEAN" = true ]; then
    write_step "Cleaning build artifacts..."
    if [ -d "$DIST_DIR" ]; then
        rm -rf "$DIST_DIR"
        write_success "Removed $DIST_DIR"
    fi
    
    # Clean any other temp files
    temp_count=$(find "$PROJECT_ROOT" -name "*.tmp" | wc -l)
    if [ "$temp_count" -gt 0 ]; then
        find "$PROJECT_ROOT" -name "*.tmp" -delete
        write_success "Removed $temp_count temp files"
    fi
fi

# Step 3: Install Dependencies
if [ "$SKIP_INSTALL" = false ]; then
    write_step "Installing dependencies..."
    bun install || { write_failure "Dependency installation failed"; exit 1; }
    write_success "Dependencies installed"
fi

# Step 4: Run Tests
if [ "$SKIP_TESTS" = false ]; then
    write_step "Running tests..."
    # We use || true here if we want to continue, but the PS1 script exits on error
    bun test || { write_failure "Tests failed"; exit 1; }
    write_success "Tests passed"
fi

# Step 5: Build Executables
write_step "Building skill executables..."

# Ensure dist directory exists
mkdir -p "$DIST_DIR"

MINIFY_FLAG=""
if [ "$RELEASE" = true ]; then
    MINIFY_FLAG="--minify"
fi

ENTRY_POINT="$ADVISER_DIR/index.ts"

# Build Windows
if [ "$LINUX_ONLY" = false ]; then
    write_info "Building Windows executable..."
    WINDOWS_OUT="$DIST_DIR/adviser.exe"
    
    bun build "$ENTRY_POINT" --compile $MINIFY_FLAG --target=bun-windows-x64 --outfile "$WINDOWS_OUT" || { write_failure "Windows build failed"; exit 1; }
    
    if [ -f "$WINDOWS_OUT" ]; then
        size=$(du -h "$WINDOWS_OUT" | cut -f1)
        write_success "adviser.exe ($size)"
    else
        write_failure "Failed to create adviser.exe"
        exit 1
    fi
fi

# Build Linux (via Docker)
if [ "$WINDOWS_ONLY" = false ] && [ "$has_docker" = true ]; then
    write_info "Building Linux executable via Docker..."
    LINUX_OUT="$DIST_DIR/adviser"
    
    docker build -f Dockerfile.adviser --target adviser-export --output "type=local,dest=$DIST_DIR" . || { write_failure "Linux (Docker) build failed"; exit 1; }
    
    if [ -f "$LINUX_OUT" ]; then
        size=$(du -h "$LINUX_OUT" | cut -f1)
        write_success "adviser ($size)"
    else
        write_failure "Failed to create adviser"
        exit 1
    fi
fi

# Step 6: Validate Build
write_step "Validating build outputs..."
ARTIFACTS_FOUND=0

if [ -f "$DIST_DIR/adviser.exe" ]; then
    size=$(du -h "$DIST_DIR/adviser.exe" | cut -f1)
    write_success "adviser.exe -> Windows x64 ($size)"
    ARTIFACTS_FOUND=$((ARTIFACTS_FOUND + 1))
fi

if [ -f "$DIST_DIR/adviser" ]; then
    size=$(du -h "$DIST_DIR/adviser" | cut -f1)
    write_success "adviser -> Linux x64 ($size)"
    ARTIFACTS_FOUND=$((ARTIFACTS_FOUND + 1))
fi

if [ "$ARTIFACTS_FOUND" -eq 0 ]; then
    write_failure "No build artifacts found!"
    exit 1
fi

# Step 7: Deploy
if [ -n "$DEPLOY" ]; then
    write_step "Deploying to target..."
    bun run deploy-skill.ts "$DEPLOY" --target-dir "$TARGET_DIR" || { write_failure "Deployment failed"; exit 1; }
    write_success "Deployed to: $DEPLOY (target: $TARGET_DIR)"
fi

# Summary
BUILD_END=$(date +%s)
DURATION=$((BUILD_END - BUILD_START))

echo -e ""
echo -e "${GREEN}+============================================================+${NC}"
echo -e "${GREEN}|                    BUILD SUCCESSFUL                        |${NC}"
echo -e "${GREEN}+============================================================+${NC}"
echo -e ""
echo -e "  Duration: $DURATION seconds"
echo -e ""
echo -e "  Artifacts:"
[ -f "$DIST_DIR/adviser.exe" ] && echo -e "    * adviser.exe (Windows x64)"
[ -f "$DIST_DIR/adviser" ] && echo -e "    * adviser (Linux x64)"
echo -e ""
echo -e "  Output Directory:"
echo -e "    $DIST_DIR"
echo -e ""
echo -e "  Next Steps:"
echo -e "    Deploy:  ./build.sh --deploy <target-project-path>"
echo -e "    Test:    ./skills/adviser/dist/adviser --help"
echo -e ""
