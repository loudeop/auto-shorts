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
