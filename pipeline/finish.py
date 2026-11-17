"""Last step, after a video has been rendered and mixed: a dense colour filter over the finished picture.
  python pipeline/finish.py work/short [work/long ...]      replaces work/<video>/final.mp4
  python pipeline/finish.py --images a.png b.png            filters pictures (the preview uses this)
FINISH_FILTER = navy | teal | plum | warm | sepia | none (default navy)     FINISH_STRENGTH = 0 to 1 (default 0.8, dense)"""
import os, subprocess, sys, tempfile
import colorfilter

name = os.environ.get("FINISH_FILTER", "navy")
strength = os.environ.get("FINISH_STRENGTH", "0.8")


def run(files, images):
    if name == "none" or float(strength) <= 0:
        print("[finish] colour filter is off"); return
    lut = os.path.join(tempfile.mkdtemp(), "finish.cube"); colorfilter.write_lut(name, lut, strength)
    for f in files:
        tmp = f + ".tmp" + os.path.splitext(f)[1]
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", f, "-vf", f"lut3d={lut}"]
        cmd += [tmp] if images else ["-c:v", "libx264", "-crf", "20", "-preset", "medium", "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", tmp]
        subprocess.run(cmd, check=True); os.replace(tmp, f)
        print(f"[finish] {name} x {strength} -> {f}")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--images": run(a[1:], True)
    else: run([os.path.join(d, "final.mp4") for d in a], False)
