import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- names shown to people ---------------- */
const COMPONENT_LABEL = {
  'Socle': 'Base: clamp, mast and collar',
  'Bras1 droit': 'Right inner arm', 'Bras2 droit': 'Right outer arm',
  'Tete droite': 'Right VESA head', 'Inclinaison droite': 'Right tilt block', 'Ecran droit': 'Right screen and plate',
  'Bras1 gauche': 'Left inner arm', 'Bras2 gauche': 'Left outer arm',
  'Tete gauche': 'Left VESA head', 'Inclinaison gauche': 'Left tilt block', 'Ecran gauche': 'Left screen and plate',
  'Bras centre': 'Centre arm', 'Tete centre': 'Centre VESA head',
  'Inclinaison centre': 'Centre tilt block', 'Ecran centre': 'Centre screen and plate',
};
// longest prefixes first
const BODY_LABEL = [
  ['Patin_Contreplaque', 'Counter-plate pad'], ['Patin_Etau', 'Clamp pad'], ['Etau_haut', 'Clamp, upper jaw'],
  ['Etau_bas', 'Clamp, lower jaw'], ['Vis_Serrage', 'Collar clamping screw'], ['Vis_QR', 'Quick-release thumbscrew'],
  ['Vis', 'Clamp screw'], ['Mat', 'Mast tube'], ['Soudure', 'Mast foot gusset'], ['Collier_Haut', 'Mast collar, upper'],
  ['Collier_Bas', 'Mast collar, lower'], ['Axe_Mat', 'Arm pivot pin'], ['Axe_Coude', 'Elbow pin'], ['Axe_Tete', 'Head pivot pin'],
  ['Axe_Incl', 'Tilt pin'], ['Axe_Rot', 'Rotation pin'], ['Rondelle', 'Friction washer'], ['Cache', 'Screw cap'],
  ['Contreplaque', 'Counter plate'], ['Clip', 'Cable clip'], ['Bras', 'Arm tube'], ['Embout', 'Tube end cap'],
  ['Bague', 'Bushing'], ['Patin', 'Friction pad'], ['Bouton', 'Thumb knob'], ['Tete', 'Head yoke'], ['Incl', 'Tilt block'],
  ['VESA', 'VESA plate'], ['Ecran', '32" screen (reference, not in the kit)'], ['Support_QR', 'Quick-release bracket'],
];
const MATERIAL_LABEL = {
  steel: 'Steel, powder coat RAL 9016', zinc: 'Zinc-plated steel', black: 'Steel plate, black finish',
  nylon: '3D print, PA12', graphite: '3D print, PETG or TPU', screen: 'Screen',
};
const bodyLabel = (n) => (BODY_LABEL.find(([p]) => n.startsWith(p)) || [, n])[1];

/* ---------------- renderer, scene ---------------- */
const host = $('#viewer');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.75;

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
camera.position.set(-2.6, 1.9, -4.6);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0.38, 0.12);
controls.minDistance = 0.25;
controls.maxDistance = 6;
controls.maxPolarAngle = Math.PI * 0.92;
controls.autoRotateSpeed = 0.8;

const key = new THREE.DirectionalLight(0xffffff, 2.2);
key.position.set(-1.6, 3.2, -1.2);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 8 });
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.01;
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fc3ff, 0.8);
rim.position.set(2, 1.2, 2.5);
scene.add(rim);
scene.add(new THREE.HemisphereLight(0xdfe7f2, 0x2b3340, 0.5));

/* desk the clamp grips: top at y = 0, 42 mm thick, front edge toward +z */
const deskGroup = new THREE.Group();
const desk = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 0.042, 0.8),
  new THREE.MeshStandardMaterial({ color: 0x2a2521, roughness: 0.78, metalness: 0, envMapIntensity: 0.5 })
);
desk.position.set(0, -0.023, 0.405);
desk.receiveShadow = true;
deskGroup.add(desk);
const floorShadow = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.12 }));
floorShadow.rotation.x = -Math.PI / 2;
floorShadow.position.y = -0.75;
floorShadow.receiveShadow = true;
deskGroup.add(floorShadow);
scene.add(deskGroup);

