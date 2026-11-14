"""Voices (Gemini TTS, espeak fallback), lip-sync envelope, synthesized sound effects, Lyria music and the final mix."""
import array, base64, math, os, random, re, subprocess, time, wave
import requests

SR = 48000
API = "https://generativelanguage.googleapis.com/v1beta/models"
TAG_RE = re.compile(r"<([^>]+)>")
ALLOWED_TAGS = {"laugh", "sigh", "cough", "breath", "short pause"}
NARRATOR_VOICE = os.environ.get("NARRATOR_VOICE", "Charon")
CAST_VOICES = os.environ.get("CAST_VOICES", "Puck,Kore,Fenrir,Aoede,Zephyr,Orus").split(",")
NARRATOR_STYLE = "a gripping documentary storyteller: warm, conversational, natural pauses, rising tension, never robotic"
STYLE = {"neutral": "natural and conversational", "happy": "warm and cheerful", "excited": "excited, fast and breathless",
         "shocked": "stunned, breathless, in disbelief", "scared": "trembling and urgent", "angry": "furious, sharp and loud",
         "sad": "sorrowful and quiet", "worried": "anxious and hesitant", "smug": "smug and playful", "thinking": "thoughtful and slow"}
ESPEAK_VARIANTS = ["m3", "f2", "m5", "f3", "m7", "m1"]


def clean(text):
    """Remove stage tags that are not allowed; returns (text for the voice, text for captions)."""
    voice = TAG_RE.sub(lambda m: m.group(0) if m.group(1).strip().lower() in ALLOWED_TAGS else "", text)
    caption = " ".join(TAG_RE.sub("", text).split())
    return " ".join(voice.split()), caption


def _pcm_to_wav(raw, path, rate=24000):
    w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(raw); w.close()


def tts_gemini(text, voice, style, path):
    key = os.environ.get("GEMINI_API_KEY")
    if not key or os.environ.get("TTS") == "espeak":
        return False
    models = [os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts"), "gemini-3.8-flash-lite-tts"]
    cfgs = [{"voice": voice}, {"prebuiltVoiceConfig": {"voiceName": voice}}]
    for model in models:
        for cfg in cfgs:
            body = {"contents": [{"role": "user", "parts": [{"text": text, "speech_metadata": {"style": style}}]}],
                    "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": cfg}}}
            for attempt in range(3):
                try:
                    r = requests.post(f"{API}/{model}:generateContent", params={"key": key}, json=body, timeout=120)
                except Exception as e:
                    print(f"[tts] {model} error {e}"); break
                if r.status_code == 429:
                    time.sleep(10 * (attempt + 1)); continue
                if r.ok:
                    for part in r.json()["candidates"][0]["content"]["parts"]:
                        d = part.get("inlineData")
                        if d:
                            raw = base64.b64decode(d["data"])
                            if "l16" in d.get("mimeType", "").lower() or "pcm" in d.get("mimeType", "").lower():
                                _pcm_to_wav(raw, path)
                            else:
                                open(path, "wb").write(raw)
                            return True
                    print(f"[tts] {model}: no audio in response")
                else:
                    print(f"[tts] {model} HTTP {r.status_code} {r.text[:200]}")
                break
            if r.status_code == 404:
                break          # unknown model -> next model
    return False


def tts_espeak(text, speaker, path):
    plain = TAG_RE.sub("", text)
    var = "m2" if speaker == "narrator" else ESPEAK_VARIANTS[int(speaker) % len(ESPEAK_VARIANTS)]
    for v in (f"en+{var}", "en-us"):
        try:
            subprocess.run(["espeak-ng", "-v", v, "-s", "160", "-p", "45", "--stdin", "-w", path], input=plain, text=True, check=True); return
        except Exception:
            continue
    raise RuntimeError("espeak-ng failed")


