# UTM MaxRAM 8C / 4 GiB — experimental iOS build

This branch is a **source-modified UTM build** for iPadOS and LiveContainer + JIT, not a patched copy of a stock IPA.

## Changes

- On iOS x86 / x86-64 guests, automatic QEMU TCG JIT cache is capped at 64 MiB instead of 25% of guest RAM. Explicit cache values still work.
- The **UTM MaxRAM (Experimental)** button in System settings sets 8 vCPUs, 4096 MiB guest RAM, 64 MiB JIT cache and enables Force Multicore.
- The memory-warning estimator uses the same effective JIT cache setting that gets passed to QEMU.
- The dedicated GitHub Actions workflow builds the modified Swift/QEMU frontend from this fork on macOS and produces an **unsigned** LiveContainer-compatible IPA artifact.

## Build

GitHub Actions > **UTM MaxRAM source IPA**. The branch has a push trigger; manual workflow dispatch may require the workflow to exist on the default branch.

The artifact is named `UTM-MaxRAM-8C-4G-LiveContainer`. Download it from the workflow run when successful and sign/import as required by your LiveContainer workflow. It is **not a signed App Store IPA**.

## Important limitations

1. 8 guest vCPUs on ARM-hosted x86-64 QEMU TCG are emulated, not 8 hardware-accelerated x86 CPU cores. Force Multicore is experimental and may hang or misbehave.
2. A physical 8-GB iPad does not imply a 4-GB guest fits inside the iPadOS per-process memory limit. JIT mappings, video, device state, LiveContainer overhead, page tables and iOS limits all contribute to resource usage. `increased-memory-limit` entitlement must be available and honored by the actual signing path; editing entitlements alone cannot grant it.
3. Smaller JIT cache reduces memory pressure but can reduce performance. It does not repair unrelated graphics/firmware/guest-driver black screens.
4. Neither a green CI build nor the included source smoke tests prove successful boot or stability on the target iPad. Test with a duplicate VM and inspect QEMU/iPadOS logs if the VM fails.
5. Removing the iOSHelper extension for LiveContainer can make qemu-img and some disk tools unavailable on newer iOS versions.

## First-device test

Before first attempt, **back up the VM**. Ensure JIT is active. Start with a known-working 2-vCPU/2048-MiB profile. Then duplicate it, try 4 vCPU / 3072 MiB / 64 MiB JIT; finally apply 8 vCPU / 4096 MiB / 64 MiB JIT in the duplicate. If the high profile fails, try 1 vCPU / 4096 MiB to isolate memory issues from multicore TCG. Inspect crash jetsam logs if the process is terminated.

The generated binary has not been tested on any physical iPad at the time these changes were committed.
