import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GardenPlotState} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

function createLeafShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.095, 0.09, 0.068, 0.24);
  s.quadraticCurveTo(0.025, 0.33, 0, 0.39);
  s.quadraticCurveTo(-0.025, 0.33, -0.068, 0.24);
  s.quadraticCurveTo(-0.095, 0.09, 0, 0);
  return s;
}

function createBladeShape(width = 0.05, height = 0.32): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, 0);
  s.quadraticCurveTo(-width * 0.36, height * 0.55, 0, height);
  s.quadraticCurveTo(width * 0.36, height * 0.55, width * 0.5, 0);
  s.closePath();
  return s;
}

function createWatermelonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#62BA61';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#1E5E2A';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let x = 8; x < 128; x += 21) {
    ctx.beginPath();
    for (let y = 0; y <= 128; y += 16) {
      const zig = (y / 16) % 2 === 0 ? -4 : 4;
      if (y === 0) ctx.moveTo(x + zig, y);
      else ctx.lineTo(x + zig, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lush multi-grain braided golden wheat ear spike (~0.36m tall) */
function buildWheatHead(
  grainMat: THREE.Material,
  huskMat: THREE.Material,
  awnMat: THREE.Material,
  grainGeo: THREE.BufferGeometry,
  awnGeo: THREE.BufferGeometry,
  spineGeo: THREE.BufferGeometry,
): THREE.Group {
  const head = new THREE.Group();
  const spine = new THREE.Mesh(spineGeo, huskMat);
  spine.position.y = 0.16;
  head.add(spine);

  for (let tier = 0; tier < 6; tier++) {
    const ty = 0.036 + tier * 0.052;
    const scaleTier = 1 - Math.abs(tier - 2.4) * 0.1;
    for (const side of [-1, 1]) {
      const kernel = new THREE.Mesh(grainGeo, tier % 2 === 0 ? grainMat : huskMat);
      kernel.scale.set(0.82 * scaleTier, 1.52 * scaleTier, 0.74 * scaleTier);
      kernel.position.set(side * 0.028, ty, (tier % 2 === 0 ? 1 : -1) * 0.01);
      kernel.rotation.z = side * -0.42;
      kernel.rotation.y = (tier * Math.PI) / 4;
      head.add(kernel);

      if (tier >= 2) {
        const awn = new THREE.Mesh(awnGeo, awnMat);
        awn.position.set(side * 0.036, ty + 0.08, 0);
        awn.rotation.z = side * -0.22;
        head.add(awn);
      }
    }
  }
  const tipGrain = new THREE.Mesh(grainGeo, grainMat);
  tipGrain.scale.set(0.65, 1.45, 0.65);
  tipGrain.position.y = 0.345;
  head.add(tipGrain);

  const tipAwn = new THREE.Mesh(awnGeo, awnMat);
  tipAwn.position.y = 0.42;
  head.add(tipAwn);

  return head;
}

/** Graceful drooping golden-beaded rice panicle */
function buildRicePanicle(
  grainMat: THREE.Material,
  stemMat: THREE.Material,
  grainGeo: THREE.BufferGeometry,
): THREE.Group {
  const p = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.08, 0.06, 0),
    new THREE.Vector3(0.18, -0.02, 0),
    new THREE.Vector3(0.26, -0.17, 0),
  ]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 7, 0.009, 5, false), stemMat);
  p.add(stem);

  const pts = [0.24, 0.37, 0.5, 0.63, 0.75, 0.87, 0.99];
  pts.forEach((t, idx) => {
    const pos = curve.getPoint(t);
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(grainGeo, grainMat);
      g.scale.set(0.84, 1.45, 0.78);
      g.position.set(pos.x + side * 0.016, pos.y - 0.018, ((idx % 2 === 0 ? 1 : -1) * side) * 0.018);
      g.rotation.z = -0.35 + side * 0.2;
      p.add(g);
    }
  });
  return p;
}

/** Taller feathery compound carrot frond plume (~0.45m high) */
function buildCarrotPlume(
  matDark: THREE.Material,
  matBright: THREE.Material,
  bladeGeo: THREE.BufferGeometry,
  petioleGeo: THREE.BufferGeometry,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const branch = new THREE.Group();
    const angle = (i / 6) * Math.PI * 2 + (i % 2) * 0.16;
    branch.rotation.y = angle;
    branch.rotation.x = 0.3 + (i % 2) * 0.14;

    const petiole = new THREE.Mesh(petioleGeo, i % 2 === 0 ? matDark : matBright);
    petiole.position.y = 0.165;
    branch.add(petiole);

    for (let j = 0; j < 3; j++) {
      const ly = 0.14 + j * 0.072;
      const sc = 0.96 - j * 0.15;
      for (const side of [-1, 1]) {
        const leaflet = new THREE.Mesh(bladeGeo, j === 2 ? matBright : matDark);
        leaflet.scale.setScalar(sc);
        leaflet.position.set(side * 0.014, ly, 0);
        leaflet.rotation.z = side * -0.78;
        leaflet.rotation.y = side * 0.35;
        branch.add(leaflet);
      }
    }
    const tip = new THREE.Mesh(bladeGeo, matBright);
    tip.scale.setScalar(0.92);
    tip.position.y = 0.31;
    branch.add(tip);

    g.add(branch);
  }
  return g;
}

