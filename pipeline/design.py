"""The set designer. Gives every place in a story its own palette, light, floor, scenery pieces and particles, so the same
location (cave, harbor...) looks different in every video. It asks an LLM through OpenRouter (one request per video, so Gemini's
free quota is kept for scripts and voices). If there is no key, the call fails or the answer is bad, a seeded random design is
used, so a story always gets its own look and this step never stops a video."""
import hashlib, random, re
import llm, catalog

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
# calm, muted colour families: tint (set colour), trim, accent, wood, sky + light colours
FAMILIES = [
    dict(tint="#6b4a3a", trim="#b08a6a", accent="#c8553d", wood="#7a4b2a", sky="#f0b88a", sun="#ffd2a0", fog="#6b4a3a", top="#c26a4a", hor="#f0b88a"),   # copper dusk
    dict(tint="#2f5f66", trim="#9fb8b5", accent="#e0a458", wood="#5a4a3a", sky="#9fd3d8", sun="#e6f4f0", fog="#2f5f66", top="#2a6f86", hor="#a8d8d6"),   # deep teal
    dict(tint="#3f5f3f", trim="#a9b79a", accent="#d9a441", wood="#6b4a2a", sky="#bfe0c0", sun="#f4f0c8", fog="#3f5f3f", top="#4f8f6a", hor="#cfe3c0"),   # moss
    dict(tint="#6a4a5a", trim="#c9a9b4", accent="#e07a8a", wood="#6b4a3a", sky="#f0c8d0", sun="#ffe0e0", fog="#6a4a5a", top="#9a6a8a", hor="#f0c8d0"),   # dusty rose
    dict(tint="#2a3a5f", trim="#9aa8c4", accent="#e8c15a", wood="#4a3f3a", sky="#8fa8d8", sun="#dfe8ff", fog="#2a3a5f", top="#24366f", hor="#8fa8d8"),   # midnight blue
    dict(tint="#7a6a3a", trim="#d9c98a", accent="#b5543a", wood="#8a6a2a", sky="#f4e0a0", sun="#fff0b8", fog="#7a6a3a", top="#e0b050", hor="#f4e0a0"),   # golden hay
    dict(tint="#4a4a6a", trim="#b4b4d0", accent="#d9a0c0", wood="#5a4a50", sky="#b8b8e0", sun="#f0e8ff", fog="#4a4a6a", top="#5a5a9a", hor="#b8b8e0"),   # slate violet
    dict(tint="#3a6a60", trim="#b4d4c8", accent="#e08a5a", wood="#6a5a4a", sky="#a8e0d0", sun="#f0fff4", fog="#3a6a60", top="#3a8a80", hor="#a8e0d0"),   # sea glass
    dict(tint="#7a4a3a", trim="#e0d0b8", accent="#3a8a8a", wood="#6a3a2a", sky="#f0d0b0", sun="#fff0d8", fog="#7a4a3a", top="#c06a4a", hor="#f0d0b0"),   # rust and cream
    dict(tint="#4a3a5a", trim="#c0b0d0", accent="#e0b04a", wood="#5a4038", sky="#c0a8e0", sun="#fff0e0", fog="#4a3a5a", top="#6a4a8a", hor="#c0a8e0"),   # plum evening
]
AFFINITY = {  # what suits each kind of place
    "street_day": dict(pieces=["market_stall", "lamp_post", "banner", "signboard", "crate_stack", "tree_big"], floors=["none"], particles=["dust", "petal"]),
    "street_night": dict(pieces=["lamp_post", "market_stall", "crate_stack", "signboard", "banner"], floors=["none"], particles=["fly", "dust"]),
    "office": dict(pieces=["shelf", "big_window", "column", "statue", "banner", "signboard"], floors=["rug", "planks", "checker"], particles=["dust"]),
    "yard": dict(pieces=["crate_stack", "barrel_stack", "fence", "tank", "hay_bales", "signboard"], floors=["stones", "path"], particles=["dust", "sand"]),
    "workshop": dict(pieces=["pipes", "tank", "beam_frame", "shelf", "crate_stack", "barrel_stack"], floors=["planks", "stones", "checker"], particles=["ember", "dust"]),
    "lab": dict(pieces=["shelf", "tank", "big_window", "pipes", "statue", "signboard"], floors=["checker", "rug"], particles=["dust", "fly"]),
    "cave": dict(pieces=["crystals", "stalagmites", "beam_frame", "rock_cluster", "crate_stack", "signboard", "barrel_stack"], floors=["stones", "path"], particles=["ember", "dust"]),
    "desert": dict(pieces=["cactus", "rock_cluster", "tent", "signboard", "barrel_stack", "fence", "hay_bales"], floors=["path", "stones"], particles=["sand", "dust"]),
    "forest": dict(pieces=["tree_big", "mushrooms", "rock_cluster", "tent", "fence", "signboard"], floors=["path", "stones"], particles=["fly", "petal", "snow"]),
    "harbor": dict(pieces=["mast_flag", "crate_stack", "barrel_stack", "market_stall", "lamp_post", "signboard"], floors=["planks"], particles=["dust", "petal"]),
    "castle": dict(pieces=["column", "arch", "fireplace", "chandelier", "banner", "statue", "big_window"], floors=["checker", "rug", "stones"], particles=["dust"]),
}
LOC_NAMES = {"street_day": "city street by day", "street_night": "city street at night", "office": "office or study", "yard": "yard",
             "workshop": "workshop or factory", "lab": "laboratory", "cave": "mine or cave", "desert": "desert town", "forest": "forest",
             "harbor": "harbor and docks", "castle": "castle hall"}


