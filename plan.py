"""Decides today's videos from the weekday of the NEXT 04:30 IST, builds each one, prints the render chunk matrix."""
import argparse, json, os, sys
from common import next_publish, formats_for, ROOT
import make_story

CHUNK = int(os.environ.get("CHUNK_FRAMES", 150 if int(os.environ.get("RES", "1080")) >= 1080 else 300))   # 1080p frames cost about 2.25x more than 720p

ap = argparse.ArgumentParser()
ap.add_argument("--formats", default="")   # e.g. "short,long" to override the weekly schedule
ap.add_argument("--lead", type=int, default=120)
ap.add_argument("--sample", action="store_true")
a = ap.parse_args()

t = next_publish(lead_minutes=a.lead)
fmts = [f for f in a.formats.split(",") if f] or formats_for(t)
print(f"[plan] publish at {t.isoformat()} -> {fmts}")
matrix, videos = [], []
for fmt in fmts:
    vid = f"{fmt}"
    out = os.path.join(ROOT, "work", vid)
    timing = make_story.build(fmt, out, sample=a.sample)
    frames = round(timing["duration"] * 30)
    n = 0
    for s in range(0, frames, CHUNK):
        matrix.append(dict(video=vid, chunk=n, start=s, end=min(frames, s + CHUNK) - 1)); n += 1
    videos.append(vid)
out = dict(matrix={"include": matrix}, videos=json.dumps(videos), publish_at=t.astimezone(__import__("datetime").timezone.utc).isoformat())
if os.environ.get("GITHUB_OUTPUT"):
    with open(os.environ["GITHUB_OUTPUT"], "a") as f:
        f.write(f"matrix={json.dumps(out['matrix'])}\nvideos={out['videos']}\npublish_at={out['publish_at']}\n")
print(json.dumps(out)[:400])
