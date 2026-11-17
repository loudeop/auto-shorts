"""Colour filter for the whole picture. Same maths as the in-engine shader (engine/src/Full.jsx):
a gradient map by brightness (shadows -> mids -> lights) blended with the original colours.
  python pipeline/colorfilter.py in.mp4 out.mp4 navy [strength]      apply to an existing video
  python pipeline/colorfilter.py --lut navy out.cube [strength]      just write the LUT
Filters live in engine/src/filters.json (navy, teal, plum, warm, sepia, none)."""
import json, os, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILTERS = json.load(open(os.path.join(ROOT, "engine", "src", "filters.json")))


def hex3(h): return [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]


def gradient(stops, l, knots):
    g = [hex3(s) for s in stops]; k1, k2, k3 = knots
    if l < k1: a, b, t = g[0], g[1], l / k1
    elif l < k2: a, b, t = g[1], g[2], (l - k1) / (k2 - k1)
    else: a, b, t = g[2], g[3], min(1.0, (l - k2) / (k3 - k2))
    return [a[i] + (b[i] - a[i]) * t for i in range(3)]


def write_lut(name, path, strength=None, size=33):
    f = FILTERS[name]; k = f["strength"] if strength is None else float(strength)
    with open(path, "w") as o:
        o.write(f"TITLE \"{name}\"\nLUT_3D_SIZE {size}\n")
        for b in range(size):
            for g in range(size):
                for r in range(size):
                    c = (r / (size - 1), g / (size - 1), b / (size - 1))
                    l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
                    m = gradient(f["stops"], l, f["knots"])
                    o.write(" ".join(f"{c[i] + (m[i] - c[i]) * k:.5f}" for i in range(3)) + "\n")


def apply(src, dst, name, strength=None):
    lut = dst + ".cube"; write_lut(name, lut, strength)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", f"lut3d={lut}", "-c:v", "libx264", "-crf", "20", "-preset", "medium",
                    "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", dst], check=True)
    os.remove(lut)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--lut": write_lut(a[1], a[2], a[3] if len(a) > 3 else None)
    else: apply(a[0], a[1], a[2], a[3] if len(a) > 3 else None)