def to_clip(src, dst):
    """48 kHz mono 16-bit, silence trimmed at both ends."""
    cut = "silenceremove=start_periods=1:start_threshold=-45dB"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", f"{cut},areverse,{cut},areverse,aresample={SR}",
                    "-ac", "1", "-sample_fmt", "s16", dst], check=True)


def read_wav(path):
    w = wave.open(path); a = array.array("h"); a.frombytes(w.readframes(w.getnframes())); w.close(); return a


def build_voice_track(shots, out_dir, fps=30):
    """shots: [{key,text,speaker,emotion,location}] -> timeline (start/end per shot), voice samples, lip-sync envelope."""
    clips, used_gemini = [], 0
    for i, s in enumerate(shots):
        raw, final = os.path.join(out_dir, f"{s['key']}_raw.wav"), os.path.join(out_dir, f"{s['key']}.wav")
        vtext, _ = clean(s["text"])
        sp = s["speaker"]
        voice = NARRATOR_VOICE if sp == "narrator" else CAST_VOICES[int(sp) % len(CAST_VOICES)]
        style = NARRATOR_STYLE if sp == "narrator" else "in character, " + STYLE.get(s["emotion"], STYLE["neutral"])
        if sp == "narrator" and s["emotion"] in ("shocked", "scared", "angry", "sad", "excited"):
            style += ", with " + STYLE[s["emotion"]] + " emphasis"
        ok = tts_gemini(vtext, voice, style, raw)
        used_gemini += ok
        if not ok:
            tts_espeak(vtext, sp, raw)
        to_clip(raw, final); os.remove(raw)
        clips.append(read_wav(final)); os.remove(final)
        time.sleep(0.6 if ok else 0)
    print(f"[voice] gemini clips {used_gemini}/{len(shots)}")
    pcm = array.array("h", [0] * int(0.15 * SR)); out, env_src = [], []
    t = len(pcm) / SR
    for i, (s, c) in enumerate(zip(shots, clips)):
        start = t
        pcm.extend(c); t += len(c) / SR
        out.append(dict(key=s["key"], start=round(start, 3), end=round(t, 3), samples=(int(start * SR), len(c))))
        nxt = shots[i + 1] if i + 1 < len(shots) else None
        gap = 0.8 if nxt is None else (0.16 if nxt["speaker"] == s["speaker"] else 0.26) + (0.2 if nxt["location"] != s["location"] else 0)
        pcm.extend([0] * int(gap * SR)); t += gap
    duration = round(out[-1]["end"] + 0.75, 2)
    # lip-sync envelope: loudness per video frame, only for shots where a cast member speaks
    n = int(duration * fps) + 2; env = [0.0] * n; win = SR // fps; vals = []
    for s, o in zip(shots, out):
        if s["speaker"] == "narrator":
            continue
        a0, ln = o["samples"]
        for f in range(int(o["start"] * fps), int(o["end"] * fps) + 1):
            seg = pcm[f * win: f * win + win]
            if not seg: continue
            rms = math.sqrt(sum(x * x for x in seg) / len(seg)); env[f] = rms; vals.append(rms)
    if vals:
        ref = sorted(vals)[int(len(vals) * 0.95)] or 1.0
        env = [min(1.0, (v / ref)) ** 0.7 for v in env]
        env = [round(0.5 * env[i] + 0.5 * (env[i - 1] if i else env[i]), 2) for i in range(n)]
    for o in out: o.pop("samples")
    return out, pcm, env, duration


# ---------------- synthesized sound effects ----------------
def _bell(x): return math.sin(max(0.0, min(1.0, x)) * math.pi)


