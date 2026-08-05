# Raccoon Heist — build notes

Working log for the 3D browser game build. Newest entries at the bottom.

## 2026-08-05 — Kickoff

Read the two brief images: a low-poly isometric night scene of raccoons sneaking
around trash cans outside glowing suburban windows (with a gold coin on the
ground), plus a product blurb: a team of thieving raccoons pulling off
light-hearted heists, dodging the police, escaping with the loot.

**Plan:**
- Three.js game, vendored locally (no CDN dependency at runtime).
- Night-time suburban backyard heist: play a raccoon, sneak around houses and
  fences, grab loot (coins, shinies, leftover pizza), avoid patrolling
  flashlight cones, dump loot in your trash-can stash to bank it.
- Mobile-first: virtual joystick + action button, also WASD/arrows + mouse on
  desktop.
- Textures generated with OpenAI `gpt-image-2` (grass, brick, fence wood, roof
  shingles, asphalt path, trash-can metal) baked into `textures/` as small
  tileable PNGs so the deployed game never needs the API at runtime.
- Surprises planned: a rival seagull that swoops for dropped loot, and a
  "trash panda frenzy" speed boost when you eat pizza.

**Commit 1:** `index.html` title screen — pure CSS night sky, moon, twinkling
stars, city skyline silhouette, bobbing 🦝, START button. `js/main.js` comes
next; the script tag already points at it.

## Playable core build

- Vendored `three@0.170` module build into `vendor/` (no CDN at runtime).
- Generated 7 tileable textures with OpenAI `gpt-image-2` (low quality, 1024px,
  downscaled to 512px JPEG): grass, siding, fence wood, roof shingles, cracked
  concrete, trash-can metal, soil. Stylized night palette came out great.
- `js/actors.js`: procedural low-poly characters — raccoon (bandit mask,
  striped tail, trotting legs, loot stacks on its back), security guard with
  flashlight, police car with flashing light bar, seagull, and six loot types.
- `js/world.js`: the map — three houses with glowing windows, street for the
  police car, yard fences with sneak gaps, trash cans, trees/bushes, the crew's
  green dumpster hideout (with glowing eyes inside), moon, stars, fireflies,
  fog. Also exports collision obstacles + line-of-sight blockers.
- `js/main.js`: game loop — WASD/joystick movement with collision + dash,
  auto-pickup loot (max 8 carried, slows you down), bank at the dumpster,
  guard vision cones with alert build-up → chase → caught (drop half your
  loot), police headlight sweeps, seagull loot-theft event, homeowner
  window-peek event, pizza frenzy speed boost, dawn timer with sky lightening,
  night-by-night escalation (more guards, bigger goals), win/lose overlays
  with star ratings.
- `js/controls.js`: dynamic touch joystick (appears where you touch, left 62%
  of screen) + DASH button; keyboard WASD/arrows + Space.
- `js/audio.js`: procedural WebAudio — sneaky walking-bass jazz loop, coin/gem
  plings, alarm, squawk, win/lose jingles. No audio files.
- Smoke-tested with Playwright + SwiftShader: no JS errors; brightened
  lighting and lowered camera angle after first screenshots read too dark.

## Mobile canvas bug (critical fix)

Playwright device-emulation testing (390×844, deviceScaleFactor 2) caught a
nasty one: assigning `canvas.style.cssText` AFTER `renderer.setSize()` wiped
the inline width/height styles Three.js sets, so on any real phone (DPR ≥ 2)
the canvas rendered at 2× CSS size — you'd only ever see the top-left quarter
of the game. Desktop tests (DPR 1) masked it completely. Fixed by setting base
styles before `setSize()`. Verified with a projected-marker test: player now
lands dead-center on the emulated phone screen.

Also: guards now notice a raccoon that brushes within 2.4 units of them even
outside the flashlight cone (verified alert → chase → caught in an automated
test), and added a `window.__rh` debug hook used by the Playwright gameplay
tests (pickup PASS, banking PASS, chase/caught PASS).
