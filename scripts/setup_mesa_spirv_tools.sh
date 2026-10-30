#!/usr/bin/env bash
# Build the static host-side SPIRV-Tools required by Mesa's CLC compiler.
# Homebrew's spirv-tools formula explicitly disables static libraries.
set -euo pipefail

command -v brew >/dev/null
command -v cmake >/dev/null
command -v git >/dev/null
command -v pkg-config >/dev/null
brew --prefix spirv-headers >/dev/null
brew --prefix spirv-tools >/dev/null

version="$(brew list --versions spirv-tools | awk 'NR == 1 {print $2}')"
if [[ -z "$version" ]]; then
    echo "::error::Could not determine the installed Homebrew SPIRV-Tools version"
    exit 1
fi

base="${RUNNER_TEMP:-/tmp}/utm-mesa-spirv-tools"
src="$base/src"
build="$base/build"
prefix="$base/install"
mkdir -p "$base"
if [[ ! -f "$src/CMakeLists.txt" ]]; then
    git clone --depth 1 --branch "vulkan-sdk-$version" \
        https://github.com/KhronosGroup/SPIRV-Tools.git "$src"
fi

cmake -S "$src" -B "$build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_INSTALL_PREFIX="$prefix" \
    -DCMAKE_INSTALL_LIBDIR=lib \
    -DBUILD_SHARED_LIBS=OFF \
    -DSPIRV_TOOLS_BUILD_STATIC=ON \
    -DSPIRV_SKIP_TESTS=ON \
    -DSPIRV_SKIP_EXECUTABLES=ON \
    -DSPIRV_WERROR=OFF \
    -DSPIRV-Headers_SOURCE_DIR="$(brew --prefix spirv-headers)"

cmake --build "$build" --parallel 3
cmake --install "$build"

if [[ ! -f "$prefix/lib/libSPIRV-Tools.a" ]]; then
    echo "::error::Static libSPIRV-Tools.a was not produced"
    exit 1
fi
if [[ ! -f "$prefix/lib/pkgconfig/SPIRV-Tools.pc" ]]; then
    echo "::error::SPIRV-Tools.pc was not installed"
    exit 1
fi
export PKG_CONFIG_PATH="$prefix/lib/pkgconfig${PKG_CONFIG_PATH:+:$PKG_CONFIG_PATH}"
pkg-config --print-errors --exists "SPIRV-Tools >= 2024.1"
pkg-config --modversion SPIRV-Tools
pkg-config --static --libs SPIRV-Tools
echo "Static SPIRV-Tools prepared at $prefix"
if [[ -n "${GITHUB_ENV:-}" ]]; then
    printf 'MESA_HOST_SPIRV_TOOLS_PREFIX=%s\n' "$prefix" >> "$GITHUB_ENV"
fi
