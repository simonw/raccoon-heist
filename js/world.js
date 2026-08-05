// Builds the night-time suburban heist map: ground, road, houses with glowing
// windows, fences, trash cans, dumpster hideout, trees. Returns collision
// obstacles, line-of-sight blockers, and gameplay anchor points.

import * as THREE from '../vendor/three.module.js';

const texLoader = new THREE.TextureLoader();

function loadTex(name, repeatX, repeatY, fallbackColor) {
  return new Promise((resolve) => {
    texLoader.load(
      `textures/${name}.jpg`,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeatX, repeatY);
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      },
      undefined,
      () => resolve(null) // fall back to flat color material
    );
  });
}

function mat(tex, fallbackColor, opts = {}) {
  return tex
    ? new THREE.MeshLambertMaterial({ map: tex, ...opts })
    : new THREE.MeshLambertMaterial({ color: fallbackColor, ...opts });
}

export const BOUNDS = { minX: -42, maxX: 42, minZ: -30, maxZ: 32 };

export async function buildWorld(scene) {
  const [grassT, pathT, brickT, fenceT, roofT, metalT, soilT] = await Promise.all([
    loadTex('grass', 12, 10), loadTex('path', 10, 2), loadTex('brick', 3, 1.4),
    loadTex('fence', 2, 1), loadTex('roof', 3, 2), loadTex('metal', 1, 1),
    loadTex('soil', 2, 2),
  ]);

  const obstacles = [];   // {type:'box',minX,maxX,minZ,maxZ} or {type:'circle',x,z,r}
  const losBlockers = []; // subset of boxes that block guard sight (houses)
  const windows = [];     // {mesh, light, pos:Vector3, dir:Vector3}

  // ---------- Ground ----------
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(96, 76), mat(grassT, 0x11302e));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Street strip where the police car patrols
  const road = new THREE.Mesh(new THREE.PlaneGeometry(96, 8.4), mat(pathT, 0x2a3140));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, -13);
  road.receiveShadow = true;
  scene.add(road);

  // Sidewalk-ish soil patches for variety
  for (const [x, z, w, h] of [[-24, 8, 10, 7], [18, 20, 12, 8], [-10, 26, 8, 6]]) {
    const patch = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat(soilT, 0x201812));
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = Math.random();
    patch.position.set(x, 0.015, z);
    patch.receiveShadow = true;
    scene.add(patch);
  }

  // ---------- Houses (along the back, fronts facing the street) ----------
  const houseDefs = [
    { x: -28, z: -25, w: 14, d: 9 },
    { x: 0,   z: -25, w: 16, d: 9 },
    { x: 28,  z: -25, w: 14, d: 9 },
  ];
  const wallMat = mat(brickT, 0x2e3950);
  const roofMat = mat(roofT, 0x27314a);
  const winMatOn  = new THREE.MeshLambertMaterial({ color: 0xffc75f, emissive: 0xffb347, emissiveIntensity: 1.1 });
  const winMatDim = new THREE.MeshLambertMaterial({ color: 0x24334f, emissive: 0x101b30, emissiveIntensity: 0.4 });

  for (const h of houseDefs) {
    const wallH = 6;
    const walls = new THREE.Mesh(new THREE.BoxGeometry(h.w, wallH, h.d), wallMat);
    walls.position.set(h.x, wallH / 2, h.z);
    walls.castShadow = true;
    walls.receiveShadow = true;
    scene.add(walls);

    // simple prism roof
    const roofGeo = new THREE.CylinderGeometry(0.01, (h.w / 2) * 1.16, 3.2, 4, 1);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.z = (h.d + 1.6) / (h.w * 1.16);
    roof.position.set(h.x, wallH + 1.6, h.z);
    roof.castShadow = true;
    scene.add(roof);

    // chimney
    const chim = new THREE.Mesh(new THREE.BoxGeometry(1, 2.4, 1), wallMat);
    chim.position.set(h.x + h.w * 0.28, wallH + 2.2, h.z - 1);
    scene.add(chim);

    // front windows + door (facing +z, toward the yard/street)
    const faceZ = h.z + h.d / 2 + 0.06;
    const winCount = Math.floor(h.w / 5);
    for (let i = 0; i < winCount; i++) {
      const wx = h.x - h.w / 2 + (i + 0.75) * (h.w / (winCount + 0.5));
      const lit = Math.random() < 0.5;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.7), (lit ? winMatOn : winMatDim).clone());
      win.position.set(wx, 3.1, faceZ);
      scene.add(win);
      const frame = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.05), new THREE.MeshLambertMaterial({ color: 0x161d2e }));
      frame.position.set(wx, 3.1, faceZ - 0.03);
      scene.add(frame);
      let light = null;
      if (lit) {
        light = new THREE.PointLight(0xffb347, 5, 12, 1.6);
        light.position.set(wx, 3.0, faceZ + 1.2);
        scene.add(light);
      }
      windows.push({ mesh: win, light, lit, pos: new THREE.Vector3(wx, 1, faceZ + 0.5), dir: new THREE.Vector3(0, 0, 1) });
    }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3), new THREE.MeshLambertMaterial({ color: 0x3a2a1c }));
    door.position.set(h.x, 1.5, faceZ);
    scene.add(door);

    const box = { type: 'box', minX: h.x - h.w / 2, maxX: h.x + h.w / 2, minZ: h.z - h.d / 2, maxZ: h.z + h.d / 2 };
    obstacles.push(box);
    losBlockers.push(box);
  }

  // ---------- Perimeter + yard fences ----------
  const fenceMat = mat(fenceT, 0x4a3826);
  const addFence = (x, z, len, horizontal) => {
    const geo = new THREE.BoxGeometry(horizontal ? len : 0.3, 1.9, horizontal ? 0.3 : len);
    const f = new THREE.Mesh(geo, fenceMat);
    f.position.set(x, 0.95, z);
    f.castShadow = true;
    f.receiveShadow = true;
    scene.add(f);
    if (horizontal) obstacles.push({ type: 'box', minX: x - len / 2, maxX: x + len / 2, minZ: z - 0.35, maxZ: z + 0.35 });
    else obstacles.push({ type: 'box', minX: x - 0.35, maxX: x + 0.35, minZ: z - len / 2, maxZ: z + len / 2 });
  };

  // perimeter (with the map bounds as backup clamp)
  addFence(0, BOUNDS.maxZ + 0.5, 88, true);
  addFence(BOUNDS.minX - 0.5, 1, 64, false);
  addFence(BOUNDS.maxX + 0.5, 1, 64, false);

  // yard dividers with sneak gaps
  addFence(-14, 14, 16, false); // vertical divider left
  addFence(-14, 30, 4, false);
  addFence(14, 10, 12, false);
  addFence(14, 28, 6, false);
  addFence(-2, 4, 16, true);
  addFence(26, 4, 12, true);
  addFence(-30, 18, 12, true);

  // ---------- Trash cans ----------
  const canMat = mat(metalT, 0x8a919c);
  const lidMat = mat(metalT, 0x767d88);
  const canAt = (x, z, tipped = false) => {
    const can = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 1.9, 12), canMat);
    body.position.y = 0.95;
    body.castShadow = true;
    can.add(body);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.22, 12), lidMat);
    lid.position.y = 2.0;
    can.add(lid);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lidMat);
    knob.position.y = 2.18;
    can.add(knob);
    if (tipped) {
      can.rotation.z = Math.PI / 2 - 0.15;
      can.position.set(x, -0.1, z);
    } else {
      can.position.set(x, 0, z);
    }
    can.rotation.y = Math.random() * Math.PI;
    scene.add(can);
    obstacles.push({ type: 'circle', x, z, r: 1.0 });
  };
  canAt(-21, -6); canAt(-19, -5.4); canAt(8, -6, true); canAt(35, -5);
  canAt(-36, 12); canAt(20, 16); canAt(2, 24, true); canAt(33, 26);

  // ---------- Dumpster hideout (bank your loot here) ----------
  const hideout = new THREE.Group();
  const dump = new THREE.Mesh(new THREE.BoxGeometry(5, 2.4, 2.6), mat(metalT, 0x2f6b4f));
  dump.position.y = 1.3;
  dump.castShadow = true;
  hideout.add(dump);
  // green paint tint over metal texture
  dump.material = dump.material.clone();
  dump.material.color = new THREE.Color(0x59a37a);
  const lid1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.18, 2.7), mat(metalT, 0x3a7a5c));
  lid1.material = lid1.material.clone();
  lid1.material.color = new THREE.Color(0x4c8f6b);
  lid1.position.set(-1.25, 2.52, 0);
  hideout.add(lid1);
  const lid2 = lid1.clone();
  lid2.position.x = 1.25;
  lid2.rotation.x = -0.9; // propped open — that's the door
  lid2.position.y = 2.9;
  lid2.position.z = -0.8;
  hideout.add(lid2);
  // glowing eyes peeking from the open lid
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
    eye.position.set(1.25 + s * 0.22, 2.1, -0.4);
    hideout.add(eye);
  }
  const hideoutPos = new THREE.Vector3(0, 0, 30);
  hideout.position.copy(hideoutPos);
  scene.add(hideout);
  obstacles.push({ type: 'box', minX: -2.7, maxX: 2.7, minZ: 28.6, maxZ: 31.4 });

  // ---------- Trees & bushes ----------
  const trunkMat = mat(fenceT, 0x3a2c1e);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x1d4d3a });
  const leafMat2 = new THREE.MeshLambertMaterial({ color: 0x173f45 });
  const treeAt = (x, z, s = 1) => {
    const tr = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * s, 0.5 * s, 3 * s, 7), trunkMat);
    trunk.position.y = 1.5 * s;
    trunk.castShadow = true;
    tr.add(trunk);
    for (let i = 0; i < 3; i++) {
      const blob = new THREE.Mesh(new THREE.SphereGeometry((1.7 - i * 0.35) * s, 8, 7), i % 2 ? leafMat : leafMat2);
      blob.position.set(Math.sin(i * 2.4) * 0.7 * s, (3.4 + i * 1.0) * s, Math.cos(i * 2.4) * 0.7 * s);
      blob.castShadow = i === 0;
      tr.add(blob);
    }
    tr.position.set(x, 0, z);
    scene.add(tr);
    obstacles.push({ type: 'circle', x, z, r: 0.7 * s });
  };
  treeAt(-38, 24, 1.2); treeAt(38, 8, 1.0); treeAt(-24, 2, 0.9); treeAt(30, 20, 1.3); treeAt(-6, 16, 1.1); treeAt(40, 30, 0.9);

  const bushAt = (x, z, s = 1) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.9 * s, 8, 6), Math.random() < 0.5 ? leafMat : leafMat2);
    b.position.set(x, 0.5 * s, z);
    b.scale.y = 0.75;
    b.castShadow = true;
    scene.add(b);
    obstacles.push({ type: 'circle', x, z, r: 0.75 * s });
  };
  bushAt(-32, 6); bushAt(12, 2); bushAt(-8, 28); bushAt(24, 30); bushAt(-40, 16); bushAt(6, 12); bushAt(36, 14); bushAt(-18, 22);

  // ---------- Sky, moon, lighting ----------
  scene.background = new THREE.Color(0x0a1024);
  scene.fog = new THREE.Fog(0x0a1024, 40, 95);

  const moonGroup = new THREE.Group();
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 14), new THREE.MeshBasicMaterial({ color: 0xeef2ff, fog: false }));
  moon.position.set(30, 38, -55);
  moonGroup.add(moon);
  const moonHalo = new THREE.Mesh(new THREE.SphereGeometry(4.6, 16, 14), new THREE.MeshBasicMaterial({ color: 0xaabbee, transparent: true, opacity: 0.22, fog: false }));
  moonHalo.position.copy(moon.position);
  moonGroup.add(moonHalo);
  scene.add(moonGroup);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const starPos = [];
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 70 + Math.random() * 60;
    starPos.push(Math.cos(a) * r, 22 + Math.random() * 70, -40 - Math.random() * 80);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 0.5, fog: false }));
  scene.add(stars);

  const ambient = new THREE.AmbientLight(0x4a5c92, 1.25);
  scene.add(ambient);
  const moonLight = new THREE.DirectionalLight(0xaec4ff, 1.35);
  moonLight.position.set(28, 42, -30);
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024);
  moonLight.shadow.camera.left = -50;
  moonLight.shadow.camera.right = 50;
  moonLight.shadow.camera.top = 45;
  moonLight.shadow.camera.bottom = -45;
  moonLight.shadow.camera.far = 120;
  moonLight.shadow.bias = -0.002;
  scene.add(moonLight);

  const hemi = new THREE.HemisphereLight(0x35508c, 0x141c30, 0.85);
  scene.add(hemi);

  // fireflies
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = [];
  for (let i = 0; i < 60; i++) {
    ffPos.push(BOUNDS.minX + Math.random() * (BOUNDS.maxX - BOUNDS.minX), 0.5 + Math.random() * 2.2, -6 + Math.random() * (BOUNDS.maxZ + 6));
  }
  ffGeo.setAttribute('position', new THREE.Float32BufferAttribute(ffPos, 3));
  const fireflies = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: 0xd8ffa0, size: 0.28, transparent: true, opacity: 0.9 }));
  scene.add(fireflies);

  return {
    obstacles,
    losBlockers,
    windows,
    hideoutPos,
    ambient,
    moonLight,
    hemi,
    fireflies,
    // guard patrol routes (clockwise-ish around the yards)
    patrolRoutes: [
      [new THREE.Vector3(-30, 0, -6), new THREE.Vector3(-30, 0, 26), new THREE.Vector3(-8, 0, 22), new THREE.Vector3(-6, 0, -4)],
      [new THREE.Vector3(30, 0, -4), new THREE.Vector3(34, 0, 24), new THREE.Vector3(8, 0, 20), new THREE.Vector3(6, 0, -6)],
      [new THREE.Vector3(-20, 0, 10), new THREE.Vector3(20, 0, 10), new THREE.Vector3(22, 0, 28), new THREE.Vector3(-22, 0, 28)],
    ],
    roadZ: -13,
  };
}
