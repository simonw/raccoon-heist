// Raccoon Heist — main game. Boots Three.js after the title screen,
// runs the night-heist loop: sneak, grab loot, dodge the law, bank it.

import * as THREE from '../vendor/three.module.js';
import { buildWorld, BOUNDS } from './world.js';
import { makeRaccoon, makeGuard, makePoliceCar, makeSeagull, makeDog, makeLoot, LOOT_TYPES } from './actors.js';
import { Controls } from './controls.js';
import { initAudio, resumeAudio, sfx, toggleMusic } from './audio.js';

const NIGHT_LEN = 150; // seconds per night
const PLAYER_RADIUS = 0.55;
const MAX_CARRY = 8;

// ---------------------------------------------------------------- HUD & CSS
const css = document.createElement('style');
css.textContent = `
  #hud { position: fixed; inset: 0; pointer-events: none; z-index: 30; display: none;
         font-family: "Trebuchet MS", "Segoe UI", system-ui, sans-serif; }
  .hud-chip { position: fixed; background: rgba(8, 14, 32, 0.72); border: 1px solid rgba(140,170,255,0.25);
              border-radius: 14px; padding: 6px 12px; color: #eaf0ff; font-weight: 700;
              font-size: clamp(13px, 3.4vw, 17px); backdrop-filter: blur(3px); }
  #hud-bank { top: max(10px, env(safe-area-inset-top)); left: max(10px, env(safe-area-inset-left)); }
  #hud-carry { top: max(10px, env(safe-area-inset-top)); right: max(10px, env(safe-area-inset-right)); }
  #hud-night { top: max(10px, env(safe-area-inset-top)); left: 50%; transform: translateX(-50%);
               text-align: center; padding: 6px 14px; }
  #hud-timebar { width: clamp(90px, 26vw, 180px); height: 6px; background: rgba(255,255,255,0.15);
                 border-radius: 3px; margin-top: 4px; overflow: hidden; }
  #hud-timefill { height: 100%; width: 100%; background: linear-gradient(90deg, #8fb4ff, #ffd23f); border-radius: 3px; }
  #vignette { position: fixed; inset: 0; pointer-events: none; z-index: 25; opacity: 0;
              background: radial-gradient(ellipse at center, transparent 55%, rgba(255, 30, 30, 0.55) 100%);
              transition: opacity 0.25s; }
  #toast { position: fixed; left: 50%; bottom: 18%; transform: translateX(-50%); z-index: 35;
           background: rgba(8, 14, 32, 0.85); color: #ffd23f; border: 1px solid rgba(255,210,63,0.4);
           padding: 10px 20px; border-radius: 999px; font-weight: 700; font-size: clamp(14px, 3.6vw, 18px);
           opacity: 0; transition: opacity 0.3s; pointer-events: none; white-space: nowrap;
           font-family: "Trebuchet MS", system-ui, sans-serif; max-width: 92vw; text-overflow: ellipsis; overflow: hidden; }
  .overlay { position: fixed; inset: 0; z-index: 45; display: flex; flex-direction: column; align-items: center;
             justify-content: center; background: rgba(5, 8, 20, 0.82); color: #eaf0ff; text-align: center;
             font-family: "Trebuchet MS", system-ui, sans-serif; backdrop-filter: blur(4px); padding: 20px; }
  .overlay h2 { font-size: clamp(1.8rem, 8vw, 3.2rem); margin-bottom: 0.4em; text-shadow: 0 4px 20px rgba(120,160,255,0.4); }
  .overlay p { color: #9db4e6; margin-bottom: 1.6em; font-size: clamp(0.95rem, 3.6vw, 1.2rem); line-height: 1.5; }
  .overlay .rank-stars { font-size: clamp(1.6rem, 7vw, 2.6rem); margin-bottom: 0.5em; letter-spacing: 0.15em; }
  .overlay button { font-family: inherit; font-size: clamp(1rem, 4vw, 1.3rem); font-weight: 700; padding: 0.8em 2.2em;
             color: #1a1200; background: linear-gradient(180deg, #ffe27a, #ffc31f 60%, #f0a500); border: none;
             border-radius: 999px; box-shadow: 0 5px 0 #8a5d00, 0 10px 24px rgba(255,195,31,0.3); cursor: pointer; }
  .overlay button:active { transform: translateY(3px); box-shadow: 0 2px 0 #8a5d00; }
  .float-label { position: fixed; z-index: 32; pointer-events: none; font: 800 16px "Trebuchet MS", sans-serif;
                 color: #ffd23f; text-shadow: 0 2px 6px #000; transition: transform 0.9s ease-out, opacity 0.9s; }
  #music-btn { position: fixed; bottom: max(12px, env(safe-area-inset-bottom)); left: max(12px, env(safe-area-inset-left));
               z-index: 36; width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(140,170,255,0.3);
               background: rgba(8,14,32,0.7); color: #eaf0ff; font-size: 20px; line-height: 42px; text-align: center;
               pointer-events: auto; cursor: pointer; }
`;
document.head.appendChild(css);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div class="hud-chip" id="hud-bank">💰 <span id="bank-val">0</span> / <span id="goal-val">0</span></div>
  <div class="hud-chip" id="hud-night">🌙 <span id="night-val">Night 1</span><div id="hud-timebar"><div id="hud-timefill"></div></div></div>
  <div class="hud-chip" id="hud-carry">🎒 <span id="carry-val">0</span>/${MAX_CARRY}</div>
  <div id="music-btn" title="music">🎷</div>
