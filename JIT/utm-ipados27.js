// UTM 5.0.5 / iPadOS 27 StikDebug JIT bridge
// Matches the legacy QEMU iOS 26+ breakpoint protocol used by this UTM tag.
// StikDebug runtime API expected: get_pid(), send_command(), prepare_memory_region(), log().

const EXPECTED_BRK = 0x69;
const MAX_STOPS = 64;

function leHexToBigInt(hex) {
    if (!hex || (hex.length % 2) !== 0) {
        throw new Error("invalid little-endian hex value");
    }
    let value = 0n;
    for (let i = hex.length - 2; i >= 0; i -= 2) {
        value = (value << 8n) | BigInt(parseInt(hex.slice(i, i + 2), 16));
    }
    return value;
}

function bigIntToLe64(value) {
    let v = BigInt(value);
    const out = [];
    for (let i = 0; i < 8; i++) {
        out.push(Number(v & 0xffn).toString(16).padStart(2, "0"));
        v >>= 8n;
    }
    return out.join("");
}

function leU32(hex) {
    if (!hex || hex.length !== 8) {
        throw new Error("invalid 32-bit instruction");
    }
    const b0 = parseInt(hex.slice(0, 2), 16);
    const b1 = parseInt(hex.slice(2, 4), 16);
    const b2 = parseInt(hex.slice(4, 6), 16);
    const b3 = parseInt(hex.slice(6, 8), 16);
    return ((b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0);
}

function brkImmediate(instruction) {
    return (instruction >>> 5) & 0xffff;
}

function registerHex(stop, reg) {
    const re = new RegExp(reg + ":(?<value>[0-9a-fA-F]{16});");
    const match = re.exec(stop);
    return match && match.groups ? match.groups.value : null;
}

function threadId(stop) {
    const match = /T[0-9a-fA-F]+thread:(?<tid>[0-9a-fA-F]+);/.exec(stop);
    return match && match.groups ? match.groups.tid : null;
}

function main() {
    const pid = get_pid();
    log("[UTM-iPadOS27] attaching to pid " + pid);

    const attach = send_command("vAttach;" + pid.toString(16));
    log("[UTM-iPadOS27] attach: " + attach);

    for (let stopIndex = 1; stopIndex <= MAX_STOPS; stopIndex++) {
        const stop = send_command("c");
        const tid = threadId(stop);
        const pcHex = registerHex(stop, "20");

        if (!tid || !pcHex) {
            log("[UTM-iPadOS27] stop " + stopIndex + " has no thread/pc; continuing");
            continue;
        }

        const pc = leHexToBigInt(pcHex);
        const encoded = send_command("m" + pc.toString(16) + ",4");

        if (!encoded || encoded.length < 8) {
            log("[UTM-iPadOS27] could not read instruction at 0x" + pc.toString(16));
            continue;
        }

        const instruction = leU32(encoded.slice(0, 8));
        const immediate = brkImmediate(instruction);

        if (immediate !== EXPECTED_BRK) {
            log("[UTM-iPadOS27] ignoring BRK 0x" + immediate.toString(16));
            continue;
        }

        const x0Hex = registerHex(stop, "00");
        const x1Hex = registerHex(stop, "01");
        if (!x0Hex || !x1Hex) {
            throw new Error("UTM JIT breakpoint did not expose x0/x1");
        }

        const address = leHexToBigInt(x0Hex);
        const length = leHexToBigInt(x1Hex);
        if (address === 0n || length === 0n) {
            throw new Error("UTM JIT region is empty");
        }

        log("[UTM-iPadOS27] preparing RX region 0x" +
            address.toString(16) + " length 0x" + length.toString(16));

        const prepared = prepare_memory_region(address, length);
        log("[UTM-iPadOS27] prepare_memory_region: " + prepared);

        const nextPc = bigIntToLe64(pc + 4n);
        const advance = send_command("P20=" + nextPc + ";thread:" + tid + ";");
        log("[UTM-iPadOS27] advanced PC: " + advance);

        const detach = send_command("D");
        log("[UTM-iPadOS27] detached: " + detach);
        log("[UTM-iPadOS27] JIT region prepared successfully");
        return;
    }

    try {
        send_command("D");
    } catch (_) {
    }
    throw new Error("UTM JIT breakpoint 0x69 was not observed");
}

main();