/* ---------------- materials ---------------- */
const MAT = {
  steel: () => new THREE.MeshPhysicalMaterial({ color: 0xecebe6, roughness: 0.48, metalness: 0.05, clearcoat: 0.35, clearcoatRoughness: 0.4 }),
  zinc: () => new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: 0.32, metalness: 0.9 }),
  black: () => new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.55, metalness: 0.2 }),
  nylon: () => new THREE.MeshStandardMaterial({ color: 0xdedbd2, roughness: 0.8, metalness: 0 }),
  graphite: () => new THREE.MeshStandardMaterial({ color: 0x232427, roughness: 0.7, metalness: 0 }),
  screen: () => new THREE.MeshPhysicalMaterial({ color: 0x161a20, roughness: 0.35, metalness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1b2230, transparent: true, opacity: 0.45 });

function displayTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 512, 288);
  grd.addColorStop(0, '#2c5a8a');
  grd.addColorStop(0.55, '#1a2c44');
  grd.addColorStop(1, '#0f1722');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 288);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- state ---------------- */
const JOINTS = ['swing', 'elbow', 'head', 'tilt', 'rot'];
const state = { swing: 0, elbow: 0, head: 0, tilt: 0, rot: 0, centre: 1 };
const PRESETS = {
  row: { swing: 0, elbow: 0, head: 0, tilt: 0, rot: 0, centre: 1 },
  wrap: { swing: 9, elbow: 9, head: 8, tilt: 5, rot: 0, centre: 1 },
  two: null, // solved from the arm geometry once the model is loaded
  portrait: { swing: 0, elbow: 0, head: 0, tilt: 0, rot: 90, centre: 1 },
};

let joints = null;      // { D:{swing,elbow,head,tilt,rot}, G:{...}, C:{swing,head,tilt,rot} }
let centreParts = [];
let screenParts = [];
const pickables = [];
const comps = new Map(); // component name -> { node, meshes[] }
let explodeItems = [];
let modelRoot = null;
const deg = THREE.MathUtils.degToRad;

/* ---------------- loading ---------------- */
const loader = new GLTFLoader();
const setProgress = (f) => { $('#loadingFill').style.width = `${Math.round(f * 100)}%`; };

Promise.all([
  fetch('model/axes.json').then((r) => { if (!r.ok) throw new Error(`axes.json: HTTP ${r.status}`); return r.json(); }),
  new Promise((res, rej) => loader.load('model/support_ecrans.glb', res,
    (e) => e.total && setProgress(e.loaded / e.total), rej)),
]).then(([axes, gltf]) => {
  build(gltf.scene, axes);
  $('#loading').classList.add('done');
  host.dataset.ready = '1';
}).catch((err) => {
  console.error(err);
  $('#loadingText').textContent = 'The 3D model could not be loaded. Serve the site over http (not file://) and reload.';
});

