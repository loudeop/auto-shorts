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

## v2.3: a unique look for every place, smoother transitions
- **Set designer** (`pipeline/design.py`): for each place in a story, one request to **OpenRouter** (`OPENROUTER_API_KEY`) returns a palette, light colours, floor style (rug, planks, checker, stones, path), 4-5 big scenery pieces (columns, arches, fireplace, crystals, market stall, signboard with story words...) and particles (dust, fireflies, sand, embers, snow, petals). Without a key, or if the call fails, a seeded random design is used (same story = same design, different story = different design), so this step never stops a video. It uses only OpenRouter/NVIDIA/Cloudflare, so Gemini's quota stays free for scripts and voices. OpenRouter's free tier is limited (around 50 requests a day, failed attempts count), one request per video is used here.
- **Scenery library** (`engine/src/setpieces.js`): 26 pieces and 5 floor styles. After editing it run `python pipeline/check_catalog.py`.
- **Transitions:** characters now glide to their new spots, pop in and shrink out instead of cutting; the camera glides between framings inside a place; a place change is a whip-pan with a slight zoom, blur and a warm bloom, eased in and out.
- **Look fixes:** the cave and castle are much brighter (dark places are no longer darkened further), shadows are lifted to a soft teal instead of black, glows are smaller and fainter, and bloom no longer blows out faces.

## v2.4: colour filter over everything
- Every video now gets a **navy** colour filter (a gradient map by brightness - deep navy shadows, blue mids, warm cream lights - blended with the original colours so characters keep some colour and warm faces).
- Presets in `engine/src/filters.json`: navy, teal, plum, warm, sepia, none. Change the default in `pipeline/make_story.py` (`os.environ.get("FILTER", "navy")`), or set `FILTER` / `FILTER_STRENGTH` (0 to 1) as environment variables.
- Preview on any existing video, with the same maths as the renderer: `python pipeline/colorfilter.py in.mp4 out.mp4 navy 0.5`

## v2.5: scene movements, props in hands, dense finishing filter
- **Movement per scene** (`engine/src/motion.js`): each shot can give a character an action - one of 23 ready-made ones (wave, jump, swing, fall, run_in, cower, dance...) or a CUSTOM one written for that scene as keyframes (arms, lean, sway, spin, sideways/forward/up travel, head, crouch, legs walking/spread). Deliberately simple: a flat cut-out character, no physics. If the script writer gives none, verbs in the sentence pick one ("ran in" = run_in, "fell" = fall).
- **Props in hands:** a scene prop with a "holder" sits in that character's hand and moves with their arm (axe + swing). Basic props come from 23 recipes or are built from simple shapes (box, cylinder, sphere, cone, torus, disc) and exist only for their shot, with pop/drop/slide/rise/swing_in transitions.
- **Dense finishing filter** (`pipeline/finish.py`): runs after the video is rendered and mixed. `FINISH_FILTER` (navy, teal, plum, warm, sepia, none) and `FINISH_STRENGTH` (0 to 1, default 0.8). The in-engine filter now defaults to none so colour is not applied twice. The preview workflow applies the same filter to its stills.
- Run `python pipeline/gen_catalog.py` after changing any library in `engine/src`, then `python pipeline/check_catalog.py`.
