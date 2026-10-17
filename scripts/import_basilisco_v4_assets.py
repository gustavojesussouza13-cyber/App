#!/usr/bin/env python3
"""Install the original approved Basilisco V4 atlas bytes ONLY.
Usage from repository root:
 python scripts/import_basilisco_v4_assets.py path/to/Basilisco_V4_Integracao_Experimental.zip
This script never modifies server, guilds, fortress 3D, or unrelated sprites.
"""
import hashlib
from pathlib import Path
import struct
import sys
from zipfile import ZipFile

APPROVED = {
    "basilisco_v4_frente.png": ("25cdd23f8d0e164671f09db69af07afdf64b5b0122504539a1a8ad2acde6e8a7", 960),
    "basilisco_v4_tras.png": ("07295899fea0618fda4145f999cff32f46b4a8648d316574a9d1a706565e5cdd", 960),
    "basilisco_v4_esquerda.png": ("9fe3ece3121b4e9c14384c906f03ac8195ffab7c2dcb62a499cc9ee4dfbf5475", 960),
    "basilisco_v4_direita.png": ("e6fb7c6c8709f4e307ae53c6d4894c74b7e1582732f86f934704905a7e1c7a03", 960),
    "basilisco_v4_acido_fx.png": ("b67f5e5b6b46786ea65d07b09724d672963b56763f5ea16d0fc704d3b2216714", 640),
}
PREFIX = "public/assets/creatures-v4/"
PNG_MAGIC = b"\x89PNG\r\n\x1a\n"


def check(name, data, checksum, height):
    if hashlib.sha256(data).hexdigest() != checksum:
        raise ValueError(f"Wrong sha256 for {name}. Do not replace the approved artwork.")
    if not data.startswith(PNG_MAGIC) or len(data) < 26:
        raise ValueError(f"{name} is not a valid PNG")
    width, actual_height = struct.unpack(">II", data[16:24])
    if (width, actual_height, data[24], data[25]) != (768, height, 8, 6):
        raise ValueError(f"Unexpected size, bit-depth or RGBA mode in {name}")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/import_basilisco_v4_assets.py <approved ZIP>")
    zip_path = Path(sys.argv[1])
    if not zip_path.is_file():
        raise SystemExit(f"File not found: {zip_path}")
    dest = Path(__file__).resolve().parents[1] / PREFIX
    # Verify all five inputs before writing any output.
    contents = {}
    with ZipFile(zip_path) as archive:
        for name, (sha, height) in APPROVED.items():
            data = archive.read(PREFIX + name)
            check(name, data, sha, height)
            contents[name] = data
    dest.mkdir(parents=True, exist_ok=True)
    for name, data in contents.items():
        p = dest / name
        p.write_bytes(data)
        print(f"OK {p.relative_to(dest.parents[2])}: {len(data)} bytes")
    print("Five approved Basilisco V4 PNG files installed without touching other systems.")


if __name__ == "__main__":
    main()
