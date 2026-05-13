#!/usr/bin/env python3
"""Generate simple placeholder icons for BureauBuddy extension."""

import struct, zlib, math

def png(size, bg, text_char="B"):
    """Create a minimal PNG with a colored square and letter."""
    w = h = size
    raw = b""
    for y in range(h):
        raw += b"\x00"
        for x in range(w):
            # Rounded square background
            margin = size * 0.12
            in_square = margin < x < w - margin and margin < y < h - margin
            r = size * 0.22
            # Simple circle for the logo mark
            cx, cy = w / 2, h / 2
            dist = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            if in_square:
                raw += bytes(bg) + b"\xff"
            else:
                raw += b"\x00\x00\x00\x00"  # transparent

    def chunk(name, data):
        c = zlib.crc32(name + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + name + data + struct.pack(">I", c)

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)  # RGB... wait need RGBA
    # Fix: use color type 6 = RGBA
    ihdr = struct.pack(">II", w, h) + bytes([8, 6, 0, 0, 0])

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr_chunk = chunk(b"IHDR", ihdr)
    idat_chunk = chunk(b"IDAT", zlib.compress(raw))
    iend_chunk = chunk(b"IEND", b"")
    return sig + ihdr_chunk + idat_chunk + iend_chunk

# Generate icons at required sizes
import os
os.makedirs("icons", exist_ok=True)

PURPLE = [60, 52, 137]  # #3C3489

for size in [16, 48, 128]:
    data = png(size, PURPLE)
    with open(f"icons/icon{size}.png", "wb") as f:
        f.write(data)
    print(f"Generated icons/icon{size}.png ({len(data)} bytes)")

print("Icons generated.")
