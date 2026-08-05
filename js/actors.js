// Procedural low-poly characters: raccoon, security guard, police car, seagull.
// Each builder returns a THREE.Group plus an animate(t, moveSpeed) hook.

import * as THREE from '../vendor/three.module.js';

const M = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });

const GREY = 0x8a8f9c, DARKGREY = 0x3c4048, LIGHT = 0xe8e4da, BLACK = 0x17181d;

export function makeRaccoon({ scale = 1, shirt = null } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), M(GREY));
  body.scale.set(1, 0.85, 1.25);
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);

  if (shirt) {
    const vest = new THREE.Mesh(new THREE.SphereGeometry(0.57, 12, 10), M(shirt));
    vest.scale.set(1, 0.72, 1.1);
    vest.position.set(0, 0.6, 0.12);
    g.add(vest);
  }

  const head = new THREE.Group();
  head.position.set(0, 1.15, 0.55);
  g.add(head);

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), M(GREY));
  skull.castShadow = true;
  head.add(skull);

  // bandit mask
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.385, 12, 8, 0, Math.PI * 2, Math.PI * 0.32, Math.PI * 0.3), M(BLACK));
  mask.rotation.x = -0.35;
  head.add(mask);

  // muzzle
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M(LIGHT));
  muzzle.scale.set(1, 0.8, 1.1);
  muzzle.position.set(0, -0.12, 0.28);
  head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), M(BLACK));
  nose.position.set(0, -0.08, 0.46);
  head.add(nose);

  // eyes
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), M(0xffffff, { emissive: 0x888888 }));
    eye.position.set(0.15 * s, 0.06, 0.32);
    head.add(eye);
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 6), M(DARKGREY));
    ear.position.set(0.24 * s, 0.34, -0.05);
    ear.rotation.z = -0.25 * s;
    head.add(ear);
  }

  // striped tail — alternating rings, curved upward
  const tail = new THREE.Group();
  tail.position.set(0, 0.62, -0.6);
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.19 - i * 0.02, 8, 6), M(i % 2 ? BLACK : GREY));
    seg.position.set(0, Math.sin(i * 0.38) * 0.5, -i * 0.19);
    seg.castShadow = i < 3;
    tail.add(seg);
  }
  g.add(tail);

  // legs
  const legs = [];
  const legGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.38, 6);
  for (const [x, z] of [[-0.3, 0.35], [0.3, 0.35], [-0.3, -0.35], [0.3, -0.35]]) {
    const leg = new THREE.Mesh(legGeo, M(DARKGREY));
    leg.position.set(x, 0.2, z);
    g.add(leg);
    legs.push(leg);
  }

  // loot backpack anchor (banked visuals get stacked here)
  const lootAnchor = new THREE.Group();
  lootAnchor.position.set(0, 1.05, -0.15);
  g.add(lootAnchor);

  g.scale.setScalar(scale);

  let phase = Math.random() * 10;
  return {
    group: g,
    lootAnchor,
    head,
    tail,
    animate(dt, speed) {
      phase += dt * (4 + speed * 9);
      const amp = Math.min(0.55, 0.12 + speed * 0.5);
      legs[0].rotation.x = Math.sin(phase) * amp;
      legs[3].rotation.x = Math.sin(phase) * amp;
      legs[1].rotation.x = -Math.sin(phase) * amp;
      legs[2].rotation.x = -Math.sin(phase) * amp;
      body.position.y = 0.62 + Math.abs(Math.sin(phase)) * 0.05 * (0.3 + speed);
      tail.rotation.x = -0.2 + Math.sin(phase * 0.5) * 0.15;
      tail.rotation.z = Math.sin(phase * 0.7) * 0.12;
      head.rotation.y = Math.sin(phase * 0.3) * 0.08;
    },
  };
}