def sfx_track(duration, whooshes, pops, booms, seed=7):
    rnd = random.Random(seed); N = int((duration + 1) * SR); buf = [0.0] * N

    def add(t0, samples):
        i0 = int(t0 * SR)
        for k, v in enumerate(samples):
            if 0 <= i0 + k < N: buf[i0 + k] += v
    for c in whooshes:                                   # filtered-noise sweep centred on the cut
        n = int(0.6 * SR); y = 0.0; smp = []
        for k in range(n):
            x = k / n; a = 0.03 + 0.85 * _bell(x) ** 1.5
            y += a * (rnd.uniform(-1, 1) - y); smp.append(y * _bell(x) ** 1.2 * 1.6)
        add(c - 0.3, smp)
    for t0 in pops:                                      # bright pop when a sign appears
        n = int(0.16 * SR); smp = []
        for k in range(n):
            t = k / SR; f = 700 + 500 * min(1, t / 0.05)
            smp.append((math.sin(2 * math.pi * f * t) * 0.5 + math.sin(2 * math.pi * f * 2 * t) * 0.15) * math.exp(-t * 24))
        add(t0, smp)
    for t0 in booms:                                     # low impact on shock / fear
        n = int(0.8 * SR); smp = []
        for k in range(n):
            t = k / SR
            smp.append(math.sin(2 * math.pi * (62 - 24 * t) * t) * math.exp(-t * 5) * 0.9 + rnd.uniform(-1, 1) * math.exp(-t * 20) * 0.35)
        add(t0, smp)
    return array.array("h", [max(-32767, min(32767, int(v * 18000))) for v in buf])


def write_wav(path, samples, rate=SR):
    w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(samples.tobytes()); w.close()


# ---------------- Lyria music ----------------
def lyria_music(prompt, duration, out_mp3):
    key = os.environ.get("GEMINI_API_KEY")
    if not key or os.environ.get("MUSIC") == "0":
        return False
    model = os.environ.get("LYRIA_MODEL") or ("lyria-3-clip-preview" if duration <= 75 else "lyria-3.5")
    text = prompt.strip().rstrip(".") + ". Instrumental only, no vocals, no lyrics. Cinematic background score that supports a narrated story."
    if model == "lyria-3.5": text += f" About {int(duration // 60) + 1} minutes long, with a slow build."
    try:
        r = requests.post(f"{API}/{model}:generateContent", params={"key": key}, json={"contents": [{"parts": [{"text": text}]}]}, timeout=300)
        if not r.ok:
            print(f"[music] {model} HTTP {r.status_code} {r.text[:200]}"); return False
        for part in r.json()["candidates"][0]["content"]["parts"]:
            if part.get("inlineData"):
                open(out_mp3, "wb").write(base64.b64decode(part["inlineData"]["data"])); return True
    except Exception as e:
        print(f"[music] failed {e}")
    return False


def mix(voice_wav, sfx_wav, music_mp3, duration, out_wav):
    """voice + sfx + music (ducked under speech) -> one stereo track."""
    fmt = "aformat=sample_fmts=fltp:channel_layouts=stereo"
    if music_mp3 and os.path.exists(music_mp3):
        fc = (f"[0:a]{fmt},asplit=2[v1][v2];"
              f"[2:a]aloop=loop=-1:size=2147483647,atrim=0:{duration},afade=t=in:d=1.5,afade=t=out:st={max(0, duration - 2.5)}:d=2.5,{fmt},volume=0.6[m];"
              f"[m][v2]sidechaincompress=threshold=0.03:ratio=10:attack=15:release=450[md];"
              f"[1:a]{fmt},volume=0.9[s];[v1][md][s]amix=inputs=3:duration=first:normalize=0")
        ins = ["-i", voice_wav, "-i", sfx_wav, "-i", music_mp3]
    else:
        fc = f"[0:a]{fmt}[v];[1:a]{fmt},volume=0.9[s];[v][s]amix=inputs=2:duration=first:normalize=0"
        ins = ["-i", voice_wav, "-i", sfx_wav]
    fc += ",loudnorm=I=-14:TP=-1.5:LRA=11,alimiter=limit=0.95[out]"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *ins, "-filter_complex", fc, "-map", "[out]", "-ar", str(SR), "-ac", "2", out_wav], check=True)
