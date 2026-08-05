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