export function makeGuard() {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.15, 10), M(0x2b3a5e));
  torso.position.y = 1.0;
  torso.castShadow = true;
  g.add(torso);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), M(0x2b3a5e));
  belly.position.set(0, 0.85, 0.08);
  g.add(belly);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), M(0xd9a87c));
  head.position.y = 1.85;
  head.castShadow = true;
  g.add(head);
  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.16, 10), M(0x1c2740));
  capTop.position.y = 2.05;
  g.add(capTop);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 10, 1, false, 0, Math.PI), M(0x1c2740));
  brim.position.set(0, 1.98, 0.18);
  g.add(brim);

  const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 6);
  const armL = new THREE.Mesh(armGeo, M(0x2b3a5e));
  armL.position.set(-0.55, 1.25, 0);
  armL.rotation.z = 0.25;
  g.add(armL);
  // right arm holds the flashlight forward
  const armR = new THREE.Mesh(armGeo, M(0x2b3a5e));
  armR.position.set(0.5, 1.35, 0.3);
  armR.rotation.x = -1.2;
  g.add(armR);
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.35, 8), M(0x222831));
  torch.position.set(0.5, 1.45, 0.72);
  torch.rotation.x = Math.PI / 2;
  g.add(torch);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 8), M(0xfff2b0, { emissive: 0xffe89a }));
  lens.position.set(0.5, 1.45, 0.9);
  lens.rotation.x = Math.PI / 2;
  g.add(lens);

  const legGeo = new THREE.CylinderGeometry(0.13, 0.15, 0.5, 6);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, M(0x1c2740));
    leg.position.set(0.2 * s, 0.25, 0);
    g.add(leg);
    legs.push(leg);
  }

  let phase = Math.random() * 10;
  return {
    group: g,
    torchTip: new THREE.Vector3(0.5, 1.45, 0.9),
    animate(dt, speed) {
      phase += dt * (2 + speed * 6);
      const amp = Math.min(0.5, speed * 0.9);
      legs[0].rotation.x = Math.sin(phase) * amp;
      legs[1].rotation.x = -Math.sin(phase) * amp;
      armL.rotation.x = -Math.sin(phase) * amp * 0.7;
      g.position.y = Math.abs(Math.sin(phase)) * 0.04 * speed;
    },
  };
}

export function makePoliceCar() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 4.6), M(0x1a2233));
  body.position.y = 0.62;
  body.castShadow = true;
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.2, 4.62), M(0xdfe6f2));
  stripe.position.y = 0.68;
  g.add(stripe);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.1), M(0x9db8d8, { transparent: true, opacity: 0.9 }));
  cabin.position.set(0, 1.2, -0.2);
  cabin.castShadow = true;
  g.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [x, z] of [[-1, 1.5], [1, 1.5], [-1, -1.5], [1, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, M(0x111318));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
  }

  // light bar
  const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.4), M(0x222833));
  barBase.position.set(0, 1.56, -0.2);
  g.add(barBase);
  const redMat = new THREE.MeshLambertMaterial({ color: 0xff2244, emissive: 0xff2244, emissiveIntensity: 1 });
  const blueMat = new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x2266ff, emissiveIntensity: 1 });
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.36), redMat);
  red.position.set(-0.3, 1.72, -0.2);
  g.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.36), blueMat);
  blue.position.set(0.3, 1.72, -0.2);
  g.add(blue);

  // headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xfff6cc, emissive: 0xfff0aa, emissiveIntensity: 0.9 });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), hlMat);
    hl.position.set(0.62 * s, 0.62, 2.32);
    g.add(hl);
  }

  const redLight = new THREE.PointLight(0xff2244, 0, 14);
  redLight.position.set(0, 2.2, -0.2);
  g.add(redLight);
  const blueLight = new THREE.PointLight(0x2266ff, 0, 14);
  blueLight.position.set(0, 2.2, -0.2);
  g.add(blueLight);

  let t = 0;
  return {
    group: g,
    animate(dt) {
      t += dt;
      const flash = Math.sin(t * 10) > 0;
      redMat.emissiveIntensity = flash ? 1.6 : 0.15;
      blueMat.emissiveIntensity = flash ? 0.15 : 1.6;
      redLight.intensity = flash ? 2.2 : 0;
      blueLight.intensity = flash ? 0 : 2.2;
    },
  };
}

