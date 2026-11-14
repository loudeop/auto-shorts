"""Idea -> script -> voices/music/sfx -> timing for ONE video. Output folder holds everything the renderer needs."""
import argparse, json, os, re, sys
from common import ROOT, history
import llm, audio

LOCS = {"street_day": "city street in daylight", "street_night": "city street at night", "office": "office / classroom / study",
        "yard": "back yard / construction yard", "workshop": "factory / workshop", "lab": "laboratory / weather room",
        "cave": "mine, tunnel, cellar or cave", "desert": "desert / old west / wasteland", "forest": "forest / countryside / camp",
        "harbor": "harbor, docks, ship or sea story", "castle": "castle, palace, court or great hall"}
EMOTIONS = ["neutral", "happy", "excited", "shocked", "scared", "angry", "sad", "worried", "smug", "thinking", "interested", "disgusted", "bored"]
PALETTES = ["engineer", "student", "welder", "clerk", "official", "red", "teal", "mustard", "pink", "navy"]
sys.path.insert(0, os.path.join(ROOT, "pipeline"))
OBJECTS = ["gold", "dynamite", "bottle", "key", "coin", "bulb", "rocket", "book", "map", "flask", "gear", "bomb", "trophy", "egg", "clock",
           "hammer", "pickaxe", "lantern", "chest", "scroll", "magnet", "battery", "crate"]
SPEC = {"short": dict(words=(120, 215), shots=(9, 16), size=(720, 1280), target="150-180 words, 11-15 shots, about 60 seconds"),
        "long": dict(words=(380, 640), shots=(26, 44), size=(1280, 720), target="470-520 words, 30-42 shots, about 3 minutes")}

PROMPT = """You write scripts for faceless 'true story told as a mini-movie' videos: cartoon characters with big emotions in busy 3D sets.
Pick ONE true, surprising story (hidden science, clever loopholes, old inventions, engineering, scams, history). Use web search if you can.
Do NOT reuse these recent topics: {recent}
Length: {target}. Simple words, one idea per sentence, numbers written as the narrator says them ("nineteen seventy-eight").
Beats: hook (a strange action + one exact detail, no intro) -> stakes -> doubt -> escalation with numbers -> problem -> "You see," the real reason explained with an everyday object -> "So..." what they did -> twist closing line. No outro, no like/subscribe line.
Rules: every fact needs 2 independent sources (full URLs). Leave out anything single-source or disputed. No medical or money advice, no invented quotes from real people, no graphic injury. Invented side characters are fine but never present invented events as history.

WORLD: choose the ONE location that fits the story best and stay there for most shots (at most 3 locations in total, switch only when the story really moves). Locations: {locs}.
CAST: 2-4 invented characters (palette from {pal}; hat none|bowler|cap|top; glasses true/false).
DIALOGUE: about 40 percent of shots are a character speaking ("speaker" = cast index, who must be in "who"; short, punchy, in character, max 14 words). The other shots are narration ("speaker": "narrator").
EMOTION: every shot has an emotion per character in "who" (list, same order) from: {emo}. Vary them; use neutral rarely. Match the beat (shock at twists, worry at doubt, smug at schemes, interested when someone leans in to look, disgusted at something foul or fake, bored for the one who does not care). The animation turns each emotion into body language (fear = backing away and trembling, sadness = slumped and slow, joy = open arms and bounce).
PROPS: "props" = 4-6 object names from the list below that belong in this story world; they are scattered visibly around the characters.
OBJECT: about every third shot shows one big hero prop close-up that the sentence is about, from: {objs} (or "" for none).
SIGN: "label" = 1-3 word UPPERCASE sign shown in the set (or ""), "label_word" = index of the spoken word where it pops in.
TAGS: you may use <laugh>, <sigh>, <breath> or <short pause> inside text, at most 3 in the whole script, only inside dialogue.
MUSIC: "music" = one sentence brief for the score: genre, mood, instruments, tempo (e.g. "dusty western, tense plucked guitar and low strings, 90 bpm").
Return ONLY JSON, no markdown:
{{"title": "<=70 chars, no clickbait lies", "description": "2-3 sentences", "tags": ["..."], "music": "...", "props": ["lantern", "crate"],
 "cast": [{{"palette":"red","hat":"cap","glasses":false}}],
 "facts": [{{"claim":"...","sources":["https://...","https://..."]}}],
 "shots": [{{"location":"cave","who":[0,1],"speaker":"narrator","emotion":["shocked","worried"],"object":"gold","label":"FAKE GOLD","label_word":2,"text":"exact words spoken in this shot"}}]}}"""


def validate(d, fmt):
    sp = SPEC[fmt]; shots = d["shots"]
    assert sp["shots"][0] <= len(shots) <= sp["shots"][1], f"{len(shots)} shots"
    words = sum(len(audio.clean(s["text"])[1].split()) for s in shots)
    assert sp["words"][0] <= words <= sp["words"][1], f"{words} words"
    assert 1 <= len(d["cast"]) <= 4
    assert d["facts"] and all(len(set(f.get("sources", []))) >= 2 for f in d["facts"]), "every fact needs 2 sources"
    assert len({s["location"] for s in shots}) <= 3, "too many locations"
    for s in shots:
        assert s["location"] in LOCS, s["location"]
        assert not re.search(r"\d", audio.clean(s["text"])[1]), "write numbers as words"
    assert any(isinstance(s.get("speaker"), int) for s in shots), "needs some dialogue"
    return words