function build(root, axes) {
  modelRoot = root;
  scene.add(root);
  root.traverse((o) => {
    if (o.isMesh) {
      const cat = o.userData.category || 'steel';
      o.material = MAT[cat]();
      o.castShadow = true;
      o.receiveShadow = true;
      if (cat !== 'screen') {
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), edgeMat);
        e.raycast = () => {};
        e.userData.edge = true;
        o.add(e);
      }
      pickables.push(o);
    } else if (o.userData.component) {
      comps.set(o.userData.name || o.name.replace(/_/g, ' '), { node: o, meshes: [] });
    }
  });
  // GLTFLoader turns spaces into underscores; map by original component name kept in extras
  for (const m of pickables) {
    const c = comps.get(m.userData.component);
    if (c) c.meshes.push(m);
  }
  const C = (name) => comps.get(name).node;

  // kinematic chain: each joint is a pivot group on the pin axis
  const joint = (parent, axisKey) => {
    const a = axes[axisKey];
    const pivot = new THREE.Group();
    pivot.position.fromArray(a.p);
    const inner = new THREE.Group();
    inner.position.fromArray(a.p).negate();
    pivot.add(inner);
    parent.add(pivot);
    return { pivot, inner, axis: new THREE.Vector3().fromArray(a.d) };
  };
  const assembly = root.children[0] || root;
  joints = {};
  for (const [s, fr] of [['D', ['droit', 'droite']], ['G', ['gauche', 'gauche']]]) {
    const j = {};
    j.swing = joint(assembly, `Axe_Mat_${s}`); j.swing.inner.add(C(`Bras1 ${fr[0]}`));
    j.elbow = joint(j.swing.inner, `Axe_Coude_${s}`); j.elbow.inner.add(C(`Bras2 ${fr[0]}`));
    j.head = joint(j.elbow.inner, `Axe_Tete_${s}`); j.head.inner.add(C(`Tete ${fr[1]}`));
    j.tilt = joint(j.head.inner, `Axe_Incl_${s}`); j.tilt.inner.add(C(`Inclinaison ${fr[1]}`));
    j.rot = joint(j.tilt.inner, `Axe_Rot${s}`); j.rot.inner.add(C(`Ecran ${fr[0]}`));
    joints[s] = j;
  }
  {
    const j = {};
    j.swing = joint(assembly, 'Axe_Mat_C'); j.swing.inner.add(C('Bras centre'));
    j.head = joint(j.swing.inner, 'Axe_Tete_C'); j.head.inner.add(C('Tete centre'));
    j.tilt = joint(j.head.inner, 'Axe_Incl_C'); j.tilt.inner.add(C('Inclinaison centre'));
    j.rot = joint(j.tilt.inner, 'Axe_RotC'); j.rot.inner.add(C('Ecran centre'));
    joints.C = j;
    centreParts = [j.head.pivot]; // two-screen mode takes the centre screen off its arm
  }

  // screens: glowing face on the side that looks at the user (+z)
  const tex = displayTexture();
  for (const m of pickables.filter((p) => p.userData.category === 'screen')) {
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox, size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const face = new THREE.Mesh(new THREE.PlaneGeometry(size.x * 0.96, size.y * 0.94),
      new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    face.position.set(c.x, c.y, bb.max.z + 0.0006);
    face.raycast = () => {};
    m.add(face);
    screenParts.push(m);
  }

  // inverse kinematics for the two-screen layout: screens edge to edge, 90 mm forward
  {
    const a = axes, w = pickables.find((p) => p.name.startsWith('Ecran_D')).geometry.boundingBox.getSize(new THREE.Vector3()).x;
    const B = [a.Axe_Mat_D.p[0], a.Axe_Mat_D.p[2]], E = [a.Axe_Coude_D.p[0], a.Axe_Coude_D.p[2]], H = [a.Axe_Tete_D.p[0], a.Axe_Tete_D.p[2]];
    const L1 = Math.hypot(E[0] - B[0], E[1] - B[1]), L2 = Math.hypot(H[0] - E[0], H[1] - E[1]);
    const T = [w / 2 + 0.004, H[1] + 0.09];
    const dx = T[0] - B[0], dz = T[1] - B[1], D = Math.hypot(dx, dz);
    const p1 = Math.atan2(dz, dx) - Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D)); // elbow behind
    const Ex = B[0] + L1 * Math.cos(p1), Ez = B[1] + L1 * Math.sin(p1);
    const p2 = Math.atan2(T[1] - Ez, T[0] - Ex);
    const r2d = THREE.MathUtils.radToDeg;
    PRESETS.two = { swing: Math.round(r2d(p1)), elbow: Math.round(r2d(p2 - p1)), head: Math.round(-r2d(p2)), tilt: 0, rot: 0, centre: 0 };
  }

  // explode offsets, computed in the rest pose
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  const all = new THREE.Box3().setFromObject(root);
  const ac = all.getCenter(new THREE.Vector3());
  for (const { meshes } of comps.values()) {
    const cb = new THREE.Box3();
    meshes.forEach((m) => cb.expandByObject(m));
    const cc = cb.getCenter(new THREE.Vector3());
    for (const m of meshes) {
      const bc = box.setFromObject(m).getCenter(new THREE.Vector3());
      const dir = bc.clone().sub(cc).multiplyScalar(1.1).add(cc.clone().sub(ac).multiplyScalar(0.35));
      explodeItems.push({ m, base: m.position.clone(), dir });
    }
  }

  applyPreset('wrap', true);
  setCamera('back', true);
  if (!reduceMotion) introDolly();
}