export function makeSeagull() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), M(0xf2f4f8));
  body.scale.set(1, 0.8, 1.5);
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), M(0xf2f4f8));
  head.position.set(0, 0.22, 0.42);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 6), M(0xf7a922));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.2, 0.62);
  g.add(beak);
  const wingGeo = new THREE.BoxGeometry(0.9, 0.04, 0.42);
  const wings = [];
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, M(0xd8dde6));
    wing.position.set(0.5 * s, 0.1, 0);
    wing.geometry = wingGeo;
    g.add(wing);
    wings.push(wing);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.35), M(0xd8dde6));
  tail.position.set(0, 0.05, -0.5);
  g.add(tail);

  let phase = 0;
  return {
    group: g,
    animate(dt, flying = 1) {
      phase += dt * 14 * flying;
      wings[0].rotation.z = Math.sin(phase) * 0.7;
      wings[1].rotation.z = -Math.sin(phase) * 0.7;
    },
  };
}

// Small loot meshes. kind: coin | gem | pizza | fish | donut | ring
export function makeLoot(kind) {
  const g = new THREE.Group();
  let mesh;
  switch (kind) {
    case 'gem': {
      mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshLambertMaterial({ color: 0x35e0c0, emissive: 0x1a8f78, emissiveIntensity: 0.7 }));
      mesh.position.y = 0.38;
      break;
    }
    case 'pizza': {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 3), new THREE.MeshLambertMaterial({ color: 0xf5b840, emissive: 0x7a4a00, emissiveIntensity: 0.25 }));
      mesh.position.y = 0.1;
      const pep = new THREE.MeshLambertMaterial({ color: 0xc0392b });
      for (let i = 0; i < 3; i++) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8), pep);
        p.position.set(Math.sin(i * 2.1) * 0.15, 0.16, Math.cos(i * 2.1) * 0.15);
        g.add(p);
      }
      break;
    }
    case 'fish': {
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshLambertMaterial({ color: 0x7fb2d8, emissive: 0x2a5a7a, emissiveIntensity: 0.3 }));
      mesh.scale.set(0.7, 0.7, 1.5);
      mesh.position.y = 0.2;
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 4), new THREE.MeshLambertMaterial({ color: 0x6aa0c8 }));
      fin.rotation.x = -Math.PI / 2;
      fin.position.set(0, 0.2, -0.45);
      g.add(fin);
      break;
    }
    case 'donut': {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.11, 8, 14), new THREE.MeshLambertMaterial({ color: 0xe88ab0, emissive: 0x8a3055, emissiveIntensity: 0.3 }));
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 0.14;
      break;
    }
    case 'ring': {
      mesh = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 8, 14), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0xb8860b, emissiveIntensity: 0.8 }));
      mesh.position.y = 0.26;
      const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshLambertMaterial({ color: 0xff5f9e, emissive: 0xaa2255, emissiveIntensity: 0.8 }));
      stone.position.set(0, 0.5, 0);
      g.add(stone);
      break;
    }
    default: { // coin
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.09, 14), new THREE.MeshLambertMaterial({ color: 0xffd23f, emissive: 0xcc9900, emissiveIntensity: 0.75 }));
      mesh.position.y = 0.3;
      mesh.rotation.x = Math.PI / 2;
    }
  }
  g.add(mesh);
  return g;
}

export const LOOT_TYPES = {
  coin:  { value: 10, label: 'coin',  weight: 5 },
  gem:   { value: 30, label: 'gem',   weight: 2 },
  donut: { value: 15, label: 'donut', weight: 3 },
  fish:  { value: 20, label: 'fish',  weight: 3 },
  ring:  { value: 50, label: 'ring',  weight: 1 },
  pizza: { value: 15, label: 'pizza', weight: 2 }, // also triggers FRENZY
};
