#!/usr/bin/env python3
"""
generate_demo_gif.py
Pure-Python animated GIF generator for VocabVault root graph simulation demo.
Zero external dependencies. Generates crisp, high-contrast animated GIF.
"""

import math
import os
import struct

WIDTH = 480
HEIGHT = 320
NUM_FRAMES = 36
FRAME_DELAY = 6  # 6/100 sec = ~16.6 fps

# Color Palette (256 colors maximum)
PALETTE = [
    0x0F, 0x17, 0x2A,  # 0: Background dark slate (#0f172a)
    0x1E, 0x29, 0x3B,  # 1: Card container (#1e293b)
    0x33, 0x41, 0x55,  # 2: Subtle edge line (#334155)
    0x63, 0x66, 0xF1,  # 3: Primary Indigo (#6366f1)
    0x8B, 0x5C, 0xF6,  # 4: Root Node Violet (#8b5cf6)
    0x06, 0xB6, 0xD4,  # 5: Modern Cyan (#06b6d4)
    0x10, 0xB9, 0x81,  # 6: Mastered Emerald (#10b981)
    0xF5, 0x9E, 0x0B,  # 7: Amber Review (#f59e0b)
    0xEC, 0x48, 0x99,  # 8: Rose Accent (#ec4899)
    0xF8, 0xFA, 0xFC,  # 9: White text/glow (#f8fafc)
    0x94, 0xA3, 0xB8,  # 10: Slate text (#94a3b8)
    0x47, 0x55, 0x69,  # 11: Dark Slate border (#475569)
    0xC0, 0x84, 0xFC,  # 12: Light Violet glow (#c084fc)
    0x67, 0xE8, 0xF9,  # 13: Light Cyan glow (#67e8f9)
    0x34, 0xD3, 0x99,  # 14: Light Emerald glow (#34d399)
    0x1E, 0x1B, 0x4B,  # 15: Deep Root Base (#1e1b4b)
]
# Pad palette to 256 colors
PALETTE += [0] * (256 * 3 - len(PALETTE))


def lzw_compress(data):
    min_code_size = 8
    clear_code = 1 << min_code_size
    eoi_code = clear_code + 1

    cur_code_size = min_code_size + 1
    dict_size = eoi_code + 1
    code_table = {bytes([i]): i for i in range(clear_code)}

    bits = 0
    bit_count = 0
    output_bytes = bytearray()

    def put_bits(code, nbits):
        nonlocal bits, bit_count, output_bytes
        bits |= code << bit_count
        bit_count += nbits
        while bit_count >= 8:
            output_bytes.append(bits & 0xFF)
            bits >>= 8
            bit_count -= 8

    put_bits(clear_code, cur_code_size)

    prefix = b""
    for byte_val in data:
        c = bytes([byte_val])
        pc = prefix + c
        if pc in code_table:
            prefix = pc
        else:
            put_bits(code_table[prefix], cur_code_size)
            if dict_size < 4096:
                code_table[pc] = dict_size
                dict_size += 1
                if dict_size > (1 << cur_code_size) and cur_code_size < 12:
                    cur_code_size += 1
            else:
                put_bits(clear_code, cur_code_size)
                cur_code_size = min_code_size + 1
                dict_size = eoi_code + 1
                code_table = {bytes([i]): i for i in range(clear_code)}
            prefix = c
    if prefix:
        put_bits(code_table[prefix], cur_code_size)
    put_bits(eoi_code, cur_code_size)
    if bit_count > 0:
        output_bytes.append(bits & 0xFF)

    blocks = bytearray([min_code_size])
    pos = 0
    while pos < len(output_bytes):
        chunk = output_bytes[pos : pos + 255]
        blocks.append(len(chunk))
        blocks.extend(chunk)
        pos += len(chunk)
    blocks.append(0)
    return blocks


def save_animated_gif(filename, width, height, frames):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "wb") as f:
        f.write(b"GIF89a")
        f.write(struct.pack("<HH", width, height))
        f.write(bytes([0xF7, 0, 0]))
        f.write(bytearray(PALETTE))
        f.write(b"\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00")

        for delay, pixels in frames:
            f.write(b"\x21\xF9\x04")
            f.write(bytes([0x00]))
            f.write(struct.pack("<H", delay))
            f.write(bytes([0, 0]))
            f.write(b"\x2C")
            f.write(struct.pack("<HHHH", 0, 0, width, height))
            f.write(bytes([0x00]))
            f.write(lzw_compress(pixels))

        f.write(b"\x3B")


