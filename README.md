# Auto 3D Story Shorts (GitHub Actions)

Every day at 19:00 IST the workflow writes a script with a free LLM, voices it with the system voice (espeak-ng),
renders the 3D video in parallel chunks on GitHub runners, and uploads it so it goes live at **04:30 IST**.

| Publish day (IST) | Videos |
|---|---|
| Mon, Tue, Wed, Thu | 1 short (about 60 s, 9:16) |
| Fri | 1 long video (about 3 min, 16:9) + 1 short |
| Sat, Sun | 1 short |

Change this in `config/schedule.json`.

## Setup
1. Push this folder to a GitHub repo (public repos get unlimited Actions minutes; private ones only 2,000 per month and a short needs roughly an hour of render time).
2. Settings > Secrets and variables > Actions > New repository secret. Add the keys you have (never paste them in chat or commit them):
   - LLM (at least one): `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `NVIDIA_API_KEY`, `CF_ACCOUNT_ID` + `CF_API_TOKEN`
   - YouTube: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_REFRESH_TOKEN` (OAuth, scope youtube.upload)
   - Facebook: `FB_PAGE_ID`, `FB_PAGE_TOKEN` (long-lived Page token, pages_manage_posts + publish_video)
   - Telegram: `TG_BOT_TOKEN` (from BotFather), `TG_CHAT_ID` (bot must be admin of the channel)
   Platforms without secrets are skipped.
3. Settings > Actions > General > Workflow permissions: Read and write.
4. Test first: Actions > daily-3d-story > Run workflow with `sample` ticked and `dry_run` ticked. Download the `finished-videos` artifact and check it.

## Notes
- Model names are env vars (`GEMINI_MODEL`, `OPENROUTER_MODEL`, `NVIDIA_MODEL`, `CF_MODEL`); free models rotate, so update them if a provider starts failing.
- A hosted job is capped at 6 hours, so videos are split into 450-frame chunks that render in parallel (one frame at a time per job to keep RAM low). Change `CHUNK_FRAMES` if needed.
- `script.md` in the `finished-videos` artifact lists the facts and sources the model gave. Spot-check them.

## v2 upgrade (emotion, dialogue, smooth transitions, real sound)
- **Characters** now blink, have brows and a mouth, and show ten emotions (happy, excited, shocked, scared, angry, sad, worried, smug, thinking, neutral) with matching body language. In dialogue shots the mouth follows the voice.
- **Worlds:** 11 locations (adds cave/mine, desert, forest, harbor, castle). The story picks one that fits and stays there.
- **Hero props:** 23 close-up objects (gold, dynamite, key, coin...) the camera reveals, then glides to the characters.
- **Transitions:** the camera glides between framings inside a location; a whip-pan with motion blur and a whoosh joins different locations. No more fades.
- **Voice:** Gemini 3.8 TTS, a narrator plus a different voice per character, emotion styles and laughs/sighs. Falls back to espeak if the call fails.
- **Sound:** Lyria 3.5 score (ducked under speech), synthesized whooshes, pops and impacts. Needs `GEMINI_API_KEY`; set secret/env `MUSIC=0` to turn music off, `TTS=espeak` to force the system voice.
- **preview-stills** workflow: about 10 minutes, one still per shot plus a contact sheet (tick *clip* to also check lip-sync). Run it before a full render.

## v2.1: body language and set dressing
- 13 emotions now change the whole body, not just the face: happy = fast, open arms, upright; scared = backs away, trembles, hands to face; sad = slow, slumped, head bowed; interested = slow step toward the camera; disgusted = trunk sways side to side, hands held in; bored = bowed, slow head turns; angry = leans in, stomps; smug = relaxed, slow head turns; thinking = hand to face. Every emotion eases in over 0.35 s after a cut.
- Each world is dressed with 6-8 large props (story-specific ones from the script plus defaults for the place) that bob slightly, and drifting particles: dust, fireflies, blowing sand or embers.

## v2.2: costumes, tiny details, glow, calm palette
- **Costume system** (`engine/src/accessories.js`): 20 roles (cowboy, miner, pirate, wizard, scientist, chef, knight...) that put on a hat, face/neck/torso/back pieces and a held tool. 30 wearable pieces, 18 held tools with their own motion (spinning lasso, swinging pickaxe, flickering torch, swaying lantern), 5 hair styles + bald, skin tones, hair colours and 4 body builds. The script picks a role per character (up to 5 characters), so each story gets its own cast.
- **Tiny details** (`engine/src/details.js`): 23 small touches the script picks for its world: posters/notes/calendars carrying words from the story, steaming teacup, flickering candle, scurrying mouse, perched bird, moth round a light, dangling spider, footprints, spilled coins...
- **Glow:** hero props, lamps, torches, coins, signs get a soft halo; every scene change blooms softly (warm light swell with the whip-pan).
- **Calm palette:** background sets, lights, fog and the final colour grade are darker, less saturated and slightly teal; characters, props and glows stay bright so the eye lands on them. Strength is `CALM` (default 1; 0 = off, 0.5 = half) read by `pipeline/make_story.py`.
- After editing `accessories.js` or `details.js`, run `python pipeline/check_catalog.py` so the script writer's lists stay in sync.

## v3: full HD, maximum colour, a unique set per video, studio voice, Lyria score, livelier acting
- **Quality:** renders at 1080x1920 (shorts) / 1920x1080 (long) by default (`RES=720` for the old size). The post-processing chain now uses a 4x multisampled HDR target so edges stay smooth, JPEG frames are quality 96, chunks are CRF 16, the final file is CRF 17 / slow preset with 256 kbps audio. Chunks are 150 frames at 1080p (`CHUNK_FRAMES` to change), so a render takes longer than before: about 2.25x the pixels.
- **Maximum colour:** the muted "calm" palette is off by default (`CALM=0`). `VIVID=1` (default; 0 = off, up to 1.5) boosts saturation on the set, the characters and the props, lifts sky/fog/light colours, and the final grade adds vibrance (dull colours are lifted more than strong ones), more contrast and less vignette.
- **A set made for each video** (`engine/src/stage.js`): the script writer designs a `world` for the story (sky, horizon, ground, wall and three accent colours, time of day, floor pattern, 2-4 backdrop landmarks). The engine repaints the sky, fog and set toward those colours and builds pieces from them: a patterned floor rug under the actors, bunting, big wall art indoors, outdoor landmarks (tower, arch, pillars, crystals, windmill, pyramid, balloons, neon towers) and floating colour orbs. Layout is seeded from the title. If the model leaves anything out, a saturated fallback palette is picked by title.
- **Voice:** every clip is denoised, EQ'd for clarity, de-essed, gently compressed and faded; the voice bus adds a touch of room. Gemini TTS still speaks (narrator + one voice per character); Lyria is a music model and does not speak.
- **Lyria score under the whole video:** one long track for videos over 75 s, topped up with sections of the same piece (intro, build, twist, resolution) joined by crossfades, so every second has music. It ducks under speech. Needs `GEMINI_API_KEY`.
- **Acting:** newcomers walk in from their side with a stride and a squash-and-stretch landing; excited and happy characters really hop; weight shifts, breathing, listeners glance at the speaker and nod; legs now swing; the camera has a gentle handheld drift.