function buildTinyBlossom(
  petalMat: THREE.Material,
  centerMat: THREE.Material,
  petalGeo: THREE.BufferGeometry,
  centerGeo: THREE.BufferGeometry,
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.scale.set(1.12, 0.46, 0.88);
    p.position.set(Math.cos(a) * 0.026, 0, Math.sin(a) * 0.026);
    g.add(p);
  }
  const c = new THREE.Mesh(centerGeo, centerMat);
  c.position.y = 0.008;
  g.add(c);
  return g;
}

function buildRibbedPumpkin(
  bodyMat: THREE.Material,
  stemMat: THREE.Material,
  scale = 1,
): THREE.Group {
  const g = new THREE.Group();
  const lobeGeo = new THREE.SphereGeometry(0.155 * scale, 8, 7);
  const lobes = 9;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const lobe = new THREE.Mesh(lobeGeo, bodyMat);
    lobe.scale.set(0.65, 0.84, 0.94);
    lobe.position.set(Math.cos(a) * 0.095 * scale, 0.135 * scale, Math.sin(a) * 0.095 * scale);
    lobe.rotation.y = -a;
    g.add(lobe);
  }
  const peduncleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.24 * scale, 0),
    new THREE.Vector3(0.025 * scale, 0.32 * scale, 0.012 * scale),
    new THREE.Vector3(0.062 * scale, 0.36 * scale, -0.016 * scale),
  ]);
  const peduncle = new THREE.Mesh(
    new THREE.TubeGeometry(peduncleCurve, 5, 0.026 * scale, 5, false),
    stemMat,
  );
  g.add(peduncle);
  return g;
}

