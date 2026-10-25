#!/usr/bin/env python3
"""Repackage a UTM IPA without the iOSHelper extension for LiveContainer."""
import argparse
import plistlib
import zipfile
from pathlib import Path

def patch(source_path: Path, destination_path: Path):
    if source_path.resolve() == destination_path.resolve():
        raise ValueError("Input and output paths must differ")
    with zipfile.ZipFile(source_path) as src:
        names = src.namelist()
        apps = [n for n in names if n.startswith("Payload/") and n.count("/") == 2 and n.endswith(".app/Info.plist")]
        if len(apps) != 1:
            raise ValueError("Expected exactly one Payload/*.app/Info.plist")
        app_prefix = apps[0][:-len("Info.plist")]
        bundle_id = plistlib.loads(src.read(apps[0])).get("CFBundleIdentifier")
        if bundle_id not in ("com.utmapp.UTM", "com.utmapp.UTM-SE"):
            raise ValueError(f"Unexpected app bundle ID: {bundle_id}")
        helper_prefixes = tuple(app_prefix + folder + "/" + name + "/" for folder in ("PlugIns", "Extensions") for name in ("iOSHelper.appex", "iOSHelper-SE.appex"))
        matched = [p for p in helper_prefixes if any(n.startswith(p) for n in names)]
        if not matched:
            raise ValueError("iOSHelper extension not found in IPA")
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(destination_path, "w") as dst:
            for info in src.infolist():
                if not info.filename.startswith(tuple(matched)):
                    dst.writestr(info, src.read(info.filename))
    with zipfile.ZipFile(destination_path) as verify:
        if verify.testzip() is not None or any(n.startswith(tuple(matched)) for n in verify.namelist()):
            raise ValueError("Output IPA verification failed")
    print(f"Created {destination_path}. Removed: {', '.join(matched)}")
    print("Note: IPA may require re-signing. Disk helper features may not work.")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path)
    p.add_argument("output", type=Path)
    a = p.parse_args()
    patch(a.input, a.output)
