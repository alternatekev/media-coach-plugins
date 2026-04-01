#!/usr/bin/env python3
"""
Procedural Mazda MX-5 ND (Miata) GLB generator.

Builds a recognizable low-poly MX-5 ND model using profile curves
extruded into a 3D mesh. The ND generation (2016+, iRacing MX-5 Cup):
  - Sharp "Kodo" design language front end
  - Swept-back headlights (no pop-ups)
  - Low aggressive hood line
  - Short windshield with tight rake
  - Low beltline with muscular haunches
  - Short rear deck / trunk
  - Wider stance than NA

Output: GLB with ~4000-6000 triangles, embedded PBR material.
License: Original work, no restrictions.
"""

import numpy as np
import struct
import json
import io

def generate_mx5_glb(output_path, color=(0.8, 0.1, 0.1)):
    """Generate a Mazda MX-5 NA model as GLB."""

    vertices = []
    indices = []
    normals = []

    def add_quad(v0, v1, v2, v3):
        """Add a quad as two triangles with computed normals."""
        base = len(vertices)
        e1 = np.array(v1) - np.array(v0)
        e2 = np.array(v2) - np.array(v0)
        n = np.cross(e1, e2)
        ln = np.linalg.norm(n)
        if ln > 1e-8:
            n = n / ln
        else:
            n = np.array([0, 1, 0])
        for v in [v0, v1, v2, v3]:
            vertices.append(v)
            normals.append(n.tolist())
        indices.extend([base, base+1, base+2, base, base+2, base+3])

    def add_tri(v0, v1, v2):
        base = len(vertices)
        e1 = np.array(v1) - np.array(v0)
        e2 = np.array(v2) - np.array(v0)
        n = np.cross(e1, e2)
        ln = np.linalg.norm(n)
        if ln > 1e-8:
            n = n / ln
        else:
            n = np.array([0, 1, 0])
        for v in [v0, v1, v2]:
            vertices.append(v)
            normals.append(n.tolist())
        indices.extend([base, base+1, base+2])

    # ── Car dimensions (meters, roughly 1:1 scale) ──────────────
    # MX-5 ND is about 3.91m long, 1.74m wide, 1.23m tall
    L = 3.91   # total length
    W = 1.74   # total width (wider than NA)
    H_body = 0.82  # body height (bottom of windshield)
    H_roof = 1.23  # roof peak (soft top when up)
    H_floor = 0.13 # ground clearance (lower than NA)
    HW = W / 2  # half width

    # ── Side profile points (x=forward, y=up) ──────────────────
    # Front bumper → hood → windshield → roof → rear deck → rear bumper
    # x=0 is front, x=L is rear

    # Body profile (lower edge of body side)
    body_bottom = [
        (0.00, H_floor + 0.22),   # front bumper bottom (aggressive chin)
        (0.15, H_floor + 0.10),   # front splitter
        (0.40, H_floor + 0.04),   # under bumper
        (0.90, H_floor),          # front wheel well
        (1.50, H_floor),          # floor
        (2.50, H_floor),          # mid floor
        (3.00, H_floor),          # rear wheel well
        (3.50, H_floor + 0.04),   # rear under
        (3.75, H_floor + 0.14),   # rear bumper
        (3.91, H_floor + 0.22),   # rear end
    ]

    # Body top profile (beltline / top of fender) - ND Kodo design
    body_top = [
        (0.00, 0.50),    # front bumper top (lower, more aggressive)
        (0.10, 0.56),    # front grille top
        (0.30, 0.64),    # hood front edge (sharper than NA)
        (0.50, 0.68),    # hood start
        (1.00, 0.70),    # hood mid (no pop-ups, smooth)
        (1.70, 0.72),    # hood rear / cowl
        (1.85, 0.72),    # windshield base
        (2.35, H_roof),  # windshield top / roof start (tighter rake)
        (2.60, H_roof),  # roof peak
        (2.85, 1.14),    # rear window top
        (3.10, 0.92),    # deck lid start
        (3.40, 0.80),    # deck lid mid
        (3.70, 0.72),    # tail
        (3.91, 0.62),    # rear end (lower, sportier)
    ]

    # ── Cross-section shape ────────────────────────────────────
    # The MX-5 has gently curved sides, wider at the bottom
    def cross_section(x, y_bot, y_top, hw_bot=None, hw_top=None):
        """Return points for one cross-section slice."""
        if hw_bot is None: hw_bot = HW
        if hw_top is None: hw_top = HW * 0.92  # slightly narrower at top
        # 5 points per side: bottom, lower body, mid, upper body, top
        frac_steps = [0, 0.25, 0.5, 0.75, 1.0]
        points = []
        for f in frac_steps:
            y = y_bot + (y_top - y_bot) * f
            # Width tapers from bottom to top
            hw = hw_bot + (hw_top - hw_bot) * f
            # Slight curvature: wider at 30% height
            bulge = 0.04 * np.sin(f * np.pi)
            points.append((x, y, hw + bulge))
        return points  # right side; mirror for left

    # ── Generate body shell ────────────────────────────────────
    # Sample along the length
    num_sections = 30
    x_positions = np.linspace(0, L, num_sections)

    def interp_profile(profile, x):
        """Interpolate y from profile at given x."""
        xs = [p[0] for p in profile]
        ys = [p[1] for p in profile]
        return np.interp(x, xs, ys)

    # Width varies along length — ND has muscular rear haunches
    def body_width(x):
        """Half-width at position x."""
        if x < 0.25:
            # Sharp narrow nose
            return HW * (0.48 + 0.52 * (x / 0.25))
        elif x < 0.5:
            return HW * (1.0 - 0.03 * ((0.5 - x) / 0.25))
        elif x > 3.5:
            # Taper at rear
            return HW * (1.0 - 0.12 * ((x - 3.5) / 0.41))
        elif 2.8 < x < 3.3:
            # Muscular rear haunches (wider at rear wheels)
            t = (x - 2.8) / 0.5
            return HW * (1.0 + 0.03 * np.sin(t * np.pi))
        else:
            return HW

    sections = []
    for x in x_positions:
        yb = interp_profile(body_bottom, x)
        yt = interp_profile(body_top, x)
        hw = body_width(x)
        hw_top = hw * 0.90
        cs = cross_section(x, yb, yt, hw, hw_top)
        sections.append(cs)

    # Connect adjacent sections with quads (right side)
    for i in range(len(sections) - 1):
        cs0 = sections[i]
        cs1 = sections[i + 1]
        for j in range(len(cs0) - 1):
            p0 = cs0[j]     # (x, y, z)
            p1 = cs0[j+1]
            p2 = cs1[j+1]
            p3 = cs1[j]
            # Right side
            add_quad(
                [p0[0], p0[1], p0[2]],
                [p1[0], p1[1], p1[2]],
                [p2[0], p2[1], p2[2]],
                [p3[0], p3[1], p3[2]],
            )
            # Left side (mirror z, reverse winding)
            add_quad(
                [p3[0], p3[1], -p3[2]],
                [p2[0], p2[1], -p2[2]],
                [p1[0], p1[1], -p1[2]],
                [p0[0], p0[1], -p0[2]],
            )

    # ── Hood (top surface) ─────────────────────────────────────
    # Connect the top points of left and right sides
    for i in range(len(sections) - 1):
        # Only for hood area (x < 1.95) and deck (x > 3.0)
        x0 = sections[i][-1][0]
        x1 = sections[i+1][-1][0]
        if (x0 < 1.95 and x1 < 1.95) or (x0 > 3.15 and x1 > 3.15):
            p0 = sections[i][-1]    # right top
            p1 = sections[i+1][-1]  # right top next
            # Hood quad spanning left to right
            add_quad(
                [p0[0], p0[1], -p0[2]],  # left
                [p0[0], p0[1], p0[2]],    # right
                [p1[0], p1[1], p1[2]],    # right next
                [p1[0], p1[1], -p1[2]],   # left next
            )

    # ── Windshield ─────────────────────────────────────────────
    # Find sections in windshield range (x ~1.95 to ~2.45)
    ws_indices = [i for i, s in enumerate(sections)
                  if 1.85 <= s[0][0] <= 2.55]
    if len(ws_indices) >= 2:
        for k in range(len(ws_indices) - 1):
            i = ws_indices[k]
            j = ws_indices[k + 1]
            p0 = sections[i][-1]
            p1 = sections[j][-1]
            add_quad(
                [p0[0], p0[1], -p0[2]],
                [p0[0], p0[1], p0[2]],
                [p1[0], p1[1], p1[2]],
                [p1[0], p1[1], -p1[2]],
            )

    # ── Roof section ───────────────────────────────────────────
    roof_indices = [i for i, s in enumerate(sections)
                    if 2.45 <= s[0][0] <= 3.15]
    if len(roof_indices) >= 2:
        for k in range(len(roof_indices) - 1):
            i = roof_indices[k]
            j = roof_indices[k + 1]
            p0 = sections[i][-1]
            p1 = sections[j][-1]
            add_quad(
                [p0[0], p0[1], -p0[2]],
                [p0[0], p0[1], p0[2]],
                [p1[0], p1[1], p1[2]],
                [p1[0], p1[1], -p1[2]],
            )

    # ── Underbody (flat) ───────────────────────────────────────
    for i in range(len(sections) - 1):
        p0 = sections[i][0]
        p1 = sections[i+1][0]
        add_quad(
            [p0[0], p0[1], p0[2]],
            [p0[0], p0[1], -p0[2]],
            [p1[0], p1[1], -p1[2]],
            [p1[0], p1[1], p1[2]],
        )

    # ── Front face ─────────────────────────────────────────────
    cs_front = sections[0]
    for j in range(len(cs_front) - 1):
        p0 = cs_front[j]
        p1 = cs_front[j+1]
        add_quad(
            [p0[0], p0[1], p0[2]],
            [p1[0], p1[1], p1[2]],
            [p1[0], p1[1], -p1[2]],
            [p0[0], p0[1], -p0[2]],
        )

    # ── Rear face ──────────────────────────────────────────────
    cs_rear = sections[-1]
    for j in range(len(cs_rear) - 1):
        p0 = cs_rear[j]
        p1 = cs_rear[j+1]
        add_quad(
            [p0[0], p0[1], -p0[2]],
            [p1[0], p1[1], -p1[2]],
            [p1[0], p1[1], p1[2]],
            [p0[0], p0[1], p0[2]],
        )

    # ── Headlight recesses (ND swept-back style) ─────────────────
    # Subtle triangular indentations on front fenders
    for side in [1, -1]:
        hx, hy, hz = 0.35, 0.60, side * 0.55
        # Small triangular accent (Kodo design cue)
        add_tri(
            [hx - 0.12, hy - 0.04, hz],
            [hx + 0.12, hy, hz],
            [hx, hy + 0.04, hz],
        )

    # ── Wheels (cylinders) ─────────────────────────────────────
    wheel_positions = [
        (0.85, H_floor + 0.02, HW + 0.02),   # front right
        (0.85, H_floor + 0.02, -(HW + 0.02)), # front left
        (3.10, H_floor + 0.02, HW + 0.02),    # rear right
        (3.10, H_floor + 0.02, -(HW + 0.02)), # rear left
    ]
    wheel_r = 0.28
    wheel_w = 0.18
    wheel_segs = 16

    for wx, wy, wz in wheel_positions:
        side = 1 if wz > 0 else -1
        # Cylinder
        for i in range(wheel_segs):
            a0 = 2 * np.pi * i / wheel_segs
            a1 = 2 * np.pi * (i + 1) / wheel_segs
            x0 = wx + wheel_r * np.cos(a0)
            y0 = wy + wheel_r * np.sin(a0)
            x1 = wx + wheel_r * np.cos(a1)
            y1 = wy + wheel_r * np.sin(a1)
            z_inner = wz - side * wheel_w / 2
            z_outer = wz + side * wheel_w / 2
            # Outer rim
            add_quad(
                [x0, y0, z_outer],
                [x1, y1, z_outer],
                [x1, y1, z_inner],
                [x0, y0, z_inner],
            )
            # Outer face (hub cap)
            add_tri(
                [wx, wy, z_outer],
                [x0, y0, z_outer],
                [x1, y1, z_outer],
            )
            # Inner face
            add_tri(
                [wx, wy, z_inner],
                [x1, y1, z_inner],
                [x0, y0, z_inner],
            )

    # ── Build GLB ──────────────────────────────────────────────
    pos_array = np.array(vertices, dtype=np.float32)
    norm_array = np.array(normals, dtype=np.float32)

    # Center the model (origin at center-bottom)
    center_x = L / 2
    center_z = 0
    pos_array[:, 0] -= center_x
    # Keep y as-is (ground at H_floor)

    if len(indices) <= 65535:
        idx_array = np.array(indices, dtype=np.uint16)
        idx_component_type = 5123  # UNSIGNED_SHORT
    else:
        idx_array = np.array(indices, dtype=np.uint32)
        idx_component_type = 5125  # UNSIGNED_INT

    pos_min = pos_array.min(axis=0).tolist()
    pos_max = pos_array.max(axis=0).tolist()

    # Build binary buffer
    idx_bytes = idx_array.tobytes()
    pos_bytes = pos_array.tobytes()
    norm_bytes = norm_array.tobytes()

    def pad4(data):
        r = len(data) % 4
        return data + b'\x00' * (4 - r) if r else data

    idx_padded = pad4(idx_bytes)
    pos_padded = pad4(pos_bytes)
    norm_padded = pad4(norm_bytes)

    buffer_data = idx_padded + pos_padded + norm_padded

    # glTF JSON
    gltf_json = {
        "asset": {"version": "2.0", "generator": "gen_mx5.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "MX5_NA"}],
        "meshes": [{
            "primitives": [{
                "attributes": {"POSITION": 1, "NORMAL": 2},
                "indices": 0,
                "material": 0,
                "mode": 4,  # TRIANGLES
            }],
            "name": "mx5_body",
        }],
        "materials": [{
            "pbrMetallicRoughness": {
                "baseColorFactor": [color[0], color[1], color[2], 1.0],
                "metallicFactor": 0.5,
                "roughnessFactor": 0.4,
            },
            "name": "carPaint",
        }],
        "accessors": [
            {  # indices
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": idx_component_type,
                "count": len(indices),
                "type": "SCALAR",
                "max": [int(idx_array.max())],
                "min": [int(idx_array.min())],
            },
            {  # positions
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5126,  # FLOAT
                "count": len(vertices),
                "type": "VEC3",
                "max": pos_max,
                "min": pos_min,
            },
            {  # normals
                "bufferView": 2,
                "byteOffset": 0,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(idx_bytes), "target": 34963},
            {"buffer": 0, "byteOffset": len(idx_padded), "byteLength": len(pos_bytes), "target": 34962, "byteStride": 12},
            {"buffer": 0, "byteOffset": len(idx_padded) + len(pos_padded), "byteLength": len(norm_bytes), "target": 34962, "byteStride": 12},
        ],
        "buffers": [{"byteLength": len(buffer_data)}],
    }

    # Encode JSON chunk
    json_str = json.dumps(gltf_json, separators=(',', ':'))
    # Pad to 4-byte alignment
    while len(json_str) % 4 != 0:
        json_str += ' '
    json_bytes = json_str.encode('utf-8')

    # GLB header + chunks
    total_length = 12 + 8 + len(json_bytes) + 8 + len(buffer_data)

    with open(output_path, 'wb') as f:
        # GLB header
        f.write(struct.pack('<III', 0x46546C67, 2, total_length))  # magic, version, length
        # JSON chunk
        f.write(struct.pack('<II', len(json_bytes), 0x4E4F534A))
        f.write(json_bytes)
        # BIN chunk
        f.write(struct.pack('<II', len(buffer_data), 0x004E4942))
        f.write(buffer_data)

    print(f"Generated MX-5 NA: {len(vertices)} vertices, {len(indices)//3} triangles, {total_length/1024:.1f} KB")


if __name__ == '__main__':
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else '/sessions/practical-quirky-ptolemy/mnt/media-coach-simhub-plugin/web/public/models/cars/sports.glb'
    generate_mx5_glb(out, color=(0.8, 0.08, 0.08))  # Classic red MX-5
