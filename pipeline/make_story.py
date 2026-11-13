"""Idea -> script -> system voice -> timing for ONE video. Output folder holds everything the renderer needs."""
import argparse, json, os, re, subprocess, sys, wave
from common import ROOT, history
import llm

LOCS = ["street_day", "street_night", "office", "yard", "workshop", "lab"]
PALETTES = ["engineer", "student", "welder", "clerk", "official", "red", "teal", "mustard", "pink", "navy"]
SPEC = {"short": dict(words=(120, 215), shots=(9, 14), size=(720, 1280), target="150-180 words, 10-13 shots, about 60 seconds"),
        "long": dict(words=(380, 640), shots=(26, 40), size=(1280, 720), target="470-520 words, 28-36 shots, about 3 minutes")}

PROMPT = """You write scripts for faceless 'true fact told as a mini-movie' videos: cartoon characters in busy 3D sets, one-word captions.
Pick ONE true, surprising story (hidden science, clever loopholes, old inventions, engineering). Use web search if you can.
Do NOT reuse these recent topics: {recent}
Length: {target}. Simple words, one idea per sentence, numbers written as the narrator says them ("nineteen seventy-eight").
Beats: hook (strange action + one exact detail, no intro) -> stakes -> doubt -> escalation with numbers -> problem -> "You see," real reason explained with an everyday object -> "So..." what they did -> twist closing line. No outro, no like/subscribe line.
Rules: every fact needs 2 independent sources (full URLs). Leave out anything single-source or disputed. No medical or money advice, no invented quotes from real people, no graphic injury. Invented side characters are fine but never present invented events as history.
Locations you may use per shot: {locs}. Cast: 1-4 invented characters (palette from {pal}; hat none|bowler|cap|top; glasses true/false).
Per shot: "who" = list of 1-2 cast indexes on screen, "label" = 1-3 word UPPERCASE sign shown in the set (or ""), "label_word" = index of the spoken word where the sign pops in.
Return ONLY JSON, no markdown:
{{"title": "<=70 chars, no clickbait lies", "description": "2-3 sentences", "tags": ["..."],
 "cast": [{{"palette":"red","hat":"cap","glasses":false}}],
 "facts": [{{"claim":"...","sources":["https://...","https://..."]}}],
 "shots": [{{"location":"office","who":[0],"label":"BUILDING CODE","label_word":2,"text":"exact narration for this shot"}}]}}"""


def validate(d, fmt):
    sp = SPEC[fmt]
    shots = d["shots"]
    assert sp["shots"][0] <= len(shots) <= sp["shots"][1], f"{len(shots)} shots"
    words = sum(len(s["text"].split()) for s in shots)
    assert sp["words"][0] <= words <= sp["words"][1], f"{words} words"
    assert 1 <= len(d["cast"]) <= 4
    assert d["facts"] and all(len(set(f.get("sources", []))) >= 2 for f in d["facts"]), "every fact needs 2 sources"
    for s in shots:
        assert s["location"] in LOCS, s["location"]
        assert not re.search(r"\d", s["text"]), "write numbers as words"
    return words


def tidy(d, fmt):
    for c in d["cast"]:
        if c.get("palette") not in PALETTES: c["palette"] = "engineer"
    for i, s in enumerate(d["shots"]):
        s["key"] = f"s{i + 1:02d}"
        s["who"] = [w for w in s.get("who", [0]) if isinstance(w, int) and 0 <= w < len(d["cast"])][:2] or [0]
        s["text"] = " ".join(s["text"].split())
        s["label"] = str(s.get("label", ""))[:26]
    return d


def build_voice(d, out, fmt, wpm=165):
    """One espeak-ng clip per shot -> exact shot times, no pause detection needed."""
    gap, lead, tail = 0.42, 0.15, 0.8
    clips = []
    for s in d["shots"]:
        p = os.path.join(out, f"{s['key']}.wav")
        subprocess.run(["espeak-ng", "-v", os.environ.get("ESPEAK_VOICE", "en-us"), "-s", str(wpm), "-p", "45", "--stdin", "-w", p],
                       input=s["text"], text=True, check=True)
        clips.append(p)
    w0 = wave.open(clips[0]); params = w0.getparams(); w0.close()
    rate, width, ch = params.framerate, params.sampwidth, params.nchannels
    sil = lambda sec: b"\x00" * (int(rate * sec) * width * ch)
    pcm, t, shots = sil(lead), lead, []
    for s, p in zip(d["shots"], clips):
        w = wave.open(p); frames = w.readframes(w.getnframes()); dur = w.getnframes() / rate; w.close()
        pcm += frames; shots.append(dict(key=s["key"], start=round(t, 3), end=round(t + dur, 3), words=len(s["text"].split()), text=s["text"]))
        t += dur
        pcm += sil(gap if s is not d["shots"][-1] else tail); t += gap if s is not d["shots"][-1] else tail
    raw = os.path.join(out, "raw.wav")
    o = wave.open(raw, "wb"); o.setparams(params); o.writeframes(pcm); o.close()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", raw, "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000", "-ac", "2",
                    os.path.join(out, "voiceover.wav")], check=True)
    W, H = SPEC[fmt]["size"]
    timing = dict(fps=30, duration=round(shots[-1]["end"] + 0.75, 2), format=fmt, width=W, height=H, shots=shots)
    json.dump(timing, open(os.path.join(out, "timing.json"), "w"), indent=1)
    return timing


def build(fmt, out, sample=False):
    os.makedirs(out, exist_ok=True)
    if sample:
        d = json.load(open(os.path.join(ROOT, "config", "sample_story.json")))
        words = sum(len(s["text"].split()) for s in d["shots"])
    else:
        recent = "; ".join(h["title"] for h in history()[-60:]) or "none yet"
        prompt = PROMPT.format(target=SPEC[fmt]["target"], recent=recent, locs=", ".join(LOCS), pal=", ".join(PALETTES))
        for attempt in range(1, 5):
            try:
                d = llm.generate_json(prompt)
                words = validate(d, fmt)
                break
            except Exception as e:
                print(f"[story] attempt {attempt} rejected: {e}")
                if attempt == 4: raise
    d = tidy(d, fmt)
    story = dict(title=d["title"], format=fmt, cast=d["cast"],
                 shots=[{k: s[k] for k in ("key", "location", "who", "label", "label_word", "mood", "cam") if k in s} for s in d["shots"]])
    json.dump(story, open(os.path.join(out, "story.json"), "w"), indent=1)
    json.dump(dict(title=d["title"][:95], description=d["description"], tags=d.get("tags", [])[:15], facts=d["facts"], format=fmt),
              open(os.path.join(out, "meta.json"), "w"), indent=1)
    with open(os.path.join(out, "script.md"), "w") as f:
        f.write(f"# {d['title']}\n\n" + "\n\n".join(f"**{s['key']}** ({s['location']}) {s['text']}" for s in d["shots"]) + "\n\n## Facts and sources\n")
        for x in d["facts"]: f.write(f"- {x['claim']}\n" + "".join(f"  - {u}\n" for u in x["sources"]))
    json.dump({"bokeh": False}, open(os.path.join(out, "flags.json"), "w"))
    t = build_voice(d, out, fmt)
    for f in os.listdir(out):
        if re.fullmatch(r"s\d+\.wav|raw\.wav", f): os.remove(os.path.join(out, f))
    print(f"[story] {fmt}: '{d['title']}' {words} words, {t['duration']} s")
    return t


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--format", default="short"); ap.add_argument("--out", required=True); ap.add_argument("--sample", action="store_true")
    a = ap.parse_args(); build(a.format, a.out, a.sample)