export function buildPlotBotanicalDecor(
  plot: GardenPlotState,
  disposables: THREE.Texture[],
): THREE.Group {
  const g = new THREE.Group();
  const SOIL_Y = 0.245;

  // 1. Tilled Soil Furrow Ridges (softer, lighter eye-friendly tones)
  const ridgeMat = clayMat(plot.watered ? '#704E35' : '#9E7855', 0.94);
  const ridgeGeo = new RoundedBoxGeometry(1.0, 0.055, 0.22, 2, 0.025);
  for (const rz of [-0.32, 0, 0.32]) {
    const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
    ridge.position.set(0, SOIL_Y - 0.01, rz);
    g.add(ridge);
  }

  // 2. Weeds (Dọn cỏ)
  if (plot.hasWeed) {
    const weedDark = clayMat('#649642', 0.82);
    const weedLight = clayMat('#84B652', 0.78);
    const weedGeo = new THREE.ExtrudeGeometry(createBladeShape(0.044, 0.26), {
      depth: 0.01,
      bevelEnabled: false,
    });
    const tuftSpots: [number, number][] = [
      [-0.36, 0.34],
      [0.36, -0.32],
      [-0.32, -0.34],
    ];
    tuftSpots.forEach(([wx, wz], tIdx) => {
      const tuft = new THREE.Group();
      tuft.position.set(wx, SOIL_Y, wz);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(weedGeo, b % 2 === 0 ? weedDark : weedLight);
        blade.rotation.y = (b / 4) * Math.PI * 2 + tIdx * 0.5;
        blade.rotation.x = 0.28 + (b % 2) * 0.16;
        blade.scale.setScalar(0.88 + (b % 2) * 0.24);
        tuft.add(blade);
      }
      g.add(tuft);
    });
  }

  // 3. Growing Stage (Lively twin-leaf sprouts with soft earth collar)
  if (plot.stage === 'growing') {
    const sproutMat = clayMat(plot.watered ? '#58CC6B' : '#76BE61', 0.58);
    const sproutTipMat = clayMat(plot.watered ? '#7AE486' : '#94D87B', 0.54);
    const moundMat = clayMat(plot.watered ? '#5F412B' : '#8A6647', 0.94);
    const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
      depth: 0.012,
      bevelEnabled: false,
    });
    const collarGeo = new THREE.CylinderGeometry(0.08, 0.105, 0.034, 8);
    const stemGeo = new THREE.CylinderGeometry(0.022, 0.03, 0.19, 7);
    const budGeo = new THREE.SphereGeometry(0.032, 6, 6);
    const spots: [number, number][] = [
      [-0.22, -0.18],
      [0.2, -0.16],
      [-0.18, 0.18],
      [0.22, 0.16],
    ];
    spots.forEach(([sx, sz], idx) => {
      const sprout = new THREE.Group();
      sprout.position.set(sx, SOIL_Y, sz);
      sprout.rotation.y = idx * 0.9;
      const collar = new THREE.Mesh(collarGeo, moundMat);
      collar.position.y = 0.014;
      const stem = new THREE.Mesh(stemGeo, sproutMat);
      stem.position.y = 0.095;
      const l1 = new THREE.Mesh(leafGeo, sproutMat);
      l1.scale.setScalar(0.64);
      l1.position.set(0, 0.17, 0);
      l1.rotation.x = 0.85;
      const l2 = l1.clone();
      l2.rotation.y = Math.PI;
      const bud = new THREE.Mesh(budGeo, sproutTipMat);
      bud.position.y = 0.21;
      sprout.add(collar, stem, l1, l2, bud);
      g.add(sprout);
    });
  }

  // 4. Ready Stage (14 Tall, Lush, Warm Cozy Crops)
  if (plot.stage === 'ready' && plot.crop) {
    const leafRich = clayMat('#4EA150', 0.68);
    const leafDeep = clayMat('#3A8444', 0.7);
    const leafBright = clayMat('#6CBE59', 0.64);
    const woodMat = clayMat('#8F5F38', 0.78);
    const blossomMat = clayMat('#FFFBF2', 0.52);
    const pollenMat = clayMat('#F7CE4A', 0.52);
    const blossomPetalGeo = new THREE.SphereGeometry(0.026, 5, 5);
    const blossomCenterGeo = new THREE.SphereGeometry(0.019, 5, 5);

    if (plot.crop === 'wheat') {
      // Tall golden waves reaching ~1.30–1.55m total height (chest-shoulder cozy embrace!)
      const stalkMat = clayMat('#DDB64E', 0.62);
      const grainMat = glossyClayMat('#F8D158', 0.34);
      const huskMat = clayMat('#E5B342', 0.6);
      const awnMat = clayMat('#F6E394', 0.62);
      const grassBaseMat = clayMat('#8AB34C', 0.7);

      const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.044, 0.36), {
        depth: 0.008,
        bevelEnabled: false,
      });
      const spineGeo = new THREE.CylinderGeometry(0.009, 0.012, 0.32, 5);
      const grainGeo = new THREE.SphereGeometry(0.032, 6, 5);
      const awnGeo = new THREE.CylinderGeometry(0.0028, 0.0045, 0.14, 4);

      const clusters: [number, number, number, number][] = [
        [-0.31, -0.26, -0.14, 0.76],
        [-0.08, -0.3, 0.06, 0.88],
        [0.18, -0.27, 0.12, 0.82],
        [0.34, -0.1, 0.16, 0.74],
        [-0.34, 0.0, -0.15, 0.84],
        [-0.1, -0.02, -0.05, 0.96],
        [0.14, 0.04, 0.08, 0.92],
        [0.32, 0.18, 0.14, 0.78],
        [-0.26, 0.25, -0.12, 0.8],
        [0.0, 0.24, 0.04, 0.89],
        [0.2, 0.31, 0.11, 0.75],
      ];
      clusters.forEach(([wx, wz, bend, stalkH], idx) => {
        const cl = new THREE.Group();
        cl.position.set(wx, SOIL_Y, wz);

        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(bladeGeo, b === 0 ? leafBright : grassBaseMat);
          blade.rotation.y = idx * 1.1 + b * 2.1;
          blade.rotation.x = 0.42 + b * 0.11;
          cl.add(blade);
        }

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(bend * 0.32, stalkH * 0.52, (idx % 2 === 0 ? 1 : -1) * 0.03),
          new THREE.Vector3(bend, stalkH, (idx % 2 === 0 ? 1 : -1) * 0.06),
        ]);
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.017, 5, false), stalkMat);
        cl.add(stalk);

        const head = buildWheatHead(grainMat, huskMat, awnMat, grainGeo, awnGeo, spineGeo);
        head.position.set(bend, stalkH - 0.02, (idx % 2 === 0 ? 1 : -1) * 0.06);
        head.rotation.z = -bend * 1.05;
        head.rotation.x = idx % 2 === 0 ? 0.16 : -0.14;
        head.rotation.y = idx * 0.7;
        cl.add(head);

        g.add(cl);
      });
    } else if (plot.crop === 'carrot') {
      const carrotMat = glossyClayMat('#F47E2B', 0.3);
      const collarMat = clayMat('#7D583D', 0.92);
      const carrotBodyGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.052, 0.09),
          new THREE.Vector2(0.118, 0.22),
          new THREE.Vector2(0.132, 0.29),
          new THREE.Vector2(0.06, 0.33),
          new THREE.Vector2(0, 0.33),
        ],
        9,
      );
      const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.044, 0.175), {
        depth: 0.008,
        bevelEnabled: false,
      });
      const petioleGeo = new THREE.CylinderGeometry(0.01, 0.017, 0.33, 5);
      const moundGeo = new THREE.CylinderGeometry(0.15, 0.195, 0.07, 8);
      const spots: [number, number][] = [
        [-0.27, -0.22],
        [0.26, -0.23],
        [0.0, 0.01],
        [-0.25, 0.24],
        [0.26, 0.22],
      ];
      spots.forEach(([cx, cz], idx) => {
        const cg = new THREE.Group();
        cg.position.set(cx, SOIL_Y, cz);
        cg.rotation.y = idx * 0.85;
        const mound = new THREE.Mesh(moundGeo, collarMat);
        mound.position.y = 0.024;
        const root = new THREE.Mesh(carrotBodyGeo, carrotMat);
        root.position.y = -0.12;
        const plume = buildCarrotPlume(leafDeep, leafBright, bladeGeo, petioleGeo);
        plume.position.y = 0.19;
        cg.add(mound, root, plume);
        g.add(cg);
      });
    } else if (plot.crop === 'corn') {
      // Towering cornstalks (~1.50–1.68m world height) with broad leaves & dual sunny cobs
      const cobMat = glossyClayMat('#FAD048', 0.26);
      const kernelMat = glossyClayMat('#FFE470', 0.24);
      const tasselMat = clayMat('#E5B45D', 0.7);
      const silkMat = clayMat('#DAA255', 0.7);
      const leafGeo = new THREE.ExtrudeGeometry(createBladeShape(0.11, 0.44), {
        depth: 0.012,
        bevelEnabled: false,
      });
      const kernelGeo = new THREE.SphereGeometry(0.02, 5, 5);
      const cobGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.066, 0.05),
          new THREE.Vector2(0.075, 0.19),
          new THREE.Vector2(0.05, 0.3),
          new THREE.Vector2(0, 0.34),
        ],
        8,
      );
      const silkGeo = new THREE.ConeGeometry(0.025, 0.09, 5);
      const tasselGeo = new THREE.ConeGeometry(0.03, 0.19, 5);
      const ringGeo = new THREE.CylinderGeometry(0.056, 0.056, 0.025, 7);

      const spots: [number, number, number][] = [
        [-0.27, -0.2, 1.18],
        [0.27, -0.18, 1.1],
        [-0.22, 0.24, 1.06],
        [0.24, 0.22, 1.22],
      ];
      spots.forEach(([cx, cz, stalkH], idx) => {
        const plant = new THREE.Group();
        plant.position.set(cx, SOIL_Y, cz);
        plant.rotation.y = idx * 1.25;

        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.058, stalkH, 7),
          leafDeep,
        );
        stalk.position.y = stalkH / 2;
        plant.add(stalk);

        for (let ny = 0.24; ny <= stalkH - 0.16; ny += 0.24) {
          const ring = new THREE.Mesh(ringGeo, leafRich);
          ring.position.y = ny;
          plant.add(ring);
        }

        for (let l = 0; l < 6; l++) {
          const leaf = new THREE.Mesh(leafGeo, l % 2 === 0 ? leafRich : leafBright);
          leaf.position.set(0, 0.2 + l * 0.15, 0);
          leaf.rotation.y = l * (Math.PI * 0.58);
          leaf.rotation.x = 1.0;
          plant.add(leaf);
        }

        // Two golden cobs at alternate heights & sides
        for (const [cy, dir] of [
          [stalkH * 0.44, 1],
          [stalkH * 0.62, -1],
        ] as const) {
          const cobGroup = new THREE.Group();
          cobGroup.position.set(dir * 0.072, cy, dir * 0.048);
          cobGroup.rotation.z = dir * -0.44;
          cobGroup.rotation.y = dir > 0 ? 0.2 : Math.PI + 0.3;
          const cob = new THREE.Mesh(cobGeo, cobMat);
          cobGroup.add(cob);

          for (let row = 0; row < 4; row++) {
            const ky = 0.07 + row * 0.058;
            for (let col = 0; col < 5; col++) {
              const ka = (col / 5) * Math.PI * 2;
              const k = new THREE.Mesh(kernelGeo, kernelMat);
              const r = row === 3 ? 0.052 : 0.066;
              k.position.set(Math.cos(ka) * r, ky, Math.sin(ka) * r);
              cobGroup.add(k);
            }
          }

          const huskL = new THREE.Mesh(leafGeo, leafBright);
          huskL.scale.set(0.68, 0.7, 0.68);
          huskL.position.set(-0.025, -0.02, 0.04);
          huskL.rotation.x = 0.34;
          const silk = new THREE.Mesh(silkGeo, silkMat);
          silk.position.y = 0.35;
          cobGroup.add(huskL, silk);
          plant.add(cobGroup);
        }

        for (let t = 0; t < 3; t++) {
          const plume = new THREE.Mesh(tasselGeo, tasselMat);
          plume.position.set((t - 1) * 0.032, stalkH + 0.07, 0);
          plume.rotation.z = (t - 1) * -0.25;
          plant.add(plume);
        }
        g.add(plant);
      });
    } else if (plot.crop === 'strawberry') {
      const berryMat = glossyClayMat('#EB4056', 0.22);
      const seedMat = clayMat('#FFE5A3', 0.5);
      const berryGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.05, 0.038),
          new THREE.Vector2(0.084, 0.095),
          new THREE.Vector2(0.07, 0.15),
          new THREE.Vector2(0, 0.165),
        ],
        8,
      );
      const capGeo = new THREE.ConeGeometry(0.062, 0.036, 5);
      const seedGeo = new THREE.SphereGeometry(0.01, 4, 4);
      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.014,
        bevelEnabled: false,
      });

      const bushSpots: [number, number][] = [
        [-0.22, -0.18],
        [0.22, -0.16],
        [-0.18, 0.2],
        [0.21, 0.18],
      ];
      bushSpots.forEach(([bx, bz], idx) => {
        const mound = new THREE.Group();
        mound.position.set(bx, SOIL_Y, bz);
        for (let l = 0; l < 6; l++) {
          const leaf = new THREE.Mesh(leafGeo, l % 2 === 0 ? leafRich : leafDeep);
          leaf.rotation.y = (l / 6) * Math.PI * 2 + idx * 0.45;
          leaf.rotation.x = 0.68 + (l % 2) * 0.16;
          leaf.scale.setScalar(1.0);
          mound.add(leaf);
        }
        for (const [fx, fy, fz] of [
          [-0.13, 0.06, 0.12],
          [0.13, 0.07, 0.11],
          [0.0, 0.1, -0.14],
        ]) {
          const berry = new THREE.Mesh(berryGeo, berryMat);
          berry.position.set(fx, fy, fz);
          const cap = new THREE.Mesh(capGeo, leafBright);
          cap.position.set(fx, fy + 0.155, fz);
          mound.add(berry, cap);
          for (let s = 0; s < 3; s++) {
            const sa = s * 2.1;
            const sd = new THREE.Mesh(seedGeo, seedMat);
            sd.position.set(fx + Math.cos(sa) * 0.072, fy + 0.095, fz + Math.sin(sa) * 0.072);
            mound.add(sd);
          }
        }
        const flower = buildTinyBlossom(blossomMat, pollenMat, blossomPetalGeo, blossomCenterGeo);
        flower.position.set(0, 0.31, 0.02);
        mound.add(flower);
        g.add(mound);
      });
    } else if (plot.crop === 'tomato') {
      // High warm rustic garden trellis (~1.12m world height) bursting with crimson tomatoes
      const tomMat = glossyClayMat('#E84033', 0.22);
      const stakeGeo = new THREE.CylinderGeometry(0.03, 0.036, 1.06, 7);
      const stakeL = new THREE.Mesh(stakeGeo, woodMat);
      stakeL.position.set(-0.31, SOIL_Y + 0.52, 0);
      const stakeR = stakeL.clone();
      stakeR.position.x = 0.31;
      const barGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.78, 6);
      const barTop = new THREE.Mesh(barGeo, woodMat);
      barTop.rotation.z = Math.PI / 2;
      barTop.position.set(0, SOIL_Y + 0.92, 0);
      const barMid = barTop.clone();
      barMid.position.y = SOIL_Y + 0.52;
      g.add(stakeL, stakeR, barTop, barMid);

      for (const [fx, fy, fz, r] of [
        [-0.18, SOIL_Y + 0.34, 0.06, 0.24],
        [0.18, SOIL_Y + 0.38, -0.05, 0.25],
        [-0.12, SOIL_Y + 0.68, -0.03, 0.24],
        [0.14, SOIL_Y + 0.72, 0.04, 0.25],
        [0, SOIL_Y + 0.88, 0, 0.22],
      ]) {
        const fol = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafRich);
        fol.scale.set(1.12, 0.88, 0.96);
        fol.position.set(fx, fy, fz);
        g.add(fol);
      }
      const fruitGeo = new THREE.SphereGeometry(0.095, 9, 8);
      const calyxGeo = new THREE.ConeGeometry(0.045, 0.032, 5);
      for (const [tx, ty, tz] of [
        [-0.24, SOIL_Y + 0.38, 0.23],
        [0.2, SOIL_Y + 0.32, 0.24],
        [-0.04, SOIL_Y + 0.62, 0.23],
        [0.22, SOIL_Y + 0.74, 0.2],
        [-0.2, SOIL_Y + 0.76, 0.16],
        [0.2, SOIL_Y + 0.64, -0.18],
        [-0.18, SOIL_Y + 0.52, -0.18],
      ]) {
        const fruit = new THREE.Mesh(fruitGeo, tomMat);
        fruit.scale.set(1.08, 0.88, 1.08);
        fruit.position.set(tx, ty, tz);
        const calyx = new THREE.Mesh(calyxGeo, leafDeep);
        calyx.position.set(tx, ty + 0.09, tz);
        g.add(fruit, calyx);
      }
      const fl = buildTinyBlossom(pollenMat, woodMat, blossomPetalGeo, blossomCenterGeo);
      fl.position.set(0.08, SOIL_Y + 0.98, 0.16);
      g.add(fl);
    } else if (plot.crop === 'lemon') {
      // Taller lush citrus tree (~1.05m tall)
      const lemonMat = glossyClayMat('#FAD43F', 0.24);
      const lemonGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.048, 0.028),
          new THREE.Vector2(0.076, 0.098),
          new THREE.Vector2(0.048, 0.165),
          new THREE.Vector2(0, 0.195),
        ],
        8,
      );
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.076, 0.52, 7), woodMat);
      trunk.position.y = SOIL_Y + 0.25;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.17, SOIL_Y + 0.62, 0.06, 0.26, leafDeep],
        [0.18, SOIL_Y + 0.6, -0.06, 0.25, leafRich],
        [0.0, SOIL_Y + 0.82, 0.02, 0.28, leafBright],
        [0.04, SOIL_Y + 0.66, -0.14, 0.23, leafDeep],
      ] as const) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        puff.position.set(cx, cy, cz);
        g.add(puff);
      }
      for (const [fx, fy, fz, rz] of [
        [-0.25, SOIL_Y + 0.58, 0.24, 0.35],
        [0.24, SOIL_Y + 0.56, 0.22, -0.3],
        [0.02, SOIL_Y + 0.82, 0.26, 0.15],
        [-0.14, SOIL_Y + 0.72, -0.22, -0.25],
        [0.16, SOIL_Y + 0.78, -0.18, 0.25],
      ]) {
        const cit = new THREE.Mesh(lemonGeo, lemonMat);
        cit.position.set(fx, fy, fz);
        cit.rotation.z = rz;
        g.add(cit);
      }
      const fl = buildTinyBlossom(blossomMat, pollenMat, blossomPetalGeo, blossomCenterGeo);
      fl.position.set(0.16, SOIL_Y + 0.96, 0.18);
      g.add(fl);
    } else if (plot.crop === 'sugarcane') {
      // Towering lush bamboo-like sweet canes (~1.05–1.35m high)
      const caneMat = clayMat('#72BC52', 0.52);
      const nodeMat = clayMat('#E2EA9E', 0.6);
      const leafGeo = new THREE.ExtrudeGeometry(createBladeShape(0.088, 0.42), {
        depth: 0.01,
        bevelEnabled: false,
      });
      const nodeGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.026, 7);
      const spots: [number, number, number][] = [
        [-0.28, -0.18, 1.08],
        [-0.02, -0.26, 1.24],
        [0.26, -0.14, 1.02],
        [-0.22, 0.18, 1.14],
        [0.04, 0.04, 1.28],
        [0.25, 0.22, 1.06],
        [-0.05, 0.28, 0.98],
      ];
      spots.forEach(([sx, sz, h], idx) => {
        const cane = new THREE.Group();
        cane.position.set(sx, SOIL_Y, sz);
        cane.rotation.y = idx * 0.9;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, h, 7), caneMat);
        stalk.position.y = h / 2;
        cane.add(stalk);
        for (let ny = 0.24; ny < h - 0.12; ny += 0.24) {
          const ring = new THREE.Mesh(nodeGeo, nodeMat);
          ring.position.y = ny;
          cane.add(ring);
        }
        for (let b = 0; b < 5; b++) {
          const blade = new THREE.Mesh(leafGeo, b % 2 === 0 ? leafRich : leafBright);
          blade.position.y = h - 0.06 - (b === 4 ? 0.18 : 0);
          blade.rotation.y = (b / 5) * Math.PI * 2;
          blade.rotation.x = 0.74;
          cane.add(blade);
        }
        g.add(cane);
      });
    } else if (plot.crop === 'watermelon') {
      const stripeTex = createWatermelonTexture();
      disposables.push(stripeTex);
      const melonMat = new THREE.MeshPhysicalMaterial({
        map: stripeTex,
        roughness: 0.28,
        clearcoat: 0.62,
        clearcoatRoughness: 0.22,
      });
      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.38, SOIL_Y + 0.025, -0.26),
        new THREE.Vector3(-0.1, SOIL_Y + 0.025, 0.05),
        new THREE.Vector3(0.24, SOIL_Y + 0.025, -0.14),
        new THREE.Vector3(0.38, SOIL_Y + 0.025, 0.26),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 10, 0.024, 5, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.015,
        bevelEnabled: false,
      });
      for (const [lx, lz, ry] of [
        [-0.34, 0.24, 0.4],
        [0.34, -0.28, -0.8],
        [0.02, 0.34, 2.2],
        [-0.28, -0.28, -2.1],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, SOIL_Y + 0.045, lz);
        lf.rotation.x = 1.24;
        lf.rotation.z = ry;
        lf.scale.setScalar(0.98);
        g.add(lf);
      }

      const melonMain = new THREE.Mesh(new THREE.SphereGeometry(0.25, 11, 9), melonMat);
      melonMain.scale.set(1.24, 0.94, 0.98);
      melonMain.position.set(-0.1, SOIL_Y + 0.21, 0.02);
      const melonSecond = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), melonMat);
      melonSecond.scale.set(1.18, 0.92, 0.96);
      melonSecond.position.set(0.26, SOIL_Y + 0.15, 0.16);
      melonSecond.rotation.y = 0.7;
      const melonThird = new THREE.Mesh(new THREE.SphereGeometry(0.15, 9, 8), melonMat);
      melonThird.scale.set(1.15, 0.92, 0.95);
      melonThird.position.set(0.2, SOIL_Y + 0.12, -0.22);
      melonThird.rotation.y = -0.5;
      g.add(melonMain, melonSecond, melonThird);
    } else if (plot.crop === 'pumpkin') {
      const pumpMat = glossyClayMat('#EC7A25', 0.3);
      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, SOIL_Y + 0.025, 0.26),
        new THREE.Vector3(-0.04, SOIL_Y + 0.025, -0.06),
        new THREE.Vector3(0.34, SOIL_Y + 0.025, 0.2),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 9, 0.025, 5, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.015,
        bevelEnabled: false,
      });
      for (const [lx, lz, ry] of [
        [-0.34, -0.24, 0.9],
        [0.34, -0.24, -0.7],
        [0.0, 0.34, 2.5],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, SOIL_Y + 0.045, lz);
        lf.rotation.x = 1.2;
        lf.rotation.z = ry;
        lf.scale.setScalar(1.0);
        g.add(lf);
      }

      const bigPumpkin = buildRibbedPumpkin(pumpMat, leafDeep, 1.16);
      bigPumpkin.position.set(-0.1, SOIL_Y, 0.04);
      const midPumpkin = buildRibbedPumpkin(pumpMat, leafDeep, 0.85);
      midPumpkin.position.set(0.26, SOIL_Y, 0.14);
      midPumpkin.rotation.y = 1.1;
      const thirdPumpkin = buildRibbedPumpkin(pumpMat, leafDeep, 0.72);
      thirdPumpkin.position.set(0.16, SOIL_Y, -0.24);
      thirdPumpkin.rotation.y = -0.7;
      g.add(bigPumpkin, midPumpkin, thirdPumpkin);
    } else if (plot.crop === 'cacao') {
      // Warm lush cacao mini-tree (~1.16m high)
      const podRipe = glossyClayMat('#AE5532', 0.32);
      const podGold = glossyClayMat('#E0A03D', 0.32);
      const podGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.056, 0.045),
          new THREE.Vector2(0.074, 0.13),
          new THREE.Vector2(0.05, 0.22),
          new THREE.Vector2(0, 0.26),
        ],
        8,
      );
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.082, 0.7, 7), woodMat);
      trunk.position.y = SOIL_Y + 0.34;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.17, SOIL_Y + 0.76, 0.07, 0.25, leafDeep],
        [0.17, SOIL_Y + 0.74, -0.07, 0.24, leafRich],
        [0, SOIL_Y + 0.92, 0, 0.27, leafBright],
        [0.05, SOIL_Y + 0.8, 0.16, 0.22, leafRich],
      ] as const) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        puff.scale.set(1.18, 0.84, 1.18);
        puff.position.set(cx, cy, cz);
        g.add(puff);
      }
      for (const [px, py, pz, mat, rz] of [
        [-0.11, SOIL_Y + 0.38, 0.09, podRipe, 0.2],
        [0.11, SOIL_Y + 0.46, 0.08, podGold, -0.18],
        [0.02, SOIL_Y + 0.34, -0.11, podRipe, 0.1],
        [-0.08, SOIL_Y + 0.56, -0.08, podGold, -0.14],
      ] as const) {
        const pod = new THREE.Mesh(podGeo, mat);
        pod.position.set(px, py, pz);
        pod.rotation.z = rz;
        g.add(pod);
      }
    } else if (plot.crop === 'coffee') {
      // Rich glossy red coffee cherry shrub (~1.06m tall)
      const cherryRed = glossyClayMat('#CE3544', 0.24);
      const cherryOrange = glossyClayMat('#EB8237', 0.28);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.065, 0.54, 7), woodMat);
      trunk.position.y = SOIL_Y + 0.26;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.18, SOIL_Y + 0.6, 0.05, 0.24, leafDeep],
        [0.18, SOIL_Y + 0.58, -0.05, 0.23, leafDeep],
        [0, SOIL_Y + 0.78, 0, 0.27, leafRich],
        [0.06, SOIL_Y + 0.68, 0.15, 0.22, leafBright],
      ] as const) {
        const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        canopy.position.set(cx, cy, cz);
        g.add(canopy);
      }
      const cherryGeo = new THREE.SphereGeometry(0.05, 6, 6);
      for (const [bx, by, bz, mat] of [
        [-0.2, SOIL_Y + 0.6, 0.24, cherryRed],
        [-0.12, SOIL_Y + 0.68, 0.26, cherryRed],
        [0.19, SOIL_Y + 0.56, 0.23, cherryOrange],
        [0.24, SOIL_Y + 0.64, 0.19, cherryRed],
        [0.02, SOIL_Y + 0.82, 0.25, cherryRed],
        [0.08, SOIL_Y + 0.74, 0.28, cherryOrange],
        [-0.1, SOIL_Y + 0.74, -0.22, cherryOrange],
        [0.14, SOIL_Y + 0.66, -0.21, cherryRed],
      ] as const) {
        const berry = new THREE.Mesh(cherryGeo, mat);
        berry.position.set(bx, by, bz);
        g.add(berry);
      }
    } else if (plot.crop === 'rice') {
      // Taller abundant golden-headed paddy rice (~0.98–1.18m high)
      const riceStalkMat = clayMat('#7BB04C', 0.64);
      const panicleMat = glossyClayMat('#F6E284', 0.34);
      const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.042, 0.36), {
        depth: 0.008,
        bevelEnabled: false,
      });
      const grainGeo = new THREE.SphereGeometry(0.022, 5, 5);
      const tufts: [number, number, number, number][] = [
        [-0.28, -0.24, -0.12, 0.64],
        [0.04, -0.28, 0.1, 0.74],
        [0.29, -0.14, 0.15, 0.68],
        [-0.26, 0.12, -0.14, 0.72],
        [0.0, 0.02, 0.08, 0.8],
        [0.26, 0.18, 0.14, 0.66],
        [-0.1, 0.28, -0.1, 0.7],
        [0.16, 0.28, 0.11, 0.62],
      ];
      tufts.forEach(([rx, rz, lean, h], idx) => {
        const tuft = new THREE.Group();
        tuft.position.set(rx, SOIL_Y, rz);
        tuft.rotation.y = idx * 0.95;

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(lean * 0.42, h * 0.56, 0),
          new THREE.Vector3(lean * 0.95, h, 0),
        ]);
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.016, 5, false), riceStalkMat);
        tuft.add(stalk);

        const panicle = buildRicePanicle(panicleMat, riceStalkMat, grainGeo);
        panicle.position.set(lean * 0.95, h, 0);
        if (lean < 0) panicle.rotation.y = Math.PI;
        tuft.add(panicle);

        for (let b = 0; b < 3; b++) {
          const lf = new THREE.Mesh(bladeGeo, b === 0 ? leafDeep : leafRich);
          lf.rotation.y = b * 2.05;
          lf.rotation.x = 0.46 + (b % 2) * 0.16;
          tuft.add(lf);
        }
        g.add(tuft);
      });
    } else if (plot.crop === 'scallion') {
      // Vigorous tall hollow green onion shoots (~0.70–0.85m high)
      const bulbMat = clayMat('#F5F7F0', 0.44);
      const shootMat = glossyClayMat('#55B34C', 0.32);
      const shootTipMat = clayMat('#78CE64', 0.44);
      const parsleyGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.01,
        bevelEnabled: false,
      });
      const bulbGeo = new THREE.CylinderGeometry(0.032, 0.04, 0.11, 7);
      const clusters: [number, number][] = [
        [-0.28, -0.22],
        [0.0, -0.26],
        [0.27, -0.2],
        [-0.26, 0.16],
        [0.02, 0.02],
        [0.28, 0.18],
        [-0.04, 0.27],
      ];
      clusters.forEach(([sx, sz], idx) => {
        const cl = new THREE.Group();
        cl.position.set(sx, SOIL_Y, sz);
        cl.rotation.y = idx * 0.7;
        for (let s = 0; s < 3; s++) {
          const ox = (s - 1) * 0.052;
          const oz = (s % 2 === 0 ? 1 : -1) * 0.026;
          const h = 0.48 + ((s + idx) % 3) * 0.09;
          const bulb = new THREE.Mesh(bulbGeo, bulbMat);
          bulb.position.set(ox, 0.052, oz);
          const stalk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.015, 0.03, h, 7),
            s === 1 ? shootTipMat : shootMat,
          );
          stalk.position.set(ox, 0.1 + h / 2, oz);
          stalk.rotation.z = (s - 1) * -0.12;
          stalk.rotation.x = (idx % 2 === 0 ? 1 : -1) * 0.06;
          cl.add(bulb, stalk);
        }
        const herb = new THREE.Mesh(parsleyGeo, leafRich);
        herb.scale.setScalar(0.56);
        herb.position.set(0.06, 0.1, 0.06);
        herb.rotation.x = 0.85;
        cl.add(herb);
        g.add(cl);
      });
    } else if (plot.crop === 'vanilla') {
      // Tall spiraling vanilla orchid vine on warm rustic post (~1.20m world height)
      const podMat = glossyClayMat('#573524', 0.28);
      const podUnripeMat = clayMat('#68A24B', 0.46);
      const orchidPetalMat = clayMat('#FFF6D9', 0.4);
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.054, 1.0, 8), woodMat);
      stake.position.set(0, SOIL_Y + 0.5, 0);
      g.add(stake);

      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.09, SOIL_Y + 0.02, 0.07),
        new THREE.Vector3(0.11, SOIL_Y + 0.3, 0.03),
        new THREE.Vector3(-0.1, SOIL_Y + 0.62, -0.05),
        new THREE.Vector3(0.1, SOIL_Y + 0.92, 0.05),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 12, 0.024, 6, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.012,
        bevelEnabled: false,
      });
      for (const [lx, ly, lz, ry] of [
        [0.07, SOIL_Y + 0.34, 0.07, 0.4],
        [-0.09, SOIL_Y + 0.58, 0.05, 2.5],
        [0.08, SOIL_Y + 0.82, -0.04, -0.8],
        [-0.07, SOIL_Y + 0.88, 0.07, 1.8],
        [0.06, SOIL_Y + 0.48, -0.07, -1.9],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, ly, lz);
        lf.rotation.y = ry;
        lf.rotation.x = 1.02;
        lf.scale.setScalar(0.84);
        g.add(lf);
      }

      const podGeo = new THREE.CapsuleGeometry(0.02, 0.18, 4, 6);
      for (const [px, py, pz, mat, rz] of [
        [0.16, SOIL_Y + 0.46, 0.11, podMat, 0.12],
        [0.2, SOIL_Y + 0.44, 0.04, podMat, 0.04],
        [-0.16, SOIL_Y + 0.62, 0.1, podUnripeMat, -0.1],
        [-0.18, SOIL_Y + 0.36, -0.07, podMat, -0.08],
        [0.14, SOIL_Y + 0.72, -0.09, podMat, 0.14],
      ] as const) {
        const pod = new THREE.Mesh(podGeo, mat);
        pod.position.set(px, py, pz);
        pod.rotation.z = rz;
        g.add(pod);
      }

      const orchid1 = buildTinyBlossom(orchidPetalMat, pollenMat, blossomPetalGeo, blossomCenterGeo);
      orchid1.scale.setScalar(1.45);
      orchid1.position.set(0.12, SOIL_Y + 0.9, 0.12);
      const orchid2 = buildTinyBlossom(orchidPetalMat, pollenMat, blossomPetalGeo, blossomCenterGeo);
      orchid2.scale.setScalar(1.3);
      orchid2.position.set(-0.11, SOIL_Y + 0.74, -0.1);
      const orchid3 = buildTinyBlossom(orchidPetalMat, pollenMat, blossomPetalGeo, blossomCenterGeo);
      orchid3.scale.setScalar(1.2);
      orchid3.position.set(0.11, SOIL_Y + 0.52, -0.12);
      g.add(orchid1, orchid2, orchid3);
    }
  }

  // 5. Pest (Chú sâu xanh)
  if (plot.hasPest && plot.stage !== 'empty') {
    const wormGroup = new THREE.Group();
    const pestY = plot.stage === 'ready' ? SOIL_Y + 0.24 : SOIL_Y + 0.085;
    wormGroup.position.set(0.26, pestY, 0.28);
    wormGroup.rotation.y = -0.55;

    const segLime = glossyClayMat('#8BE055', 0.35);
    const segEmerald = glossyClayMat('#5FB83E', 0.38);
    const headMat = glossyClayMat('#A8F070', 0.3);
    const eyeMat = clayMat('#22301A', 0.4);
    const hornMat = clayMat('#D8FFAD', 0.5);

    const segments: [number, number, number, number][] = [
      [0, 0.035, -0.12, 0.036],
      [-0.012, 0.062, -0.068, 0.044],
      [0.01, 0.072, -0.012, 0.048],
      [-0.008, 0.055, 0.048, 0.046],
      [0.004, 0.046, 0.102, 0.044],
    ];
    segments.forEach(([sx, sy, sz, sr], si) => {
      const seg = new THREE.Mesh(
        new THREE.SphereGeometry(sr, 7, 6),
        si % 2 === 0 ? segLime : segEmerald,
      );
      seg.position.set(sx, sy, sz);
      wormGroup.add(seg);
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.054, 8, 7), headMat);
    head.position.set(0.006, 0.074, 0.155);
    wormGroup.add(head);

    const eyeGeo = new THREE.SphereGeometry(0.011, 5, 5);
    const feelerGeo = new THREE.CylinderGeometry(0.004, 0.005, 0.04, 5);
    for (const ex of [-0.022, 0.022]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(0.006 + ex, 0.088, 0.202);
      const feeler = new THREE.Mesh(feelerGeo, hornMat);
      feeler.position.set(0.006 + ex * 1.15, 0.124, 0.172);
      feeler.rotation.x = 0.45;
      feeler.rotation.z = ex > 0 ? -0.35 : 0.35;
      wormGroup.add(eye, feeler);
    }

    g.add(wormGroup);
  }

  return g;
}
