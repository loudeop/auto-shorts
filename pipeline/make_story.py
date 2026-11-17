"""Idea -> script -> voices/music/sfx -> timing for ONE video. Output folder holds everything the renderer needs."""
import argparse, json, os, re, sys
from common import ROOT, history
import llm, audio, catalog, design

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
CAST: 2-5 invented characters who look like their part in the story. Give each a "role" from: {roles} (a role is a full costume: hat, tools, outfit). Optionally add "costume" (up to 3 extra pieces from: {costume}), "held" (the tool they carry and play with, from: {held}), "hair" ({hair}), "hair_color" ({hc}), "skin" ({skin}), "build" ({builds}), "glasses" true/false, and a "palette" for the clothes ({pal}). The main character should carry a held object that suits the story, and the characters should look clearly different from each other.
DETAILS: "details" = 6-8 tiny things that make THIS story world feel lived in, from: {details}. For poster, note and calendar add "text" (1-3 UPPERCASE words that belong to the story, e.g. WANTED, CLOSED, MAY). Prefer details that tell the story (a mouse and crumbs in a poor place, a steaming teacup where someone just left).
DIALOGUE: about 40 percent of shots are a character speaking ("speaker" = cast index, who must be in "who"; short, punchy, in character, max 14 words). The other shots are narration ("speaker": "narrator").
EMOTION: every shot has an emotion per character in "who" (list, same order) from: {emo}. Vary them; use neutral rarely. Match the beat (shock at twists, worry at doubt, smug at schemes, interested when someone leans in to look, disgusted at something foul or fake, bored for the one who does not care). The animation turns each emotion into body language (fear = backing away and trembling, sadness = slumped and slow, joy = open arms and bounce).
PROPS: "props" = 4-6 object names from the list below that belong in this story world; they are scattered visibly around the characters.
OBJECT: about every third shot shows one big hero prop close-up that the sentence is about, from: {objs} (or "" for none).
SIGN: "label" = 1-3 word UPPERCASE sign shown in the set (or ""), "label_word" = index of the spoken word where it pops in.
ACTIONS: give the characters real movement, about 60 percent of shots. Each shot may have up to 2 "actions": {{"who": cast index, "do": a ready-made action ({actions}) or "custom", "at": 0-1 (where in the sentence it starts), "dur": 0.2-1 (how long), "repeat": 1-4 (optional), "keys": only for custom: [{{"t": 0-1, ...channel values}}]}}.
  Custom movement is for anything the sentence says that no ready-made action fits (sliding in, ducking, hugging, stumbling, tiptoeing away): write 2-6 keyframes. Channels (all optional): armL, armR (raise: 0 hanging, 1.6 straight out to the side, 3.1 straight up, negative = across the body), lean (-0.8..0.9, + toward the camera), sway (sideways tilt -1.6..1.6, 1.4 = toppled over), yaw (turn, 6.28 = full spin), dx (sideways metres -4..4), dz (toward camera -2..2), dy (up metres -0.6..2), nod, shake, tilt (head, -0.8..0.8), crouch (0..0.8), stride (0..1, legs swinging: walking or running), spread (0..0.9, legs apart).
  A scene prop that a character carries or swings gets "holder": that cast index, so it sits in their hand and moves with the arm (e.g. an axe with a "swing" action).
SCENE PROPS: basic props that exist ONLY during one shot and pop in with it, so each scene has what the sentence is about. Put 0-2 "scene_props" on a shot (at most 10 in the whole video), each one of:
  {{"name": a recipe ({recipes}) or library object ({objs}), "slot": {pslots}, "enter": {enters}, "motion": {motions}}}  - or a custom prop made of simple shapes:
  {{"parts": [{{"shape": {shapes}, "color": "#8a5a3b", "size": [w,h,d] (cylinder/cone [radius,height], sphere [radius], torus [radius,tube]), "pos": [x,y,z] (y=0 is the floor), "rot": [rx,ry,rz]}}, ...up to 8 parts], "slot": ..., "enter": ..., "motion": ..., "text": optional 1-3 UPPERCASE word label, "glow": optional "#hex"}}.
  Use "drop" for heavy things, "slide" for things carried in, "rise" for things coming up, "swing_in" for tools, "pop" otherwise.
