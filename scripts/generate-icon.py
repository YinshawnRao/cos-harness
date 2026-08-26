from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

SIZE = 1024


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def mix(c0: tuple[int, int, int], c1: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c0[0], c1[0], t)),
        int(lerp(c0[1], c1[1], t)),
        int(lerp(c0[2], c1[2], t)),
    )


def in_rounded_rect(x: float, y: float, w: float, h: float, r: float) -> bool:
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    if r <= 0:
        return True
    if r < x < w - r and r < y < h - r:
        return True
    cx = min(max(x, r), w - r)
    cy = min(max(y, r), h - r)
    if abs(x - cx) <= r and abs(y - cy) <= r:
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
    return (r <= x <= w - r) or (r <= y <= h - r)


def in_circle(x: float, y: float, cx: float, cy: float, r: float) -> bool:
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def in_bucket(x: float, y: float) -> bool:
    # Trapezoid body: top 262-762 at y=390, bottom 329-695 at y=886
    if y < 390 or y > 886:
        return False
    t = (y - 390) / (886 - 390)
    left = lerp(262, 329, t)
    right = lerp(762, 695, t)
    return left <= x <= right


def in_lid(x: float, y: float) -> bool:
    return 214 <= x <= 810 and 278 <= y <= 354


def in_handle(x: float, y: float) -> bool:
    return 454 <= x <= 570 and 246 <= y <= 298


def write_png(path: Path, pixels: bytes, width: int, height: int) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + pixels[y * stride : (y + 1) * stride]
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def render(size: int) -> bytes:
    scale = size / SIZE
    out = bytearray(size * size * 4)
    bg0, bg1 = (26, 51, 68), (13, 24, 32)
    bucket0, bucket1 = (154, 240, 226), (45, 183, 196)
    lid = (231, 255, 251)
    for py in range(size):
        for px in range(size):
            x = (px + 0.5) / scale
            y = (py + 0.5) / scale
            t = (x + y) / (2 * SIZE)
            if in_rounded_rect(x, y, SIZE, SIZE, 224):
                if in_handle(x, y) or in_circle(x, y, 760, 250, 28) or in_circle(x, y, 820, 310, 12):
                    color = lid if in_handle(x, y) else (126, 231, 214)
                elif in_lid(x, y):
                    color = mix(lid, bucket0, (y - 278) / 76)
                elif in_bucket(x, y):
                    color = mix(bucket0, bucket1, (y - 390) / 496)
                else:
                    color = mix(bg0, bg1, t)
                r, g, b = color
                a = 255
            else:
                r = g = b = a = 0
            i = (py * size + px) * 4
            out[i : i + 4] = bytes((r, g, b, a))
    return bytes(out)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "assets"
    root.mkdir(parents=True, exist_ok=True)
    write_png(root / "icon.png", render(512), 512, 512)
    write_png(root / "icon-1024.png", render(1024), 1024, 1024)
    print("wrote", root / "icon.png")


if __name__ == "__main__":
    main()