class FrameBuffer:

    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.buf = bytearray([0] * (w * h))

    def set_pixel(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            self.buf[y * self.w + x] = c

    def draw_line(self, x0, y0, x1, y1, c):
        x0, y0, x1, y1 = int(x0), int(y0), int(x1), int(y1)
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy
        while True:
            self.set_pixel(x0, y0, c)
            if x0 == x1 and y0 == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x0 += sx
            if e2 < dx:
                err += dx
                y0 += sy

    def fill_circle(self, cx, cy, r, c):
        cx, cy, r = int(cx), int(cy), int(r)
        for y in range(-r, r + 1):
            for x in range(-r, r + 1):
                if x * x + y * y <= r * r:
                    self.set_pixel(cx + x, cy + y, c)

    def draw_circle_outline(self, cx, cy, r, c):
        cx, cy, r = int(cx), int(cy), int(r)
        for deg in range(0, 360, 4):
            rad = math.radians(deg)
            x = int(cx + r * math.cos(rad))
            y = int(cy + r * math.sin(rad))
            self.set_pixel(x, y, c)

    def draw_badge(self, x, y, text_len, c_bg, c_border):
        # Mini rounded badge representation
        bx = int(x - text_len * 3)
        by = int(y - 5)
        bw = int(text_len * 6)
        bh = 10
        for py in range(by, by + bh):
            for px in range(bx, bx + bw):
                self.set_pixel(px, py, c_bg)
        # Border
        for px in range(bx, bx + bw):
            self.set_pixel(px, by, c_border)
            self.set_pixel(px, by + bh - 1, c_border)
        for py in range(by, by + bh):
            self.set_pixel(bx, py, c_border)
            self.set_pixel(bx + bw - 1, py, c_border)


def render_all_frames():
    frames = []

    # Nodes definition: PIE root at center, children around it
    children = [
        {
            "name": "differ",
            "angle": 0.0,
            "dist": 110,
            "color": 5,
            "badge_color": 13,
            "size": 14,
        },
        {
            "name": "prefer",
            "angle": 0.9,
            "dist": 125,
            "color": 6,
            "badge_color": 14,
            "size": 13,
        },
        {
            "name": "transfer",
            "angle": 1.9,
            "dist": 135,
            "color": 5,
            "badge_color": 13,
            "size": 15,
        },
        {
            "name": "bear",
            "angle": 2.8,
            "dist": 95,
            "color": 7,
            "badge_color": 9,
            "size": 12,
        },
        {
            "name": "bring",
            "angle": 3.7,
            "dist": 115,
            "color": 6,
            "badge_color": 14,
            "size": 12,
        },
        {
            "name": "infer",
            "angle": 4.6,
            "dist": 120,
            "color": 5,
            "badge_color": 13,
            "size": 13,
        },
        {
            "name": "suffer",
            "angle": 5.5,
            "dist": 105,
            "color": 8,
            "badge_color": 9,
            "size": 13,
        },
    ]

    for frame_idx in range(NUM_FRAMES):
        fb = FrameBuffer(WIDTH, HEIGHT)
        phase = (frame_idx / NUM_FRAMES) * 2 * math.pi

        # Center root node with gentle floating motion
        root_x = (WIDTH / 2) + 6 * math.sin(phase)
        root_y = (HEIGHT / 2) + 4 * math.cos(phase)

        # Draw decorative grid / subtle backdrop
        for gx in range(40, WIDTH, 80):
            for gy in range(40, HEIGHT, 80):
                fb.set_pixel(gx, gy, 1)

        # Calculate child positions with spring dynamics
        child_coords = []
        for i, child in enumerate(children):
            # Dynamic angle and distance oscillation (harmonic spring simulation)
            ang = child["angle"] + 0.12 * math.sin(phase + i * 0.8)
            dist = child["dist"] + 8 * math.cos(phase + i * 1.1)
            cx = root_x + dist * math.cos(ang)
            cy = root_y + dist * math.sin(ang)
            child_coords.append((cx, cy, child))

        # 1. Draw spring edges from Root to Children
        for cx, cy, child in child_coords:
            fb.draw_line(root_x, root_y, cx, cy, 2)
            # Flowing pulse along edge (traveling photon)
            t_pulse = (phase * 1.5 + child["angle"]) % (2 * math.pi)
            pulse_ratio = t_pulse / (2 * math.pi)
            px = root_x + (cx - root_x) * pulse_ratio
            py = root_y + (cy - root_y) * pulse_ratio
            fb.fill_circle(px, py, 2, 9)

        # 2. Draw cross-links between related prefixes (e.g., differ <-> prefer, infer <-> suffer)
        fb.draw_line(
            child_coords[0][0],
            child_coords[0][1],
            child_coords[1][0],
            child_coords[1][1],
            1,
        )
        fb.draw_line(
            child_coords[5][0],
            child_coords[5][1],
            child_coords[6][0],
            child_coords[6][1],
            1,
        )

        # 3. Draw PIE Root Node (Glowing central core)
        root_radius = 24 + 2 * math.sin(phase * 2)
        # Outer glow ring
        fb.draw_circle_outline(root_x, root_y, root_radius + 4, 12)
        # Core body
        fb.fill_circle(root_x, root_y, root_radius, 4)
        # Inner highlight
        fb.fill_circle(root_x - 4, root_y - 4, 7, 12)
        # Label representation badge
        fb.draw_badge(root_x, root_y + 2, 6, 15, 9)

        # 4. Draw Child Word Nodes
        for cx, cy, child in child_coords:
            r = child["size"]
            # Shadow / glow
            fb.draw_circle_outline(cx, cy, r + 2, child["badge_color"])
            # Body
            fb.fill_circle(cx, cy, r, child["color"])
            # Center bright dot
            fb.fill_circle(cx, cy, 3, 9)
            # Label banner below node
            fb.draw_badge(cx, cy + r + 6, len(child["name"]), 1, 10)

        # 5. Header Overlay HUD: "VocabVault Etymology Physics Engine [FSRS Live]"
        fb.draw_badge(75, 18, 18, 1, 3)
        fb.draw_badge(WIDTH - 50, 18, 10, 1, 6)

        frames.append((FRAME_DELAY, fb.buf))

    return frames


if __name__ == "__main__":
    print(f"Generating {NUM_FRAMES} frames of animated root graph demo...")
    frames = render_all_frames()

    dest1 = "assets/demo-root-graph.gif"
    dest2 = "vocab-vault-web/assets/demo-root-graph.gif"

    save_animated_gif(dest1, WIDTH, HEIGHT, frames)
    save_animated_gif(dest2, WIDTH, HEIGHT, frames)

    sz1 = os.path.getsize(dest1)
    print(f"Demo GIF created successfully: {dest1} ({sz1:,} bytes)")
    print(f"Synced to {dest2}")