def tidy(d):
    d["props"] = [p for p in d.get("props", []) if p in OBJECTS][:6]
    for c in d["cast"]:
        if c.get("palette") not in PALETTES: c["palette"] = "engineer"
    n = len(d["cast"])
    for i, s in enumerate(d["shots"]):
        s["key"] = f"s{i + 1:02d}"
        s["who"] = [w for w in s.get("who", [0]) if isinstance(w, int) and 0 <= w < n][:2] or [0]
        sp = s.get("speaker", "narrator")
        s["speaker"] = sp if isinstance(sp, int) and sp in s["who"] else "narrator"
        emo = s.get("emotion", "neutral"); emo = emo if isinstance(emo, list) else [emo]
        emo = [e if e in EMOTIONS else "neutral" for e in emo] or ["neutral"]
        s["emotion"] = (emo + [emo[-1]] * 2)[:len(s["who"])]
        s["object"] = s.get("object") if s.get("object") in OBJECTS else ""
        s["label"] = str(s.get("label", ""))[:26]
        s["label_word"] = int(s.get("label_word", 0) or 0)
        s["voice_text"], s["text"] = audio.clean(s["text"])[0], audio.clean(s["text"])[1]
    return d


def build(fmt, out, sample=False):
    os.makedirs(out, exist_ok=True)
    if sample:
        d = json.load(open(os.path.join(ROOT, "config", "sample_story.json"))); words = 0
    else:
        recent = "; ".join(h["title"] for h in history()[-60:]) or "none yet"
        prompt = PROMPT.format(target=SPEC[fmt]["target"], recent=recent, locs="; ".join(f"{k} = {v}" for k, v in LOCS.items()),
                               pal=", ".join(PALETTES), emo=", ".join(EMOTIONS), objs=", ".join(OBJECTS))
        for attempt in range(1, 5):
            try:
                d = llm.generate_json(prompt); words = validate(d, fmt); break
            except Exception as e:
                print(f"[story] attempt {attempt} rejected: {e}")
                if attempt == 4: raise
    raw = [s["text"] for s in d["shots"]]
    d = tidy(d)
    # voices (text with allowed tags) and captions (clean text)
    vshots = [dict(key=s["key"], text=r, speaker=s["speaker"], emotion=s["emotion"][s["who"].index(s["speaker"])] if s["speaker"] != "narrator" else s["emotion"][0],
                   location=s["location"]) for s, r in zip(d["shots"], raw)]
    placed, pcm, env, duration = audio.build_voice_track(vshots, out)
    W, H = SPEC[fmt]["size"]
    shots_t = [dict(key=p["key"], start=p["start"], end=p["end"], words=max(1, len(s["text"].split())), text=s["text"], speaker=s["speaker"])
               for p, s in zip(placed, d["shots"])]
    timing = dict(fps=30, duration=duration, format=fmt, width=W, height=H, shots=shots_t, env=env)
    json.dump(timing, open(os.path.join(out, "timing.json"), "w"))
    story = dict(title=d["title"], format=fmt, cast=d["cast"], props=d["props"],
                 shots=[{k: s[k] for k in ("key", "location", "who", "speaker", "emotion", "object", "label", "label_word", "mood", "cam") if k in s} for s in d["shots"]])
    json.dump(story, open(os.path.join(out, "story.json"), "w"), indent=1)
    json.dump(dict(title=d["title"][:95], description=d["description"], tags=d.get("tags", [])[:15], facts=d["facts"], format=fmt),
              open(os.path.join(out, "meta.json"), "w"), indent=1)
    json.dump({"bokeh": False}, open(os.path.join(out, "flags.json"), "w"))
    with open(os.path.join(out, "script.md"), "w") as f:
        f.write(f"# {d['title']}\n\n" + "\n\n".join(f"**{s['key']}** ({s['location']}, {'narrator' if s['speaker']=='narrator' else 'cast '+str(s['speaker'])}, {','.join(s['emotion'])}) {s['text']}" for s in d["shots"]) + "\n\n## Facts and sources\n")
        for x in d["facts"]: f.write(f"- {x['claim']}\n" + "".join(f"  - {u}\n" for u in x["sources"]))
    # sound: effects at cuts / signs / shocks, Lyria score, final mix (named voiceover.wav so the workflow muxes it unchanged)
    by_key = {p["key"]: p for p in placed}
    whooshes = [by_key[b["key"]]["start"] - 0.1 for a, b in zip(d["shots"], d["shots"][1:]) if a["location"] != b["location"]]
    pops = [by_key[s["key"]]["start"] + (by_key[s["key"]]["end"] - by_key[s["key"]]["start"]) * s["label_word"] / max(1, len(s["text"].split())) for s in d["shots"] if s["label"]]
    booms = [by_key[s["key"]]["start"] + 0.05 for s in d["shots"] if s["emotion"][0] in ("shocked", "scared")]
    audio.write_wav(os.path.join(out, "voice.wav"), pcm)
    audio.write_wav(os.path.join(out, "sfx.wav"), audio.sfx_track(duration, whooshes, pops, booms))
    music = os.path.join(out, "music.mp3")
    have_music = audio.lyria_music(d.get("music") or "warm cinematic storytelling, light percussion, soft strings, mid tempo", duration, music)
    print(f"[sound] music {'Lyria' if have_music else 'none'}, {len(whooshes)} whooshes, {len(pops)} pops, {len(booms)} impacts")
    audio.mix(os.path.join(out, "voice.wav"), os.path.join(out, "sfx.wav"), music if have_music else None, duration, os.path.join(out, "voiceover.wav"))
    for f in ("voice.wav", "sfx.wav", "music.mp3"):
        if os.path.exists(os.path.join(out, f)): os.remove(os.path.join(out, f))
    print(f"[story] {fmt}: '{d['title']}' {len(shots_t)} shots, {duration} s")
    return timing


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--format", default="short"); ap.add_argument("--out", required=True); ap.add_argument("--sample", action="store_true")
    a = ap.parse_args(); build(a.format, a.out, a.sample)