TAGS: you may use <laugh>, <sigh>, <breath> or <short pause> inside text, at most 3 in the whole script, only inside dialogue.
MUSIC: "music" = one sentence brief for the score: genre, mood, instruments, tempo (e.g. "dusty western, tense plucked guitar and low strings, 90 bpm").
Return ONLY JSON, no markdown:
{{"title": "<=70 chars, no clickbait lies", "description": "2-3 sentences", "tags": ["..."], "music": "...", "props": ["lantern", "crate"],
 "cast": [{{"role":"cowboy","held":"lasso","hair":"","skin":"tan","build":"tall","glasses":false,"palette":"red"}}],
 "details": [{{"name":"poster","text":"WANTED"}}, {{"name":"teacup"}}, {{"name":"mouse"}}],
 "facts": [{{"claim":"...","sources":["https://...","https://..."]}}],
 "shots": [{{"location":"cave","who":[0,1],"speaker":"narrator","emotion":["shocked","worried"],"object":"gold","label":"FAKE GOLD","label_word":2,"actions":[{{"who":0,"do":"swing","at":0.3,"dur":0.5}}],"scene_props":[{{"name":"axe","holder":0,"slot":"left","enter":"swing_in"}}],"text":"exact words spoken in this shot"}}]}}"""


def validate(d, fmt):
    sp = SPEC[fmt]; shots = d["shots"]
    assert sp["shots"][0] <= len(shots) <= sp["shots"][1], f"{len(shots)} shots"
    words = sum(len(audio.clean(s["text"])[1].split()) for s in shots)
    assert sp["words"][0] <= words <= sp["words"][1], f"{words} words"
    assert 1 <= len(d["cast"]) <= 5
    assert d["facts"] and all(len(set(f.get("sources", []))) >= 2 for f in d["facts"]), "every fact needs 2 sources"
    assert len({s["location"] for s in shots}) <= 3, "too many locations"
    for s in shots:
        assert s["location"] in LOCS, s["location"]
        assert not re.search(r"\d", audio.clean(s["text"])[1]), "write numbers as words"
    assert any(isinstance(s.get("speaker"), int) for s in shots), "needs some dialogue"
    return words


HEX = re.compile(r"^#[0-9a-fA-F]{6}$")


def _num(x, lo, hi, default):
    try: return round(min(hi, max(lo, float(x))), 3)
    except Exception: return default


def clean_prop(p):
    """One scene prop from the LLM -> a safe spec, or None."""
    if isinstance(p, str): p = {"name": p}
    if not isinstance(p, dict): return None
    out = {}
    parts = []
    for q in (p.get("parts") or [])[:8]:
        if isinstance(q, dict) and q.get("shape") in catalog.SHAPES:
            size = q.get("size") if isinstance(q.get("size"), list) else [0.3]
            part = {"shape": q["shape"], "color": q["color"] if isinstance(q.get("color"), str) and HEX.match(q["color"]) else "#9aa0a8",
                    "size": [_num(n, 0.03, 3, 0.3) for n in size[:3]] or [0.3],
                    "pos": [_num(n, -3, 3, 0) for n in (q.get("pos") or [0, 0, 0])[:3]]}
            if q.get("rot"): part["rot"] = [_num(n, -7, 7, 0) for n in q["rot"][:3]]
            parts.append(part)
    if parts: out["parts"] = parts
    elif p.get("name") in catalog.PROP_NAMES: out["name"] = p["name"]
    else: return None
    out["slot"] = p.get("slot") if p.get("slot") in catalog.PROP_SLOTS else "left"
    out["enter"] = p.get("enter") if p.get("enter") in catalog.ENTERS else "pop"
    out["motion"] = p.get("motion") if p.get("motion") in catalog.MOTIONS else "none"
    if p.get("scale") is not None: out["scale"] = _num(p["scale"], 0.4, 2.5, 1)
    if isinstance(p.get("glow"), str) and HEX.match(p["glow"]): out["glow"] = p["glow"]
    if isinstance(p.get("holder"), int): out["holder"] = p["holder"]
    if p.get("text"): out["text"] = re.sub(r"[^A-Z0-9 !?'&-]", "", str(p["text"]).upper())[:14]
    return out


def clean_action(a, who):
    """One movement from the LLM -> a safe spec (or None). 'custom' needs valid keyframes."""
    if not isinstance(a, dict): return None
    out = {"who": a.get("who") if isinstance(a.get("who"), int) and a.get("who") in who else who[0],
           "at": _num(a.get("at", 0), 0, 0.9, 0), "dur": _num(a.get("dur", 0.6), 0.2, 1, 0.6)}
    if a.get("repeat") is not None: out["repeat"] = int(_num(a["repeat"], 1, 4, 1))
    if a.get("ease") in ("smooth", "linear", "snap"): out["ease"] = a["ease"]
    if a.get("do") in catalog.ACTIONS: out["do"] = a["do"]; return out
    keys = []
    for k in (a.get("keys") or [])[:8]:
        if not isinstance(k, dict): continue
        key = {"t": _num(k.get("t", 0), 0, 1, 0)}
        for c, (lo, hi) in catalog.LIMITS.items():
            if k.get(c) is not None: key[c] = _num(k[c], lo, hi, 0)
        if len(key) > 1: keys.append(key)
    if len(keys) >= 2: out["do"] = "custom"; out["keys"] = sorted(keys, key=lambda x: x["t"]); return out
    return None


# words in a sentence -> a ready-made movement (used when the script writer left a shot without any)
AUTO_ACTIONS = {"cut": "swing", "chop": "swing", "swung": "swing", "swing": "swing", "strike": "swing", "smash": "swing", "hit": "swing", "ran": "run_in", "run": "run_in",
                "rushed": "run_in", "raced": "run_in", "sprinted": "run_in", "hurried": "run_in", "jumped": "jump", "jump": "jump", "leaped": "jump", "hopped": "jump",
                "fell": "fall", "fall": "fall", "plunge": "fall", "plunged": "fall", "plummeted": "fall", "crashed": "fall", "collapsed": "fall", "toppled": "fall",
                "pointed": "point", "point": "point", "showed": "point", "waved": "wave", "wave": "wave", "bowed": "bow", "cheered": "cheer", "celebrated": "cheer",
                "won": "cheer", "pushed": "push", "push": "push", "pulled": "pull", "dragged": "pull", "threw": "throw", "tossed": "throw", "hurled": "throw",
                "climbed": "climb", "climb": "climb", "hid": "cower", "ducked": "cower", "flinched": "cower", "cowered": "cower", "danced": "dance", "dance": "dance",
                "nodded": "nod_yes", "agreed": "nod_yes", "refused": "shake_head", "clapped": "clap", "stomped": "stomp", "spun": "spin", "twirled": "spin",
                "shrugged": "shrug", "sneaked": "sneak", "crept": "sneak", "walked": "walk_in", "arrived": "walk_in", "entered": "walk_in", "sighed": "slump"}
HOLD_PROPS = {"axe", "shovel", "lamp", "sack", "bowl", "rope"}


def auto_actions(shots, limit=10):
    n, last = sum(1 for s in shots if s.get("actions")), None
    for s in shots:
        if n >= limit: break
        if s.get("actions"): continue
        words = re.findall(r"[a-z]+", s["text"].lower())
        for i, w in enumerate(words):
            if w in AUTO_ACTIONS and AUTO_ACTIONS[w] != last:
                who = s["speaker"] if isinstance(s["speaker"], int) else s["who"][0]
                s["actions"] = [{"who": who, "do": AUTO_ACTIONS[w], "at": round(min(0.7, i / max(1, len(words))), 2), "dur": 0.45}]
                last = AUTO_ACTIONS[w]; n += 1; break
        else: last = None


# words in a shot's sentence -> a basic prop that suits it (used when the script writer left a shot bare)
AUTO_PROPS = {"rope": ("rope", "drop"), "cable": ("rope", "drop"), "axe": ("axe", "swing_in"), "spring": ("spring", "rise"), "lift": ("platform", "rise"),
              "elevator": ("platform", "rise"), "platform": ("platform", "rise"), "door": ("door", "slide"), "table": ("table", "pop"), "chair": ("chair", "pop"),
              "bell": ("bell", "drop"), "anvil": ("anvil", "drop"), "lever": ("lever", "pop"), "dial": ("dial", "pop"), "gauge": ("dial", "pop"),
              "safe": ("safe", "pop"), "vault": ("safe", "pop"), "balloon": ("balloon", "rise"), "fire": ("campfire", "pop"), "flame": ("campfire", "pop"),
              "wheel": ("wheel", "slide"), "cart": ("cart", "slide"), "wagon": ("cart", "slide"), "shovel": ("shovel", "swing_in"), "ladder": ("ladder", "slide"),
              "bowl": ("bowl", "pop"), "sack": ("sack", "pop"), "bag": ("sack", "pop"), "sign": ("signpost", "pop"), "lamp": ("lamp", "pop")}


def auto_props(shots, limit=8):
    n, last = sum(1 for s in shots if s.get("scene_props")), None
    for i, s in enumerate(shots):
        if n >= limit: break
        if s.get("scene_props") or s.get("object"): last = None; continue
        for w in re.findall(r"[a-z]+", s["text"].lower()):
            if w in AUTO_PROPS and AUTO_PROPS[w][0] != last:
                name, enter = AUTO_PROPS[w]
                s["scene_props"] = [{"name": name, "slot": "left" if n % 2 == 0 else "right", "enter": enter, "motion": "none"}]
                last = name; n += 1; break
        else: last = None


def tidy(d):
    d["props"] = [p for p in d.get("props", []) if p in OBJECTS][:6]
    for c in d["cast"]:
        if c.get("palette") not in PALETTES: c["palette"] = "engineer"
        c["role"] = c.get("role") if c.get("role") in catalog.ROLES else ""
        c["costume"] = [x for x in (c.get("costume") or []) if x in catalog.COSTUME][:3]
        c["held"] = c.get("held") if c.get("held") in catalog.HELD else ""
        c["hair"] = c.get("hair") if c.get("hair") in catalog.HAIR else ""
        c["hair_color"] = c.get("hair_color") if c.get("hair_color") in catalog.HAIR_COLORS else ""
        c["skin"] = c.get("skin") if c.get("skin") in catalog.SKIN else ""
        c["build"] = c.get("build") if c.get("build") in catalog.BUILDS else ""
        c["glasses"] = bool(c.get("glasses"))
    seen, details = set(), []
    for x in d.get("details") or []:
        x = {"name": x} if isinstance(x, str) else x
        if isinstance(x, dict) and x.get("name") in catalog.DETAILS and x["name"] not in seen:
            seen.add(x["name"]); details.append({"name": x["name"], "text": str(x.get("text", ""))[:12].upper()})
    for fill in ("candle", "plant", "papers", "mouse", "poster", "teacup"):      # never leave a world bare
        if len(details) >= 5: break
        if fill not in seen: seen.add(fill); details.append({"name": fill, "text": ""})
    d["details"] = details[:8]
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
        s["scene_props"] = [x for x in (clean_prop(p) for p in (s.get("scene_props") or [])[:2]) if x]
        for x in s["scene_props"]:
            if x.get("holder") not in s["who"]: x.pop("holder", None)
        s["actions"] = [x for x in (clean_action(a, s["who"]) for a in (s.get("actions") or [])[:2]) if x]
        s["label"] = str(s.get("label", ""))[:26]
        s["label_word"] = int(s.get("label_word", 0) or 0)
        s["voice_text"], s["text"] = audio.clean(s["text"])[0], audio.clean(s["text"])[1]
    auto_props(d["shots"])        # bare shots whose words name a basic prop get one
    for s in d["shots"]:          # tools the character should hold go in their hand
        for x in s["scene_props"]:
            if x.get("name") in HOLD_PROPS and "holder" not in x: x["holder"] = s["speaker"] if isinstance(s["speaker"], int) else s["who"][0]
    auto_actions(d["shots"])      # bare shots whose verbs name a movement get one
    return d


def build(fmt, out, sample=False):
    os.makedirs(out, exist_ok=True)
    if sample:
        d = json.load(open(os.path.join(ROOT, "config", "sample_story.json"))); words = 0
    else:
        recent = "; ".join(h["title"] for h in history()[-60:]) or "none yet"
        prompt = PROMPT.format(target=SPEC[fmt]["target"], recent=recent, locs="; ".join(f"{k} = {v}" for k, v in LOCS.items()),
                               pal=", ".join(PALETTES), emo=", ".join(EMOTIONS), objs=", ".join(OBJECTS), roles=", ".join(catalog.ROLES),
                               costume=", ".join(catalog.COSTUME), held=", ".join(catalog.HELD), hair=", ".join(catalog.HAIR), hc=", ".join(catalog.HAIR_COLORS),
                               skin=", ".join(catalog.SKIN), builds=", ".join(catalog.BUILDS), details=", ".join(catalog.DETAILS), recipes=", ".join(catalog.RECIPES), actions=", ".join(catalog.ACTIONS), pslots=", ".join(catalog.PROP_SLOTS),
                               enters=", ".join(catalog.ENTERS), motions=", ".join(catalog.MOTIONS), shapes="|".join(catalog.SHAPES))
        for attempt in range(1, 5):
            try:
                d = llm.generate_json(prompt); words = validate(d, fmt); break
            except llm.QuotaError:
                print("[story] stopping: the free quota is used up. Wait for the daily reset (about midnight Pacific time), add billing, or add an OPENROUTER_API_KEY secret as a backup.")
                raise
            except Exception as e:
                print(f"[story] attempt {attempt} rejected: {e}")
                if attempt == 4: raise
    raw = [s["text"] for s in d["shots"]]
    d = tidy(d)
    # set design: each place gets its own palette, light, floor, scenery and particles (OpenRouter if a key is set, else seeded random)
    d["design"] = design.design_places(d["title"], d["description"], sorted({s["location"] for s in d["shots"]}),
                                       [s["label"] for s in d["shots"] if s["label"]], use_llm=True)
    # voices (text with allowed tags) and captions (clean text)
    vshots = [dict(key=s["key"], text=r, speaker=s["speaker"], emotion=s["emotion"][s["who"].index(s["speaker"])] if s["speaker"] != "narrator" else s["emotion"][0],
                   location=s["location"]) for s, r in zip(d["shots"], raw)]
    placed, pcm, env, duration = audio.build_voice_track(vshots, out)
    W, H = SPEC[fmt]["size"]
    shots_t = [dict(key=p["key"], start=p["start"], end=p["end"], words=max(1, len(s["text"].split())), text=s["text"], speaker=s["speaker"])
               for p, s in zip(placed, d["shots"])]
    timing = dict(fps=30, duration=duration, format=fmt, width=W, height=H, shots=shots_t, env=env)
    json.dump(timing, open(os.path.join(out, "timing.json"), "w"))
    story = dict(title=d["title"], format=fmt, cast=d["cast"], props=d["props"], details=d["details"], design=d["design"],
                 shots=[{k: s[k] for k in ("key", "location", "who", "speaker", "emotion", "object", "label", "label_word", "scene_props", "actions", "mood", "cam") if k in s} for s in d["shots"]])
    json.dump(story, open(os.path.join(out, "story.json"), "w"), indent=1)
    json.dump(dict(title=d["title"][:95], description=d["description"], tags=d.get("tags", [])[:15], facts=d["facts"], format=fmt),
              open(os.path.join(out, "meta.json"), "w"), indent=1)
    fl = {"bokeh": False, "calm": float(os.environ.get("CALM", "1")), "filter": os.environ.get("FILTER", "none")}      # FILTER: navy teal plum warm sepia none
    if os.environ.get("FILTER_STRENGTH"): fl["filter_strength"] = float(os.environ["FILTER_STRENGTH"])
    json.dump(fl, open(os.path.join(out, "flags.json"), "w"))
    with open(os.path.join(out, "script.md"), "w") as f:
        f.write(f"# {d['title']}\n\n" + "\n\n".join(f"**{s['key']}** ({s['location']}, {'narrator' if s['speaker']=='narrator' else 'cast '+str(s['speaker'])}, {','.join(s['emotion'])}) {s['text']}" for s in d["shots"]) + "\n\n## Facts and sources\n")
        for x in d["facts"]: f.write(f"- {x['claim']}\n" + "".join(f"  - {u}\n" for u in x["sources"]))
    # sound: effects at cuts / signs / shocks, Lyria score, final mix (named voiceover.wav so the workflow muxes it unchanged)
    by_key = {p["key"]: p for p in placed}
    whooshes = [by_key[b["key"]]["start"] - 0.1 for a, b in zip(d["shots"], d["shots"][1:]) if a["location"] != b["location"]]
    pops = [by_key[s["key"]]["start"] + (by_key[s["key"]]["end"] - by_key[s["key"]]["start"]) * s["label_word"] / max(1, len(s["text"].split())) for s in d["shots"] if s["label"]]
    pops += [by_key[s["key"]]["start"] + 0.05 for s in d["shots"] if s["scene_props"]]            # a pop as each shot-prop appears
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
