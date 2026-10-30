#!/usr/bin/env python3
"""Static smoke checks for the MaxRAM source-build configuration.

These do not replace Xcode compilation or testing on a physical iPad.
"""
from pathlib import Path

root = Path(__file__).resolve().parents[1]
system = (root / "Configuration/UTMQemuConfigurationSystem.swift").read_text()
arguments = (root / "Configuration/UTMQemuConfiguration+Arguments.swift").read_text()
view = (root / "Platform/Shared/VMConfigSystemView.swift").read_text()

checks = {
    "automatic cache resolver": "var effectiveJitCacheSize: Int" in system,
    "64-MiB x86 iOS cap": "return min(64, max(16, memorySize / 4))" in system,
    "explicit JIT setting retained": "if jitCacheSize > 0" in system,
    "QEMU uses effective cache": "let tbSize = system.effectiveJitCacheSize" in arguments,
    "QEMU passes cache to TCG": '"tb-size=\\(tbSize)"' in arguments,
    "preset 8 vCPU": "config.cpuCount = 8" in view,
    "preset 4 GiB RAM": "config.memorySize = 4096" in view,
    "preset 64 MiB JIT": "config.jitCacheSize = 64" in view,
    "preset enables multicore": "config.isForceMulticore = true" in view,
    "warning estimates effective cache": "let actualJitSizeMib = config.effectiveJitCacheSize" in view,
}
for label, passed in checks.items():
    print(f"{'PASS' if passed else 'FAIL'}: {label}")
if not all(checks.values()):
    raise SystemExit(1)
print("Source checks passed; device-level stability is not tested.")