`;
document.body.appendChild(hud);
const vignette = document.createElement('div');
vignette.id = 'vignette';
document.body.appendChild(vignette);
const toastEl = document.createElement('div');
toastEl.id = 'toast';
document.body.appendChild(toastEl);

let toastTimer = null;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, ms);
}

function floatLabel(text, screenX, screenY, color = '#ffd23f') {
  const el = document.createElement('div');
  el.className = 'float-label';
  el.textContent = text;
  el.style.left = screenX + 'px';
  el.style.top = screenY + 'px';
  el.style.color = color;
  document.body.appendChild(el);
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-70px)';
    el.style.opacity = '0';
  });
  setTimeout(() => el.remove(), 950);
}

// ---------------------------------------------------------------- Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// set base styles BEFORE setSize — setSize writes inline width/height styles
// that must not be clobbered (clobbering them breaks high-DPR phones).
renderer.domElement.style.cssText = 'position:fixed;top:0;left:0;z-index:1;display:block;';
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 220);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------- Game state
const controls = new Controls();
let world = null;
let player = null;
const playerPos = new THREE.Vector3(0, 0, 26);
let playerAngle = Math.PI;
let playerSpeedVis = 0;
let dashTime = -10, dashCooldownUntil = 0, frenzyUntil = -10;
const carried = []; // {kind, value, mesh}
let banked = 0, goal = 200, night = 1;
let nightTime = 0;
let state = 'title'; // title | playing | caught | results
let caughtTimer = 0;
const guards = [];  // {api, pos, angle, waypoints, wpIndex, alert, mode, loseSightT, cone, exclaim}
let policeCar = null, carX = -40, carDir = 1;
const lootItems = []; // {kind, value, group, x, z, taken}
let seagull = null; // {api, state, target, t, from}
let seagullTimer = 18;
let windowEvent = null; // {win, t, circle}
let windowTimer = 14;
let dog = null; // {api, pos, mode, wanderTarget, wanderT, barkT, sniff}
let crew = [];
let lastFrame = performance.now();
let lastDt = 0.016;
let dawnWarned = false;
let camShake = 0;

const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- Helpers
function circleVsObstacles(x, z, r) {
  // returns corrected [x, z] pushed out of all obstacles
  for (const o of world.obstacles) {
    if (o.type === 'box') {
      const nx = Math.max(o.minX, Math.min(x, o.maxX));
      const nz = Math.max(o.minZ, Math.min(z, o.maxZ));
      const dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * r;
          z = nz + (dz / d) * r;
        } else {
          // center inside box: push out along smallest penetration
          const pl = x - o.minX, pr = o.maxX - x, pt = z - o.minZ, pb = o.maxZ - z;
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) x = o.minX - r; else if (m === pr) x = o.maxX + r;
          else if (m === pt) z = o.minZ - r; else z = o.maxZ + r;
        }
      }
    } else {
      const dx = x - o.x, dz = z - o.z;
      const rr = r + o.r;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        x = o.x + (dx / d) * rr;
        z = o.z + (dz / d) * rr;
      }
    }
  }
  x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, x));
  z = Math.max(BOUNDS.minZ, Math.min(BOUNDS.maxZ, z));
  return [x, z];
}

function losBlocked(x1, z1, x2, z2) {
  for (const b of world.losBlockers) {
    // 2D segment vs AABB slab test
    const dx = x2 - x1, dz = z2 - z1;
    let tmin = 0, tmax = 1;
    if (Math.abs(dx) < 1e-8) {
      if (x1 < b.minX || x1 > b.maxX) continue;
    } else {
      let t1 = (b.minX - x1) / dx, t2 = (b.maxX - x1) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dz) < 1e-8) {
      if (z1 < b.minZ || z1 > b.maxZ) continue;
    } else {
      let t1 = (b.minZ - z1) / dz, t2 = (b.maxZ - z1) / dz;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    return true;
  }
  return false;
}

function randomLootSpot() {
  for (let tries = 0; tries < 40; tries++) {
    const x = BOUNDS.minX + 2 + Math.random() * (BOUNDS.maxX - BOUNDS.minX - 4);
    const z = -8 + Math.random() * (BOUNDS.maxZ - 4 + 8);
    if (Math.hypot(x - world.hideoutPos.x, z - world.hideoutPos.z) < 6) continue;
    let ok = true;
    for (const o of world.obstacles) {
      if (o.type === 'box') {
        if (x > o.minX - 1 && x < o.maxX + 1 && z > o.minZ - 1 && z < o.maxZ + 1) { ok = false; break; }
      } else if (Math.hypot(x - o.x, z - o.z) < o.r + 1) { ok = false; break; }
    }
    if (ok) return [x, z];
  }
  return [0, 10];
}

function pickLootKind() {
  const entries = Object.entries(LOOT_TYPES);
  const total = entries.reduce((s, [, v]) => s + v.weight, 0);
  let r = Math.random() * total;
  for (const [kind, v] of entries) {
    r -= v.weight;
    if (r <= 0) return kind;
  }
  return 'coin';
}

function worldToScreen(v3) {
  const v = v3.clone().project(camera);
  return [(v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight];
}

// ---------------------------------------------------------------- Setup
function spawnLoot(count) {
  for (const l of lootItems) scene.remove(l.group);
  lootItems.length = 0;
  for (let i = 0; i < count; i++) {
    const kind = pickLootKind();
    const [x, z] = randomLootSpot();
    const group = makeLoot(kind);
    group.position.set(x, 0, z);
    scene.add(group);
    lootItems.push({ kind, value: LOOT_TYPES[kind].value, group, x, z, taken: false });
  }
}

function makeVisionCone(range, halfAngleDeg) {
  const angle = THREE.MathUtils.degToRad(halfAngleDeg);
  const geo = new THREE.ConeGeometry(Math.tan(angle) * range, range, 24, 1, true);
  const matC = new THREE.MeshBasicMaterial({
    color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide,
    depthWrite: false,
  });
  const cone = new THREE.Mesh(geo, matC);
  cone.rotation.x = -Math.PI / 2; // point along +z
  cone.position.set(0, 0.9, range / 2);
  const wrap = new THREE.Group();
  wrap.add(cone);
  return { wrap, mat: matC };
}

function addGuard(route, speedBoost = 0) {
  const api = makeGuard();
  scene.add(api.group);
  const cone = makeVisionCone(11, 26);
  api.group.add(cone.wrap);
  const exclaim = document.createElement('div');
  exclaim.className = 'float-label';
  exclaim.style.transition = 'none';
  exclaim.style.fontSize = '26px';
  exclaim.style.display = 'none';
  exclaim.textContent = '❗';
  document.body.appendChild(exclaim);
  const g = {
    api, cone, exclaim,
    pos: route[0].clone(),
    angle: 0,
    waypoints: route,
    wpIndex: 1,
    alert: 0,
    mode: 'patrol',
    loseSightT: 0,
    baseSpeed: 2.3 + speedBoost,
    chaseSpeed: 4.9 + speedBoost * 1.4,
  };
  guards.push(g);
}

function clearGuards() {
  for (const g of guards) { scene.remove(g.api.group); g.exclaim.remove(); }
  guards.length = 0;
}

async function setupGame() {
  world = await buildWorld(scene);

  player = makeRaccoon({ shirt: 0x232a3a });
  scene.add(player.group);
  // soft glow that follows the hero so they always read clearly
  const heroLight = new THREE.PointLight(0xbfd4ff, 6, 9, 1.4);
  heroLight.position.set(0, 3, 0);
  player.group.add(heroLight);

  // crew raccoons at the hideout
  for (const [dx, dz, s] of [[-3.6, 0.6, 0.8], [3.6, 0.2, 0.75]]) {
    const c = makeRaccoon({ scale: s, shirt: [0x5a3a6e, 0x2f6b4f][crew.length] });
    c.group.position.set(world.hideoutPos.x + dx, 0, world.hideoutPos.z + dz);
    c.group.rotation.y = Math.random() * Math.PI * 2;
    scene.add(c.group);
    crew.push(c);
  }

  policeCar = makePoliceCar();
  policeCar.group.position.set(carX, 0, world.roadZ);
  scene.add(policeCar.group);

  seagull = { api: makeSeagull(), state: 'away', target: null, t: 0 };
  seagull.api.group.position.set(0, 30, -40);
  scene.add(seagull.api.group);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.8, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  scene.add(shadow);
  seagull.shadow = shadow;

  // window-event ground glow
  const glow = new THREE.Mesh(new THREE.CircleGeometry(5.2, 24), new THREE.MeshBasicMaterial({ color: 0xffd88a, transparent: true, opacity: 0, depthWrite: false }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.04;
  scene.add(glow);
  windowEvent = { active: false, t: 0, win: null, circle: glow, cx: 0, cz: 0 };
}

function startNight(n) {
  night = n;
  goal = 120 + (n - 1) * 110;
  nightTime = 0;
  banked = 0;
  for (const c of carried) player.lootAnchor.remove(c.mesh);
  carried.length = 0;
  playerPos.set(0, 0, 26);
  playerAngle = Math.PI;
  frenzyUntil = -10;
  clearGuards();
  const routes = world.patrolRoutes;
  const boost = (n - 1) * 0.25;
  if (n === 1) addGuard(routes[2], boost);
  else if (n === 2) { addGuard(routes[0], boost); addGuard(routes[1], boost); }
  else { addGuard(routes[0], boost); addGuard(routes[1], boost); addGuard(routes[2], boost); }
  spawnLoot(16 + n * 4);
  // night 3+: they bring out the hound — tracks by scent, no flashlight needed
  if (dog) { scene.remove(dog.api.group); dog.sniff.remove(); dog = null; }
  if (n >= 3) {
    const api = makeDog();
    scene.add(api.group);
    const sniff = document.createElement('div');
    sniff.className = 'float-label';
    sniff.style.transition = 'none';
    sniff.style.fontSize = '22px';
    sniff.style.display = 'none';
    document.body.appendChild(sniff);
    dog = { api, sniff, pos: new THREE.Vector3(0, 0, -4), angle: 0, mode: 'wander', wanderTarget: new THREE.Vector3(10, 0, 8), wanderT: 0, barkT: 0 };
    setTimeout(() => toast('🐕 They brought the HOUND tonight. It smells you…', 3400), 3800);
  }
  // reset sky/lighting to deep night (retries can start from a dawn-lit scene)
  scene.background = new THREE.Color(0x0a1024);
  scene.fog.color.setHex(0x0a1024);
  world.ambient.intensity = 1.25;
  world.ambient.color.setHex(0x4a5c92);
  world.moonLight.intensity = 1.35;
  world.moonLight.color.setHex(0xaec4ff);
  world.hemi.intensity = 0.85;
  dawnWarned = false;
  carX = -40; carDir = 1;
  seagullTimer = 15 + Math.random() * 15;
  windowTimer = 10 + Math.random() * 12;
  $('night-val').textContent = `Night ${n}`;
  $('goal-val').textContent = goal;
  $('bank-val').textContent = '0';
  $('carry-val').textContent = '0';
  state = 'playing';
  hud.style.display = 'block';
  if (n === 1) toast('Grab shinies 💎 — stash them in the crew dumpster! 🗑️', 4200);
  else toast(`Night ${n}: more heat, bigger score. Stay in the shadows.`, 3600);
}

// ---------------------------------------------------------------- Results
function showResults(won) {
  state = 'results';
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  const ratio = banked / goal;
  const [stars, rank] = ratio >= 2 ? ['⭐⭐⭐', 'MASTER OF DISGUISE'] : ratio >= 1.4 ? ['⭐⭐', 'CAT BURGLAR'] : ['⭐', 'TRASH PANDA'];
  if (won) {
    sfx.win();
    overlay.innerHTML = `
      <h2>NIGHT ${night} CLEAR! 🦝</h2>
      <div class="rank-stars">${stars}</div>
      <p><b style="color:#ffd23f">Rank: ${rank}</b><br>
      The crew banked <b style="color:#ffd23f">${banked}</b> in shiny loot (goal ${goal}).<br>
      Word on the street: an even bigger score tomorrow…</p>
      <button id="next-btn">NIGHT ${night + 1} ➜</button>`;
  } else {
    sfx.lose();
    overlay.innerHTML = `
      <h2>THE SUN CAME UP ☀️</h2>
      <p>Only <b style="color:#ffd23f">${banked}</b> of ${goal} banked before dawn.<br>
      The crew scattered into the hedges. Tonight, we go again.</p>
      <button id="next-btn">RETRY NIGHT ${night}</button>`;
  }
  document.body.appendChild(overlay);
  overlay.querySelector('#next-btn').addEventListener('click', () => {
    overlay.remove();
    resumeAudio();
    startNight(won ? night + 1 : night);
  });
}

// ---------------------------------------------------------------- Caught
function onCaught(source) {
  state = 'caught';
  caughtTimer = 2.0;
  camShake = 0.7;
  sfx.caught();
  vignette.style.opacity = '1';
  const dropCount = Math.ceil(carried.length / 2);
  for (let i = 0; i < dropCount; i++) {
    const item = carried.pop();
    player.lootAnchor.remove(item.mesh);
    // scatter it back on the ground near the catch point
    const a = Math.random() * Math.PI * 2, d = 2 + Math.random() * 3;
    let [lx, lz] = circleVsObstacles(playerPos.x + Math.cos(a) * d, playerPos.z + Math.sin(a) * d, 0.5);
    const group = makeLoot(item.kind);
    group.position.set(lx, 0, lz);
    scene.add(group);
    lootItems.push({ kind: item.kind, value: item.value, group, x: lx, z: lz, taken: false });
  }
  updateCarryHUD();
  const who = source === 'dog' ? 'The hound ran you off!' : source === 'car' ? 'Caught in the headlights!' : 'The guard shooed you off!';
  toast('Busted! 🚨 ' + (dropCount ? 'You dropped some loot!' : who), 3000);
  for (const g of guards) { g.alert = 0; g.mode = 'patrol'; }
}

function updateCarryHUD() {
  $('carry-val').textContent = carried.length;
  $('hud-carry').style.borderColor = carried.length >= MAX_CARRY ? 'rgba(255,90,90,0.8)' : 'rgba(140,170,255,0.25)';
}

// ---------------------------------------------------------------- Per-frame updates
const tmpV = new THREE.Vector3();

function updatePlayer(dt) {
  controls.update();
  let mx = controls.moveX, mz = controls.moveZ;
  const now = performance.now() / 1000;

  if (controls.consumeDash() && now > dashCooldownUntil) {
    dashTime = now;
    dashCooldownUntil = now + 1.4;
    sfx.dash();
  }
  const dashing = now - dashTime < 0.28;
  const frenzy = now < frenzyUntil;
  const carryWeight = carried.reduce((s, c) => s + (c.kind === 'tv' ? 4 : 1), 0);
  const carryPenalty = 1 - Math.min(0.45, carryWeight * 0.045);
  let speed = 7.2 * carryPenalty * (frenzy ? 1.55 : 1) * (dashing ? 2.1 : 1);

  const mlen = Math.hypot(mx, mz);
  if (mlen > 0.05) {
    playerAngle = Math.atan2(mx, mz);
    playerSpeedVis = Math.min(1, mlen) * (dashing ? 1.6 : 1);
  } else if (dashing) {
    // dash continues in facing direction
    mx = Math.sin(playerAngle); mz = Math.cos(playerAngle);
    playerSpeedVis = 1.4;
  } else {
    playerSpeedVis *= Math.max(0, 1 - dt * 8);
    speed = 0;
  }

  if (speed > 0) {
    let nx = playerPos.x + mx * speed * dt;
    let nz = playerPos.z + mz * speed * dt;
    [nx, nz] = circleVsObstacles(nx, nz, PLAYER_RADIUS);
    playerPos.x = nx; playerPos.z = nz;
  }

  player.group.position.copy(playerPos);
  const targetRot = playerAngle;
  let dr = targetRot - player.group.rotation.y;
  while (dr > Math.PI) dr -= Math.PI * 2;
  while (dr < -Math.PI) dr += Math.PI * 2;
  player.group.rotation.y += dr * Math.min(1, dt * 14);
  player.animate(dt, playerSpeedVis);

  // carried loot bobs on the back
  carried.forEach((c, i) => {
    c.mesh.position.y = 0.25 + i * 0.34 + Math.sin(now * 6 + i) * 0.03;
    c.mesh.rotation.y += dt * 2;
  });

  // pickup
  for (const l of lootItems) {
    if (l.taken) continue;
    if (Math.hypot(l.x - playerPos.x, l.z - playerPos.z) < 1.15) {
      if (l.kind === 'pizza') {
        l.taken = true;
        scene.remove(l.group);
        frenzyUntil = now + 6;
        sfx.frenzy();
        toast('🍕 PIZZA FRENZY! Zoom zoom!', 2200);
        continue;
      }
      if (carried.length >= MAX_CARRY) {
        toast('Paws full! Bank it at the dumpster 🗑️', 1800);
        continue;
      }
      l.taken = true;
      scene.remove(l.group);
      const mini = makeLoot(l.kind);
      mini.scale.setScalar(0.65);
      player.lootAnchor.add(mini);
      carried.push({ kind: l.kind, value: l.value, mesh: mini });
      if (l.kind === 'tv') {
        toast('📺 THE GOLDEN TV! Haul it home… slowly.', 3000);
        camShake = Math.max(camShake, 0.25);
      }
      (l.kind === 'coin' ? sfx.coin : l.kind === 'gem' || l.kind === 'ring' || l.kind === 'tv' ? sfx.gem : sfx.munch)();
      const [sx, sy] = worldToScreen(tmpV.set(playerPos.x, 1.5, playerPos.z));
      floatLabel(`+${l.value}`, sx, sy);
      updateCarryHUD();
    }
  }
  // prune taken loot
  for (let i = lootItems.length - 1; i >= 0; i--) if (lootItems[i].taken) lootItems.splice(i, 1);

  // banking
  if (carried.length && Math.hypot(playerPos.x - world.hideoutPos.x, playerPos.z - world.hideoutPos.z) < 3.4) {
    let total = 0;
    for (const c of carried) { total += c.value; player.lootAnchor.remove(c.mesh); }
    carried.length = 0;
    banked += total;
    sfx.bank();
    $('bank-val').textContent = banked;
    updateCarryHUD();
    const [sx, sy] = worldToScreen(tmpV.set(world.hideoutPos.x, 3, world.hideoutPos.z));
    floatLabel(`BANKED +${total}!`, sx, sy, '#7fff9e');
    camShake = Math.max(camShake, 0.15);
    for (const c of crew) c.group.position.y = 0.5; // lil celebratory hop
    if (banked >= goal) toast('Goal reached! Keep looting or savor the win 😎', 3000);
  }
  // frenzy visual: tail wag speed & vignette tint
  player.tail.rotation.z = frenzy ? Math.sin(now * 20) * 0.5 : player.tail.rotation.z;
}

function updateGuards(dt) {
  const now = performance.now() / 1000;
  let maxAlertRatio = 0;
  for (const g of guards) {
    // --- movement
    let speed = 0;
    if (g.mode === 'patrol' || g.mode === 'return') {
      const wp = g.waypoints[g.wpIndex];
      tmpV.set(wp.x - g.pos.x, 0, wp.z - g.pos.z);
      const d = tmpV.length();
      if (d < 0.8) { g.wpIndex = (g.wpIndex + 1) % g.waypoints.length; }
      else {
        tmpV.normalize();
        const targetAngle = Math.atan2(tmpV.x, tmpV.z);
        let da = targetAngle - g.angle;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        g.angle += da * Math.min(1, dt * 3);
        speed = g.baseSpeed;
        g.pos.x += Math.sin(g.angle) * speed * dt;
        g.pos.z += Math.cos(g.angle) * speed * dt;
      }
    } else if (g.mode === 'chase') {
      tmpV.set(playerPos.x - g.pos.x, 0, playerPos.z - g.pos.z);
      const d = tmpV.length();
      tmpV.normalize();
      const targetAngle = Math.atan2(tmpV.x, tmpV.z);
      let da = targetAngle - g.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      g.angle += da * Math.min(1, dt * 6);
      speed = g.chaseSpeed;
      g.pos.x += Math.sin(g.angle) * speed * dt;
      g.pos.z += Math.cos(g.angle) * speed * dt;
      if (d < 1.35 && state === 'playing') onCaught(g);
    }
    [g.pos.x, g.pos.z] = circleVsObstacles(g.pos.x, g.pos.z, 0.6);
    g.api.group.position.set(g.pos.x, 0, g.pos.z);
    g.api.group.rotation.y = g.angle;
    g.api.animate(dt, speed / 4);

    // --- vision
    const dx = playerPos.x - g.pos.x, dz = playerPos.z - g.pos.z;
    const dist = Math.hypot(dx, dz);
    const inRange = dist < 11;
    let sees = false;
    if (inRange) {
      const dirAngle = Math.atan2(dx, dz);
      let da = dirAngle - g.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < THREE.MathUtils.degToRad(28)) {
        sees = !losBlocked(g.pos.x, g.pos.z, playerPos.x, playerPos.z);
      }
      // guards notice a raccoon brushing right past them, cone or not
      if (dist < 2.4) sees = true;
    }
    if (sees && state === 'playing') {
      const rate = 55 + (1 - dist / 11) * 130;
      g.alert = Math.min(100, g.alert + rate * dt);
      if (g.alert >= 100 && g.mode !== 'chase') {
        g.mode = 'chase';
        sfx.alert();
        toast('You’ve been spotted! RUN! 🏃💨', 2000);
      }
    } else {
      g.alert = Math.max(0, g.alert - 26 * dt);
      if (g.mode === 'chase') {
        g.loseSightT += dt;
        if (g.loseSightT > 3.5 || g.alert <= 0) {
          g.mode = 'patrol';
          g.loseSightT = 0;
          // head to nearest waypoint
          let best = 0, bd = 1e9;
          g.waypoints.forEach((wp, i) => {
            const d = Math.hypot(wp.x - g.pos.x, wp.z - g.pos.z);
            if (d < bd) { bd = d; best = i; }
          });
          g.wpIndex = best;
        }
      }
    }
    if (sees) g.loseSightT = 0;

    // cone color: yellow -> orange -> red
    const a = g.alert / 100;
    maxAlertRatio = Math.max(maxAlertRatio, a);
    g.cone.mat.color.setHSL(0.13 - a * 0.13, 1, 0.62);
    g.cone.mat.opacity = 0.11 + a * 0.14;

    // exclamation UI
    if (g.alert > 25) {
      const [sx, sy] = worldToScreen(tmpV.set(g.pos.x, 2.9, g.pos.z));
      g.exclaim.style.display = 'block';
      g.exclaim.style.left = (sx - 10) + 'px';
      g.exclaim.style.top = (sy - 20) + 'px';
      g.exclaim.textContent = g.mode === 'chase' ? '‼️' : '❓';
    } else {
      g.exclaim.style.display = 'none';
    }
  }
  vignette.style.opacity = state === 'caught' ? '1' : String(maxAlertRatio * 0.8);
}

function updatePoliceCar(dt) {
  const speed = 7 + night * 1.2;
  carX += carDir * speed * dt;
  if (carX > 46) { carDir = -1; }
  if (carX < -46) { carDir = 1; }
  policeCar.group.position.set(carX, 0, world.roadZ);
  policeCar.group.rotation.y = carDir > 0 ? Math.PI / 2 : -Math.PI / 2;
  policeCar.animate(dt);

  // headlight beam catch: on the road, ahead of the car
  if (state === 'playing') {
    const ahead = (playerPos.x - carX) * carDir;
    if (Math.abs(playerPos.z - world.roadZ) < 4 && ahead > 0 && ahead < 12) {
      for (const g of guards) g.alert = Math.min(100, g.alert + 240 * dt);
      if (Math.hypot(playerPos.x - carX, playerPos.z - world.roadZ) < 3) {
        onCaught('car');
      }
    }
  }
}

function updateDog(dt) {
  if (!dog) return;
  const d = dog;
  const distToPlayer = Math.hypot(playerPos.x - d.pos.x, playerPos.z - d.pos.z);
  let speed = 0;
  if (d.mode === 'wander') {
    d.wanderT -= dt;
    const dx = d.wanderTarget.x - d.pos.x, dz = d.wanderTarget.z - d.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1 || d.wanderT <= 0) {
      const [x, z] = randomLootSpot();
      d.wanderTarget.set(x, 0, z);
      d.wanderT = 8 + Math.random() * 6;
    } else {
      speed = 1.6;
      const ta = Math.atan2(dx, dz);
      let da = ta - d.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      d.angle += da * Math.min(1, dt * 3);
      d.pos.x += Math.sin(d.angle) * speed * dt;
      d.pos.z += Math.cos(d.angle) * speed * dt;
    }
    if (distToPlayer < 12 && state === 'playing') {
      d.mode = 'track';
      sfx.bark();
      toast('🐕 The hound caught your scent!', 2000);
    }
  } else { // track — no line of sight needed, it's all nose
    if (distToPlayer > 17 || state !== 'playing') {
      d.mode = 'wander';
    } else {
      speed = 3.5;
      const ta = Math.atan2(playerPos.x - d.pos.x, playerPos.z - d.pos.z);
      let da = ta - d.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      d.angle += da * Math.min(1, dt * 5);
      d.pos.x += Math.sin(d.angle) * speed * dt;
      d.pos.z += Math.cos(d.angle) * speed * dt;
      d.barkT -= dt;
      if (d.barkT <= 0) { sfx.bark(); d.barkT = 1.6 + Math.random(); }
      if (distToPlayer < 1.25 && state === 'playing') onCaught('dog');
    }
  }
  [d.pos.x, d.pos.z] = circleVsObstacles(d.pos.x, d.pos.z, 0.5);
  d.api.group.position.set(d.pos.x, 0, d.pos.z);
  d.api.group.rotation.y = d.angle;
  d.api.animate(dt, speed / 3.5);
  if (d.mode === 'track') {
    const [sx, sy] = worldToScreen(tmpV.set(d.pos.x, 1.9, d.pos.z));
    d.sniff.style.display = 'block';
    d.sniff.style.left = (sx - 10) + 'px';
    d.sniff.style.top = (sy - 20) + 'px';
    d.sniff.textContent = '👃';
  } else {
    d.sniff.style.display = 'none';
  }
}

function updateSeagull(dt) {
  const s = seagull;
  s.api.animate(dt, s.state === 'away' ? 0.3 : 1);
  if (s.state === 'away') {
    seagullTimer -= dt;
    if (seagullTimer <= 0 && lootItems.length > 2) {
      // pick a target loot
      s.target = lootItems[Math.floor(Math.random() * lootItems.length)];
      s.state = 'swoop';
      s.t = 0;
      s.from = new THREE.Vector3(playerPos.x + 30, 26, playerPos.z - 30);
      sfx.squawk();
      toast('🐦 Seagull! It wants YOUR loot!', 2200);
    }
    return;
  }
  if (s.state === 'swoop') {
    s.t += dt / 3.2;
    if (!s.target || s.target.taken) {
      s.state = 'flee'; s.t = 0;
      s.grabbed = null;
      return;
    }
    const tx = s.target.x, tz = s.target.z;
    const p = s.t;
    const x = THREE.MathUtils.lerp(s.from.x, tx, p);
    const z = THREE.MathUtils.lerp(s.from.z, tz, p);
    const y = THREE.MathUtils.lerp(s.from.y, 0.5, p * p);
    s.api.group.position.set(x, y, z);
    s.api.group.lookAt(tx, 0.5, tz);
    s.shadow.position.set(tx, 0.03, tz);
    s.shadow.material.opacity = Math.min(0.45, p * 0.6);
    s.shadow.scale.setScalar(0.4 + p * 0.8);
    if (p >= 1) {
      // grab!
      s.target.taken = true;
      scene.remove(s.target.group);
      const mini = makeLoot(s.target.kind);
      mini.scale.setScalar(0.6);
      mini.position.set(0, -0.3, 0.2);
      s.api.group.add(mini);
      s.grabbed = mini;
      sfx.squawk();
      s.state = 'flee';
      s.t = 0;
      s.shadow.material.opacity = 0;
    }
    return;
  }
  if (s.state === 'flee') {
    s.t += dt / 4;
    s.api.group.position.y += dt * 8;
    s.api.group.position.x -= dt * 14;
    s.api.group.position.z -= dt * 6;
    if (s.t >= 1) {
      if (s.grabbed) { s.api.group.remove(s.grabbed); s.grabbed = null; }
      s.state = 'away';
      seagullTimer = 20 + Math.random() * 22;
      s.api.group.position.set(0, 30, -40);
    }
  }
}

function updateWindowEvent(dt) {
  const we = windowEvent;
  if (!we.active) {
    windowTimer -= dt;
    if (windowTimer <= 0 && world.windows.length) {
      we.active = true;
      we.t = 5;
      we.win = world.windows[Math.floor(Math.random() * world.windows.length)];
      we.cx = we.win.pos.x + we.win.dir.x * 3.4;
      we.cz = we.win.pos.z + we.win.dir.z * 3.4;
      we.circle.position.set(we.cx, 0.04, we.cz);
      we.win.mesh.material.emissive = new THREE.Color(0xffe9b0);
      we.win.mesh.material.emissiveIntensity = 2.0;
      sfx.meow();
      toast('👀 A homeowner is peeking out!', 2200);
    }
    return;
  }
  we.t -= dt;
  const pulse = 0.32 + Math.sin(performance.now() / 130) * 0.08;
  we.circle.material.opacity = we.t > 0.6 ? pulse : pulse * (we.t / 0.6);
  if (state === 'playing' && Math.hypot(playerPos.x - we.cx, playerPos.z - we.cz) < 5.2) {
    for (const g of guards) g.alert = Math.min(100, g.alert + 65 * dt);
  }
  if (we.t <= 0) {
    we.active = false;
    we.circle.material.opacity = 0;
    we.win.mesh.material.emissiveIntensity = we.win.lit ? 1.1 : 0.4;
    we.win.mesh.material.emissive = new THREE.Color(we.win.lit ? 0xffb347 : 0x101b30);
    windowTimer = 16 + Math.random() * 18;
  }
}

function updateDawn(dt) {
  nightTime += dt;
  const frac = Math.min(1, nightTime / NIGHT_LEN);
  $('hud-timefill').style.width = ((1 - frac) * 100) + '%';
  // last 30 seconds: sky begins to lighten
  const dawn = Math.max(0, (nightTime - (NIGHT_LEN - 30)) / 30);
  if (dawn > 0) {
    const sky = new THREE.Color(0x0a1024).lerp(new THREE.Color(0x8a6a86), dawn);
    scene.background = sky;
    scene.fog.color = sky;
    world.ambient.intensity = 1.25 + dawn * 1.4;
    world.ambient.color.setHex(0x4a5c92).lerp(new THREE.Color(0xe8a070), dawn);
    world.moonLight.intensity = 1.35 * (1 - dawn * 0.55);
    world.moonLight.color.setHex(0xaec4ff).lerp(new THREE.Color(0xffc890), dawn);
    world.hemi.intensity = 0.85 + dawn * 0.5;
    if (!dawnWarned && dawn > 0.02) {
      toast('☀️ Dawn is coming — bank what you can!', 2600);
      dawnWarned = true;
    }
  } else {
    dawnWarned = false;
  }
  if (nightTime >= NIGHT_LEN && state === 'playing') {
    showResults(banked >= goal);
  }
}

// ---------------------------------------------------------------- Camera
function updateCamera(dt) {
  const portrait = window.innerHeight > window.innerWidth;
  const dy = portrait ? 16 : 12;
  const dz = portrait ? 12.5 : 12.5;
  tmpV.set(playerPos.x, dy, playerPos.z + dz);
  camera.position.lerp(tmpV, Math.min(1, dt * 4));
  if (camShake > 0) {
    camShake = Math.max(0, camShake - dt * 1.6);
    camera.position.x += (Math.random() - 0.5) * camShake * 0.6;
    camera.position.y += (Math.random() - 0.5) * camShake * 0.4;
  }
  camera.lookAt(playerPos.x, 1, playerPos.z - 2);
}

// ---------------------------------------------------------------- Main loop
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastDt = dt;
  lastFrame = now;
  if (state === 'title') return;

  const t = now / 1000;
  // idle animations always run
  for (const l of lootItems) {
    l.group.position.y = Math.sin(t * 2.4 + l.x) * 0.08;
    l.group.rotation.y += dt * 1.6;
  }
  for (const c of crew) {
    c.animate(dt, 0.05);
    c.group.position.y = Math.max(0, c.group.position.y - dt * 2);
  }
  if (world.fireflies) {
    const pos = world.fireflies.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, 0.6 + Math.sin(t * 0.7 + i * 1.3) * 0.5 + Math.sin(t * 0.31 + i) * 0.4);
    }
    pos.needsUpdate = true;
    world.fireflies.material.opacity = 0.5 + Math.sin(t * 2) * 0.3;
  }

  if (state === 'playing') {
    updatePlayer(dt);
    updateGuards(dt);
    updatePoliceCar(dt);
    updateDog(dt);
    updateSeagull(dt);
    updateWindowEvent(dt);
    updateDawn(dt);
  } else if (state === 'caught') {
    caughtTimer -= dt;
    updateGuards(dt * 0.3);
    updatePoliceCar(dt);
    updateDog(dt * 0.3);
    if (caughtTimer <= 0) {
      playerPos.set(0, 0, 26);
      player.group.position.copy(playerPos);
      vignette.style.opacity = '0';
      state = 'playing';
    }
    updateDawn(dt);
  } else if (state === 'results') {
    updatePoliceCar(dt);
    for (const g of guards) g.api.animate(dt, 0.1);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
}

// ---------------------------------------------------------------- Boot
const playBtn = document.getElementById('play-btn');
const statusEl = document.getElementById('loading-status');
let worldReady = false, worldLoading = false;

async function ensureWorld() {
  if (worldReady || worldLoading) return;
  worldLoading = true;
  statusEl.textContent = 'Casing the joint…';
  try {
    await setupGame();
    worldReady = true;
    statusEl.textContent = '';
  } catch (e) {
    statusEl.textContent = 'Load hiccup — tap START to retry.';
    worldLoading = false;
    console.error(e);
  }
}

ensureWorld();

playBtn.addEventListener('click', async () => {
  playBtn.disabled = true;
  initAudio();
  resumeAudio();
  await ensureWorld();
  if (!worldReady) { playBtn.disabled = false; return; }
  document.getElementById('title-screen').classList.add('hidden');
  startNight(1);
  playBtn.disabled = false;
});

document.getElementById('music-btn').addEventListener('click', () => {
  const on = toggleMusic();
  document.getElementById('music-btn').style.opacity = on ? '1' : '0.4';
});

requestAnimationFrame((n) => { lastFrame = n; requestAnimationFrame(frame); });

// tiny debug/testing hook (also handy in devtools)
window.__rhScene = scene;
window.__rhCamera = camera;
window.__THREE = THREE;
window.__rh = {
  get state() { return state; },
  get banked() { return banked; },
  get carriedCount() { return carried.length; },
  get nightTime() { return nightTime; },
  get guards() { return guards.map((g) => ({ mode: g.mode, alert: g.alert, x: g.pos.x, z: g.pos.z })); },
  get loot() { return lootItems.map((l) => ({ x: l.x, z: l.z, kind: l.kind })); },
  teleport(x, z) { playerPos.set(x, 0, z); },
  setTime(t) { nightTime = t; },
  get dog() { return dog ? { mode: dog.mode, x: dog.pos.x, z: dog.pos.z } : null; },
  get night() { return night; },
  addBank(v) { banked += v; $('bank-val').textContent = banked; },
  debug() {
    const [sx, sy] = worldToScreen(new THREE.Vector3(playerPos.x, 1, playerPos.z));
    return {
      player: playerPos.toArray(),
      playerScreen: [Math.round(sx), Math.round(sy)],
      screen: [window.innerWidth, window.innerHeight],
      cam: camera.position.toArray(),
      camQuat: camera.quaternion.toArray().map((v) => +v.toFixed(3)),
      visible: player ? player.group.visible : null,
      inScene: player ? player.group.parent === scene : null,
      fps: Math.round(1 / Math.max(0.001, lastDt)),
    };
  },
};
