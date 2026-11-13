"""Upload to YouTube (scheduled), Facebook (Reel/video) and Telegram so everything goes live at the publish time.
usage: publish.py VIDEO_DIR [VIDEO_DIR ...] --at 2026-11-13T23:00:00+00:00"""
import argparse, datetime as dt, json, os, subprocess, sys, time
import requests

GRAPH = "https://graph.facebook.com/v21.0"


def wait_until(when):
    while True:
        left = (when - dt.datetime.now(dt.timezone.utc)).total_seconds()
        if left <= 0: return
        time.sleep(min(left, 30) if left > 1 else left)


# ---------------- YouTube: resumable upload, private + publishAt (goes public exactly on time) ----------------
def youtube(path, meta, when, short):
    tok = requests.post("https://oauth2.googleapis.com/token", data=dict(
        client_id=os.environ["YT_CLIENT_ID"], client_secret=os.environ["YT_CLIENT_SECRET"],
        refresh_token=os.environ["YT_REFRESH_TOKEN"], grant_type="refresh_token"), timeout=60).json()["access_token"]
    desc = meta["description"] + ("\n\n#Shorts" if short else "")
    desc += "\n\nStory told with cartoon characters; some details are dramatised. Voice is synthetic."
    body = dict(snippet=dict(title=meta["title"][:100], description=desc, tags=meta["tags"], categoryId="27"),
                status=dict(privacyStatus="private", publishAt=when.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                            selfDeclaredMadeForKids=False, containsSyntheticMedia=True))
    h = {"Authorization": f"Bearer {tok}", "X-Upload-Content-Type": "video/mp4", "Content-Type": "application/json"}
    r = requests.post("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
                      headers=h, json=body, timeout=60)
    r.raise_for_status()
    with open(path, "rb") as f:
        up = requests.put(r.headers["Location"], data=f, headers={"Content-Type": "video/mp4"}, timeout=3600)
    up.raise_for_status()
    return "https://youtu.be/" + up.json()["id"]


# ---------------- Facebook ----------------
def fb_reel_prepare(path):
    page, tok = os.environ["FB_PAGE_ID"], os.environ["FB_PAGE_TOKEN"]
    r = requests.post(f"{GRAPH}/{page}/video_reels", data=dict(upload_phase="start", access_token=tok), timeout=60); r.raise_for_status()
    vid, url = r.json()["video_id"], r.json()["upload_url"]
    with open(path, "rb") as f:
        u = requests.post(url, data=f, headers={"Authorization": f"OAuth {tok}", "offset": "0", "file_size": str(os.path.getsize(path))}, timeout=3600)
    u.raise_for_status()
    return vid


def fb_reel_finish(vid, meta):
    page, tok = os.environ["FB_PAGE_ID"], os.environ["FB_PAGE_TOKEN"]
    r = requests.post(f"{GRAPH}/{page}/video_reels", data=dict(
        upload_phase="finish", video_id=vid, video_state="PUBLISHED", title=meta["title"],
        description=meta["description"] + " #shorts", access_token=tok), timeout=120)
    r.raise_for_status()
    return r.json()


def fb_long_scheduled(path, meta, when):
    page, tok = os.environ["FB_PAGE_ID"], os.environ["FB_PAGE_TOKEN"]
    with open(path, "rb") as f:
        r = requests.post(f"{GRAPH}/{page}/videos", data=dict(
            title=meta["title"], description=meta["description"], published="false",
            scheduled_publish_time=str(int(when.timestamp())), access_token=tok), files={"source": f}, timeout=3600)
    r.raise_for_status()
    return r.json()


# ---------------- Telegram (BotFather bot, must be admin of the channel) ----------------
def telegram(path, meta):
    tok, chat = os.environ["TG_BOT_TOKEN"], os.environ["TG_CHAT_ID"]
    size = os.path.getsize(path)
    if size > 49 * 1024 * 1024:  # Bot API limit is 50 MB
        small = path.replace(".mp4", "_tg.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
                        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", small], check=True)
        path = small
    with open(path, "rb") as f:
        r = requests.post(f"https://api.telegram.org/bot{tok}/sendVideo", data=dict(chat_id=chat, caption=meta["title"], supports_streaming="true"),
                          files={"video": f}, timeout=1800)
    r.raise_for_status()
    return r.json()["ok"]


def enabled(*names): return all(os.environ.get(n) for n in names)


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("dirs", nargs="+"); ap.add_argument("--at", required=True); ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    when = dt.datetime.fromisoformat(a.at)
    results, later = {}, []

    def attempt(name, fn):
        try:
            results[name] = fn(); print(f"[publish] {name}: ok {results[name]}")
        except Exception as e:
            results[name] = f"FAILED {e}"; print(f"[publish] {name}: FAILED {e}", file=sys.stderr)

    for d in a.dirs:
        meta = json.load(open(os.path.join(d, "meta.json"))); path = os.path.join(d, "final.mp4"); short = meta["format"] == "short"; tag = os.path.basename(d.rstrip("/"))
        if a.dry: print("[dry]", tag, meta["title"], os.path.getsize(path)); continue
        if enabled("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN"): attempt(f"youtube:{tag}", lambda: youtube(path, meta, when, short))
        if enabled("FB_PAGE_ID", "FB_PAGE_TOKEN"):
            if short:
                try: vid = fb_reel_prepare(path); later.append((f"facebook:{tag}", lambda vid=vid, meta=meta: fb_reel_finish(vid, meta)))
                except Exception as e: results[f"facebook:{tag}"] = f"FAILED {e}"; print(f"[publish] facebook prep failed {e}", file=sys.stderr)
            else: attempt(f"facebook:{tag}", lambda: fb_long_scheduled(path, meta, when))
        if enabled("TG_BOT_TOKEN", "TG_CHAT_ID"): later.append((f"telegram:{tag}", lambda path=path, meta=meta: telegram(path, meta)))
    if a.dry: return
    print(f"[publish] waiting until {when.isoformat()}")
    wait_until(when)
    for name, fn in later: attempt(name, fn)
    print(json.dumps(results, indent=1))
    if results and all(str(v).startswith("FAILED") for v in results.values()): sys.exit(1)


if __name__ == "__main__":
    main()