/* ---------------- applying joints ---------------- */
function applyState() {
  if (!joints) return;
  const q = (j, a) => j.pivot.quaternion.setFromAxisAngle(j.axis, a);
  for (const [s, m] of [['D', -1], ['G', 1]]) {
    const j = joints[s];
    q(j.swing, m * deg(state.swing));
    q(j.elbow, m * deg(state.elbow));
    q(j.head, m * deg(state.head));
    q(j.tilt, -deg(state.tilt));
    q(j.rot, m * deg(state.rot));
  }
  q(joints.C.swing, 0);
  q(joints.C.head, 0);
  q(joints.C.tilt, -deg(state.tilt));
  q(joints.C.rot, -deg(state.rot));
  centreParts.forEach((p) => { p.visible = state.centre > 0.5; });
  syncInputs();
}

function syncInputs() {
  for (const k of JOINTS) {
    const input = document.querySelector(`input[data-joint="${k}"]`);
    input.value = state[k];
    document.querySelector(`output[data-for="${k}"]`).textContent = `${Math.round(state[k])}°`;
  }
}

let tween = null;
function applyPreset(name, instant = false) {
  const target = PRESETS[name];
  if (!target) return;
  document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.preset === name)));
  if (instant || reduceMotion) { Object.assign(state, target); applyState(); return; }
  const from = { ...state };
  if (target.centre > 0.5) state.centre = 1;
  tween = { from, to: target, t0: performance.now(), dur: 1100, done: () => { state.centre = target.centre; applyState(); } };
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function stepTween(now) {
  if (!tween) return;
  const t = Math.min(1, (now - tween.t0) / tween.dur), e = ease(t);
  for (const k of JOINTS) state[k] = tween.from[k] + (tween.to[k] - tween.from[k]) * e;
  applyState();
  if (t >= 1) { const d = tween.done; tween = null; d(); }
}

/* ---------------- camera moves ---------------- */
let camTween = null;
// framing: shifts the picture so the model clears the headline and the control panel
const frame = { x: 0, y: 0, view: 'back' };
function frameFor(view) {
  const wide = host.clientWidth >= 720, close = view === 'clamp' || view === 'head';
  if (!wide) return { x: 0, y: close ? 0.06 : -0.06 };
  return close ? { x: 0.12, y: 0.06 } : { x: 0.0, y: 0.2 };
}
function applyFrame() {
  const w = host.clientWidth, h = host.clientHeight;
  camera.setViewOffset(w, h, frame.x * w, frame.y * h, w, h);
  camera.updateProjectionMatrix();
}
function worldOf(name) {
  const o = modelRoot.getObjectByName(name);
  return o ? new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) : new THREE.Vector3();
}
function setCamera(view, instant = false) {
  if (!modelRoot) return;
  let target, pos;
  if (view === 'back') { target = new THREE.Vector3(0, 0.36, 0.12); pos = new THREE.Vector3(-1.75, 1.45, -2.95); }
  if (view === 'front') { target = new THREE.Vector3(0, 0.42, 0.2); pos = new THREE.Vector3(0.7, 1.05, 3.9); }
  if (view === 'top') { target = new THREE.Vector3(0, 0.3, 0.15); pos = new THREE.Vector3(0, 3.6, 0.17); }
  if (view === 'clamp') { target = worldOf('Etau_haut').add(new THREE.Vector3(0, -0.02, 0)); pos = target.clone().add(new THREE.Vector3(-0.32, 0.18, -0.34)); }
  if (view === 'head') { target = worldOf('Tete_D'); pos = target.clone().add(new THREE.Vector3(0.36, 0.22, -0.46)); }
  if (innerWidth < 720 && view !== 'clamp' && view !== 'head') pos.sub(target).multiplyScalar(2.05).add(target);
  const f1 = frameFor(view);
  frame.view = view;
  if (instant || reduceMotion) { camera.position.copy(pos); controls.target.copy(target); Object.assign(frame, f1); applyFrame(); controls.update(); return; }
  camTween = { p0: camera.position.clone(), t0v: controls.target.clone(), p1: pos, t1: target, f0: { x: frame.x, y: frame.y }, f1, s: performance.now(), dur: 1000 };
}
function introDolly() {
  const p1 = camera.position.clone();
  camera.position.copy(p1.clone().sub(controls.target).multiplyScalar(1.9).add(controls.target).add(new THREE.Vector3(-0.8, 0.6, 0)));
  camTween = { p0: camera.position.clone(), t0v: controls.target.clone(), p1, t1: controls.target.clone(), f0: { x: frame.x, y: frame.y }, f1: { x: frame.x, y: frame.y }, s: performance.now() + 150, dur: 1800 };
}
function stepCam(now) {
  if (!camTween) return;
  const t = Math.max(0, Math.min(1, (now - camTween.s) / camTween.dur)), e = ease(t);
  camera.position.lerpVectors(camTween.p0, camTween.p1, e);
  controls.target.lerpVectors(camTween.t0v, camTween.t1, e);
  frame.x = camTween.f0.x + (camTween.f1.x - camTween.f0.x) * e;
  frame.y = camTween.f0.y + (camTween.f1.y - camTween.f0.y) * e;
  applyFrame();
  if (t >= 1) camTween = null;
}

