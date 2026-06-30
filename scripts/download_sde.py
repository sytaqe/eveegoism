# SPDX-License-Identifier: CC0-1.0
# This file is released into the public domain under the CC0 1.0 Universal license.
#
# Downloads the official EVE Online SDE (JSONL variant) and produces:
#   public/data/ship_meta.json   — { typeId: metaGroupId } for non-T1 types
#   public/data/ship_groups.json — { typeId: groupId } for all published types
#   public/data/cloaky_types.json — [typeId, ...] for cloaky-capable ships
#
# See: https://developers.eveonline.com/docs/services/static-data/
#
# metaGroupId values:
#   1 = Tech I (omitted from ship_meta.json)
#   2 = Tech II
#   3 = Storyline
#   4 = Faction
#   5 = Officer
#   6 = Deadspace

import io
import json
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

SDE_VERSION_URL = "https://developers.eveonline.com/static-data/tranquility/latest.jsonl"
SDE_URL = "https://developers.eveonline.com/static-data/eve-online-static-data-latest-jsonl.zip"
OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data"
VERSION_FILE = OUTPUT_DIR / "sde_version.json"
OUTPUT_FILES = ["ship_meta.json", "ship_groups.json", "cloaky_types.json"]

# Group names that confer cloaky status (case-insensitive substring match)
CLOAKY_GROUP_NAMES = {
    "force recon ship",
    "expedition command ship",
    "black ops",
    "strategic cruiser",
    "covert ops",
}

# Individual ship names that confer cloaky status
CLOAKY_SHIP_NAMES = {
    "cenotaph",
    "stratios",
    "tholos",
    "astero",
}


def fetch_latest_build():
    with urllib.request.urlopen(SDE_VERSION_URL, timeout=10) as resp:
        for line in resp.read().decode().splitlines():
            entry = json.loads(line)
            if entry.get("_key") == "sde":
                return str(entry["buildNumber"])
    raise RuntimeError("Could not find sde build number in latest.jsonl")


def load_cached_build():
    if VERSION_FILE.exists():
        return json.loads(VERSION_FILE.read_text(encoding="utf-8")).get("buildNumber")
    return None


def save_cached_build(build):
    VERSION_FILE.write_text(json.dumps({"buildNumber": build}), encoding="utf-8")


def find_entry(zf, target):
    for info in zf.infolist():
        if info.filename == target or info.filename.endswith("/" + target):
            return info
    return None


def read_jsonl(zf, target):
    entry = find_entry(zf, target)
    if entry is None:
        print(f"ERROR: {target} not found in zip.", file=sys.stderr)
        sys.exit(1)
    rows = []
    with zf.open(entry) as f:
        for line in io.TextIOWrapper(f, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if "_meta" not in row:
                rows.append(row)
    return rows


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Checking latest SDE build number...")
    latest = fetch_latest_build()
    cached = load_cached_build()
    files_present = all((OUTPUT_DIR / f).exists() for f in OUTPUT_FILES)

    if cached == latest and files_present:
        print(f"SDE is up to date (build {latest}). Nothing to do.")
        return

    if cached:
        print(f"New SDE build available: {cached} → {latest}")
    else:
        print(f"No cached SDE found. Downloading build {latest}.")

    print(f"Downloading SDE from {SDE_URL} ...")
    with tempfile.TemporaryFile() as tmp:
        with urllib.request.urlopen(SDE_URL) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            chunk = 1 << 20
            while True:
                block = resp.read(chunk)
                if not block:
                    break
                tmp.write(block)
                downloaded += len(block)
                if total:
                    pct = downloaded * 100 // total
                    print(f"\r  {downloaded // (1 << 20)} / {total // (1 << 20)} MB ({pct}%)", end="", flush=True)
        print()

        tmp.seek(0)
        with zipfile.ZipFile(tmp) as zf:
            # Build cloaky group ID set from groups.jsonl
            print("Reading groups.jsonl ...")
            cloaky_group_ids = set()
            matched_group_names = set()
            for row in read_jsonl(zf, "groups.jsonl"):
                group_id = row.get("_key") or row.get("groupID")
                name_field = row.get("name", {})
                name = (name_field.get("en") if isinstance(name_field, dict) else name_field) or ""
                if name.lower() in CLOAKY_GROUP_NAMES:
                    cloaky_group_ids.add(int(group_id))
                    matched_group_names.add(name)
            print(f"  Cloaky groups found: {matched_group_names} → IDs {cloaky_group_ids}")

            unmatched = CLOAKY_GROUP_NAMES - {n.lower() for n in matched_group_names}
            if unmatched:
                print(f"  WARNING: group names not found in SDE: {unmatched}", file=sys.stderr)

            # Process types.jsonl
            print("Reading types.jsonl ...")
            meta = {}
            groups = {}
            cloaky_types = []
            for row in read_jsonl(zf, "types.jsonl"):
                type_id = row.get("_key") or row.get("typeID")
                if type_id is None:
                    continue
                type_id = int(type_id)

                meta_group_id = row.get("metaGroupID")
                if meta_group_id is not None and int(meta_group_id) != 1:
                    meta[type_id] = int(meta_group_id)

                group_id = row.get("groupID")
                if group_id is not None and row.get("published", True):
                    groups[type_id] = int(group_id)

                # Cloaky: by group
                if group_id is not None and int(group_id) in cloaky_group_ids:
                    cloaky_types.append(type_id)
                    continue

                # Cloaky: by ship name
                name_field = row.get("name", {})
                name = (name_field.get("en") if isinstance(name_field, dict) else name_field) or ""
                if name.lower() in CLOAKY_SHIP_NAMES:
                    cloaky_types.append(type_id)

    out = OUTPUT_DIR / "ship_meta.json"
    out.write_text(json.dumps(meta, separators=(",", ":")), encoding="utf-8")
    print(f"Written {len(meta)} non-T1 entries to {out}")

    out = OUTPUT_DIR / "ship_groups.json"
    out.write_text(json.dumps(groups, separators=(",", ":")), encoding="utf-8")
    print(f"Written {len(groups)} group entries to {out}")

    out = OUTPUT_DIR / "cloaky_types.json"
    out.write_text(json.dumps(sorted(set(cloaky_types)), separators=(",", ":")), encoding="utf-8")
    print(f"Written {len(set(cloaky_types))} cloaky type IDs to {out}")

    save_cached_build(latest)
    print(f"SDE build {latest} cached.")


if __name__ == "__main__":
    main()
