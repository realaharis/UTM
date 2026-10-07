# UTM 5.0.5 — iPadOS 27 JIT kit

This branch is built specifically for the iPadOS 27 JIT path used by UTM 5.0.5 on Apple Silicon iPads.

## What is in the artifact

- `UTM-5.0.5-iPadOS27-JIT.ipa` — unsigned/fakesigned UTM build with JIT entitlements.
- `utm-ipados27.js` — StikDebug script matched to the QEMU breakpoint protocol in this UTM build.
- This README.

## Required setup

The installed UTM build must retain `get-task-allow` and `dynamic-codesigning`. Developer Mode must be enabled. StikDebug must be able to attach to the running UTM process.

If UTM is launched inside LiveContainer, enable **Use LiveContainer's Bundle ID** in StikDebug before requesting JIT.

## Launch order

1. Install and open the patched UTM IPA.
2. Do **not** start the VM yet.
3. Import/select `utm-ipados27.js` in StikDebug.
4. Select the running UTM process and enable JIT with that script.
5. Return to UTM and start the VM.
6. The script waits for QEMU's executable-memory breakpoint, prepares the RX region for TXM/SPTM, advances past the breakpoint, and detaches.

For this build, use `utm-ipados27.js`; do not substitute `universal.js`. UTM 5.0.5's bundled QEMU uses the older single `BRK 0x69` preparation hook, so the matching legacy-style script is intentional.