/* ---------------- explode, visibility ---------------- */
function setExplode(f) {
  for (const { m, base, dir } of explodeItems) m.position.copy(base).addScaledVector(dir, f);
  deskGroup.visible = f < 0.05; // the clamp parts drop through the desk when pulled apart
}

/* ---------------- picking ---------------- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let hovered = null, selected = null;
const HOVER = new THREE.Color(0x3a6ea5), SEL = new THREE.Color(0x3a6ea5);
function pickAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(pickables.filter(visibleDeep), false)[0];
  return hit ? hit.object : null;
}
function visibleDeep(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
function tint(compName, color, amount) {
  const c = comps.get(compName);
  if (!c) return;
  for (const m of c.meshes) { m.material.emissive.copy(color); m.material.emissiveIntensity = amount; }
}
function refreshTints() {
  for (const name of comps.keys()) tint(name, HOVER, 0);
  if (hovered && hovered !== selected?.userData.component) tint(hovered, HOVER, 0.25);
  if (selected) tint(selected.userData.component, SEL, 0.55);
}
function select(mesh) {
  selected = mesh;
  refreshTints();
  const card = $('#pick');
  if (!mesh) { card.hidden = true; return; }
  const comp = mesh.userData.component;
  $('#pickComp').textContent = COMPONENT_LABEL[comp] || comp;
  $('#pickBody').textContent = `${bodyLabel(mesh.name)} · ${mesh.name.replace(/_/g, ' ')}`;
  $('#pickMat').textContent = MATERIAL_LABEL[mesh.userData.category] || '';
  card.hidden = false;
}

const tip = $('#tip');
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; stopIdle(); });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
  select(pickAt(e.clientX, e.clientY));
});
let moveQueued = false, lastMove = null;
renderer.domElement.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !modelRoot) return;
  lastMove = e;
  if (moveQueued) return;
  moveQueued = true;
  requestAnimationFrame(() => {
    moveQueued = false;
    const m = pickAt(lastMove.clientX, lastMove.clientY);
    const name = m ? m.userData.component : null;
    if (name !== hovered) { hovered = name; refreshTints(); }
    if (m) {
      const r = host.getBoundingClientRect();
      tip.textContent = bodyLabel(m.name);
      tip.style.left = `${lastMove.clientX - r.left + 14}px`;
      tip.style.top = `${lastMove.clientY - r.top + 14}px`;
      tip.hidden = false;
    } else tip.hidden = true;
  });
});
renderer.domElement.addEventListener('pointerleave', () => { tip.hidden = true; hovered = null; refreshTints(); });
$('#pickClose').addEventListener('click', () => select(null));
host.addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });

/* ---------------- UI wiring ---------------- */
document.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
document.querySelectorAll('input[data-joint]').forEach((inp) => inp.addEventListener('input', () => {
  tween = null;
  state[inp.dataset.joint] = +inp.value;
  document.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  applyState();
}));
$('#explode').addEventListener('input', (e) => setExplode(+e.target.value));
$('#showScreens').addEventListener('change', (e) => screenParts.forEach((m) => { m.visible = e.target.checked; }));
$('#showEdges').addEventListener('change', (e) => { edgeMat.visible = e.target.checked; });
$('#autoSpin').addEventListener('change', (e) => { controls.autoRotate = e.target.checked; });
document.querySelectorAll('[data-cam]').forEach((b) => b.addEventListener('click', () => setCamera(b.dataset.cam)));
function stopIdle() {
  if (camTween) { Object.assign(frame, camTween.f1); applyFrame(); }
  camTween = null;
}
controls.addEventListener('start', stopIdle);