def _rng(*parts):
    return random.Random(int(hashlib.sha256("|".join(parts).encode()).hexdigest()[:12], 16))


def fallback(title, loc, signs=()):
    """A seeded random design: always valid, always different for a different story."""
    r = _rng(title, loc); aff = AFFINITY.get(loc, AFFINITY["office"]); fam = dict(r.choice(FAMILIES))
    slots = r.sample(list(catalog.SLOTS), 5)
    names = r.sample(aff["pieces"], min(4, len(aff["pieces"])))
    pieces = [{"name": n, "slot": s} for n, s in zip(names, slots)]
    for p in pieces:
        if p["name"] == "signboard":
            words = [w for w in re.findall(r"[A-Za-z]+", signs[0] if signs else title) if len(w) > 2][:3]
            p["text"] = " ".join(words).upper()[:20] or "WELCOME"
    return {"palette": {k: fam[k] for k in ("tint", "trim", "accent", "wood", "sky")} | {"tint_strength": round(r.uniform(0.16, 0.3), 2)},
            "light": {k: fam[k] for k in ("sun", "fog", "top", "hor")} | {"fogK": round(r.uniform(0.8, 1.2), 2)},
            "floor": r.choice(aff["floors"]), "pieces": pieces, "particles": r.choice(aff["particles"])}


def _clean(d, fb):
    """Keep what is valid in the LLM's design, take the rest from the fallback."""
    out = {"palette": dict(fb["palette"]), "light": dict(fb["light"]), "floor": fb["floor"], "pieces": fb["pieces"], "particles": fb["particles"]}
    if not isinstance(d, dict):
        return out
    for k in ("tint", "trim", "accent", "wood", "sky"):
        v = (d.get("palette") or {}).get(k)
        if isinstance(v, str) and HEX.match(v): out["palette"][k] = v
    ts = (d.get("palette") or {}).get("tint_strength")
    if isinstance(ts, (int, float)): out["palette"]["tint_strength"] = round(min(0.35, max(0.1, float(ts))), 2)
    for k in ("sun", "sky", "gnd", "fog", "top", "hor"):
        v = (d.get("light") or {}).get(k)
        if isinstance(v, str) and HEX.match(v): out["light"][k] = v
    fk = (d.get("light") or {}).get("fogK")
    if isinstance(fk, (int, float)): out["light"]["fogK"] = round(min(1.4, max(0.6, float(fk))), 2)
    if d.get("floor") in catalog.FLOORS: out["floor"] = d["floor"]
    if d.get("particles") in catalog.PARTICLES: out["particles"] = d["particles"]
    pcs, used = [], set()
    for p in d.get("pieces") or []:
        if isinstance(p, dict) and p.get("name") in catalog.PIECES and p.get("slot") in catalog.SLOTS and p["slot"] not in used:
            used.add(p["slot"]); item = {"name": p["name"], "slot": p["slot"]}
            if p["name"] == "signboard": item["text"] = re.sub(r"[^A-Z0-9 !?'&-]", "", str(p.get("text", "")).upper())[:20] or "WELCOME"
            pcs.append(item)
    if len(pcs) >= 3: out["pieces"] = pcs[:6]
    return out


PROMPT = """You are the set designer for a stylised 3D cartoon video. Story: "{title}" - {summary}
Design a UNIQUE look for each place below so it does not look like the same place in any other story. Think about who lives or works there and what happened.
Colours must be calm and soothing: muted, harmonious, slightly dark, no neon. Use "#rrggbb" hex colours. Places in one story share a colour family but must still differ from each other.
Places: {places}
For EACH place return:
  "palette": {{"tint": set colour, "trim": stone/metal/trim colour, "accent": cloth/paint colour, "wood": timber colour, "sky": window/sky colour, "tint_strength": 0.12-0.32}},
  "light": {{"sun": light colour, "fog": fog colour, "top": sky top, "hor": sky horizon, "fogK": 0.6-1.4 (below 1 = hazier)}},
  "floor": one of {floors},
  "pieces": 4-5 scenery pieces {{"name": from {pieces}, "slot": from {slots}, "text": only for signboard (1-3 UPPERCASE words from the story)}} using different slots,
  "particles": one of {particles}.
Return ONLY JSON: {{"<place id>": {{...}}, ...}} with exactly these place ids: {ids}"""


def design_places(title, summary, locations, signs=(), use_llm=True, log=print):
    fb = {loc: fallback(title, loc, signs) for loc in locations}
    if not use_llm:
        return fb
    try:
        prompt = PROMPT.format(title=title, summary=summary, places="; ".join(f"{l} = {LOC_NAMES.get(l, l)}" for l in locations),
                               floors=", ".join(catalog.FLOORS), pieces=", ".join(catalog.PIECES), slots=", ".join(catalog.SLOTS),
                               particles=", ".join(catalog.PARTICLES), ids=", ".join(locations))
        raw = llm.generate_json(prompt, log=log, only=("openrouter", "nvidia", "cloudflare"))   # one request; Gemini quota stays free
        out = {loc: _clean(raw.get(loc), fb[loc]) for loc in locations}
        log("[design] set designer used the LLM")
        return out
    except Exception as e:
        log(f"[design] using the seeded fallback design ({str(e)[:120]})")
        return fb
