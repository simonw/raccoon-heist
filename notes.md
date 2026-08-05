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

## Polish round 1

- Title screen now uses a gpt-image-2 hero illustration (low-poly masked
  raccoon clutching a glowing coin by a tipped trash can, 1024×1536 →
  512×768 JPEG) as a masked backdrop behind the CSS title. Removed the CSS
  moon — the art brings its own.
- New rare loot: the ⭐ GOLDEN TV 📺 (value 120, spawn weight 0.35). It's
  heavy — counts as 4 items for the carry-slowdown, so hauling it home is a
  risk/reward waddle.
- Win screen now grants heist ranks: TRASH PANDA ⭐ / CAT BURGLAR ⭐⭐ /
  MASTER OF DISGUISE ⭐⭐⭐.
- Added 🦝 SVG-emoji favicon (also silences the 404 from tests).

## Night-cycle QA round

Automated a full progression test (jump to dawn → win overlay → Night 2 →
lose overlay). It caught another real bug: the win screen's ⭐ rating div
used class `stars`, which collided with the title screen's full-screen
`.stars` CSS — the invisible stretched div swallowed every click on the
"NIGHT 2 ➜" button. Renamed to `.rank-stars`.

Other changes:
- Dawn is dramatic now: sky/fog lerp to mauve, ambient warms and brightens,
  moonlight fades to peach, plus a "Dawn is coming" warning toast.
- `startNight` resets all sky/lighting state (retrying after a dawn loss used
  to keep the morning sky).
- Night 1 goal softened 150 → 120 so a clean first run is winnable;
  escalation is +110/night.

## The hound (night 3+)

New escalation: from night 3 the yards get a patrolling guard dog — a low-poly
brown hound with a spiked red collar and a wagging tail. It wanders between
random spots, and within 12 units it catches your scent and tracks you by
smell (line of sight is irrelevant — it's all nose, shown by a 👃 over its
head and barking). It gives up if you open a 17-unit gap. Getting caught
messages are now source-specific: guard / headlights / hound. Verified
wander → track → caught with an automated test.