const panel = $('#panel'), toggle = $('#panelToggle');
toggle.addEventListener('click', () => {
  const collapsed = panel.classList.toggle('collapsed');
  toggle.setAttribute('aria-expanded', String(!collapsed));
});
if (innerWidth < 720) { panel.classList.add('collapsed'); toggle.setAttribute('aria-expanded', 'false'); }

// solid top bar once the hero is scrolled past
const bar = document.querySelector('.bar');
new IntersectionObserver(([e]) => bar.classList.toggle('solid', !e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' })
  .observe(document.querySelector('.stage'));

/* ---------------- render loop (paused when off screen) ---------------- */
let onScreen = true;
new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }).observe(host);
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;
  camera.aspect = w / h;
  Object.assign(frame, frameFor(frame.view));
  applyFrame();
}
new ResizeObserver(resize).observe(host);
resize();
renderer.setAnimationLoop((now) => {
  if (!onScreen) return;
  stepTween(now);
  stepCam(now);
  controls.update();
  renderer.render(scene, camera);
});

/* ---------------- download list (manifest written at deploy) ---------------- */
const GROUPS = [
  { key: 'design', title: 'CAD design', what: 'The SolidCraft source and the whole package as one archive.', primary: true },
  { key: 'drawings', title: 'Drawings and bill of materials', what: 'Ten A3 sheets with every part dimensioned, plus the material, hardware, cut and print lists.', primary: true },
  { key: 'step', title: 'STEP assembly', what: 'The full assembly for any CAD tool or fabricator.', primary: true },
  { key: 'dxf', title: 'Laser-cut profiles', what: 'Flat parts in mm. T01 and T02 are bent: their bend lines are on BEND layers, with bend tables in CSV.' },
  { key: 'stl', title: '3D prints', what: 'One STL per part type, checked watertight. PA12, PETG or TPU.' },
];
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} kB`);
function prettify(name) {
  const base = name.replace(/\.[^.]+$/, '');
  const m = base.match(/^([TP]\d{2})_(.+?)(?:_x(\d+))?$/);
  if (!m) return { code: '', label: base.replace(/_/g, ' '), qty: '' };
  return { code: m[1], label: m[2].replace(/_/g, ' '), qty: m[3] ? `× ${m[3]}` : '' };
}
fetch('files/manifest.json').then((r) => (r.ok ? r.json() : Promise.reject())).then((files) => {
  const box = $('#files');
  box.textContent = '';
  for (const g of GROUPS) {
    const list = files.filter((f) => f.group === g.key);
    if (!list.length) continue;
    const sec = document.createElement('div');
    sec.className = `fgroup${g.primary ? ' primary' : ''}`;
    const total = list.reduce((s, f) => s + f.size, 0);
    sec.innerHTML = `<h3>${g.title}<small>${list.length} file${list.length > 1 ? 's' : ''}, ${fmtSize(total)}</small></h3><p class="what">${g.what}</p>`;
    const ul = document.createElement('ul');
    ul.className = 'flist';
    for (const f of list) {
      const p = prettify(f.name);
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `files/${f.path}`;
      a.setAttribute('download', '');
      a.innerHTML = `<span class="code"></span><span class="name"></span><span class="qty"></span><span class="size"></span>`;
      a.querySelector('.code').textContent = p.code || f.name.split('.').pop().toUpperCase();
      a.querySelector('.name').textContent = p.label;
      a.querySelector('.qty').textContent = p.qty;
      a.querySelector('.size').textContent = fmtSize(f.size);
      li.appendChild(a);
      ul.appendChild(li);
    }
    sec.appendChild(ul);
    box.appendChild(sec);
  }
}).catch(() => {});
