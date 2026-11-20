import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {GardenPlotState} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

function createLeafShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.085, 0.08, 0.06, 0.21);
  s.quadraticCurveTo(0.022, 0.29, 0, 0.34);
  s.quadraticCurveTo(-0.022, 0.29, -0.06, 0.21);
  s.quadraticCurveTo(-0.085, 0.08, 0, 0);
  return s;
}

function createBladeShape(width = 0.045, height = 0.28): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-width * 0.5, 0);
  s.quadraticCurveTo(-width * 0.35, height * 0.55, 0, height);
  s.quadraticCurveTo(width * 0.35, height * 0.55, width * 0.5, 0);
  s.closePath();
  return s;
}

function createWatermelonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5EB65E';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#1D5C28';
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

/** Multi-grain braided wheat ear spike with alternating plump kernels & fine awns */
function buildWheatHead(grainMat: THREE.Material, huskMat: THREE.Material, awnMat: THREE.Material): THREE.Group {
  const head = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.011, 0.27, 5), huskMat);
  spine.position.y = 0.135;
  head.add(spine);

  const grainGeo = new THREE.SphereGeometry(0.028, 6, 5);
  const awnGeo = new THREE.CylinderGeometry(0.0025, 0.004, 0.12, 4);

  // 5 tiers of alternating paired wheat grains spiraling up the spike
  for (let tier = 0; tier < 5; tier++) {
    const ty = 0.03 + tier * 0.048;
    const scaleTier = 1 - Math.abs(tier - 2) * 0.12;
    for (const side of [-1, 1]) {
      const kernel = new THREE.Mesh(grainGeo, tier % 2 === 0 ? grainMat : huskMat);
      kernel.scale.set(0.75 * scaleTier, 1.45 * scaleTier, 0.68 * scaleTier);
      kernel.position.set(side * 0.025, ty, (tier % 2 === 0 ? 1 : -1) * 0.008);
      kernel.rotation.z = side * -0.42;
      kernel.rotation.y = (tier * Math.PI) / 4;
      head.add(kernel);

      if (tier >= 2) {
        const awn = new THREE.Mesh(awnGeo, awnMat);
        awn.position.set(side * 0.034, ty + 0.072, 0);
        awn.rotation.z = side * -0.22;
        head.add(awn);
      }
    }
  }
  const tipGrain = new THREE.Mesh(grainGeo, grainMat);
  tipGrain.scale.set(0.55, 1.35, 0.55);
  tipGrain.position.y = 0.275;
  head.add(tipGrain);

  const tipAwn = new THREE.Mesh(awnGeo, awnMat);
  tipAwn.position.y = 0.34;
  head.add(tipAwn);

  return head;
}

/** Drooping beaded golden rice panicle */
function buildRicePanicle(grainMat: THREE.Material, stemMat: THREE.Material): THREE.Group {
  const p = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.06, 0.04, 0),
    new THREE.Vector3(0.14, -0.02, 0),
    new THREE.Vector3(0.2, -0.13, 0),
  ]);
  const stem = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.008, 5, false), stemMat);
  p.add(stem);

  const grainGeo = new THREE.SphereGeometry(0.02, 6, 5);
  const pts = [0.28, 0.42, 0.55, 0.68, 0.8, 0.9, 1.0];
  pts.forEach((t, idx) => {
    const pos = curve.getPoint(t);
    for (const side of [-1, 1]) {
      const g = new THREE.Mesh(grainGeo, grainMat);
      g.scale.set(0.75, 1.35, 0.7);
      g.position.set(pos.x + side * 0.014, pos.y - 0.015, ((idx % 2 === 0 ? 1 : -1) * side) * 0.016);
      g.rotation.z = -0.35 + side * 0.2;
      p.add(g);
    }
  });
  return p;
}

/** Feathery compound carrot frond plume */
function buildCarrotPlume(matDark: THREE.Material, matBright: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.038, 0.14), {
    depth: 0.008,
    bevelEnabled: false,
  });
  for (let i = 0; i < 6; i++) {
    const branch = new THREE.Group();
    const angle = (i / 6) * Math.PI * 2 + (i % 2) * 0.15;
    branch.rotation.y = angle;
    branch.rotation.x = 0.36 + (i % 2) * 0.14;

    const petiole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.015, 0.25, 5),
      i % 2 === 0 ? matDark : matBright,
    );
    petiole.position.y = 0.125;
    branch.add(petiole);

    // 3 pairs of lacy leaflets along the petiole
    for (let j = 0; j < 3; j++) {
      const ly = 0.11 + j * 0.055;
      const sc = 0.9 - j * 0.16;
      for (const side of [-1, 1]) {
        const leaflet = new THREE.Mesh(bladeGeo, j === 2 ? matBright : matDark);
        leaflet.scale.setScalar(sc);
        leaflet.position.set(side * 0.012, ly, 0);
        leaflet.rotation.z = side * -0.78;
        leaflet.rotation.y = side * 0.35;
        branch.add(leaflet);
      }
    }
    const tip = new THREE.Mesh(bladeGeo, matBright);
    tip.scale.setScalar(0.85);
    tip.position.y = 0.24;
    branch.add(tip);

    g.add(branch);
  }
  return g;
}

function buildTinyBlossom(petalMat: THREE.Material, centerMat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), petalMat);
    p.scale.set(1.1, 0.45, 0.85);
    p.position.set(Math.cos(a) * 0.025, 0, Math.sin(a) * 0.025);
    g.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), centerMat);
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
  const lobeGeo = new THREE.SphereGeometry(0.14 * scale, 10, 8);
  const lobes = 10;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const lobe = new THREE.Mesh(lobeGeo, bodyMat);
    lobe.scale.set(0.64, 0.82, 0.92);
    lobe.position.set(Math.cos(a) * 0.088 * scale, 0.12 * scale, Math.sin(a) * 0.088 * scale);
    lobe.rotation.y = -a;
    g.add(lobe);
  }
  const peduncleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.21 * scale, 0),
    new THREE.Vector3(0.02 * scale, 0.28 * scale, 0.01 * scale),
    new THREE.Vector3(0.055 * scale, 0.32 * scale, -0.015 * scale),
  ]);
  const peduncle = new THREE.Mesh(
    new THREE.TubeGeometry(peduncleCurve, 6, 0.024 * scale, 6, false),
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

  // 1. Tilled Soil Furrow Ridges
  const ridgeMat = clayMat(plot.watered ? '#442815' : '#6C462A', 0.94);
  for (const rz of [-0.32, 0, 0.32]) {
    const ridge = new THREE.Mesh(new RoundedBoxGeometry(1.02, 0.055, 0.22, 2, 0.025), ridgeMat);
    ridge.position.set(0, SOIL_Y - 0.01, rz);
    g.add(ridge);
  }

  // 2. Weeds (Dọn cỏ) — wild olive-green blade tufts at dirt edges
  if (plot.hasWeed) {
    const weedDark = clayMat('#5E8F3D', 0.82);
    const weedLight = clayMat('#7FAF4C', 0.78);
    const weedGeo = new THREE.ExtrudeGeometry(createBladeShape(0.042, 0.24), {
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
        blade.scale.setScalar(0.85 + (b % 2) * 0.22);
        tuft.add(blade);
      }
      g.add(tuft);
    });
  }

  // 3. Growing Stage (Grounded Twin-Leaf Sprouts with Earth Collar)
  if (plot.stage === 'growing') {
    const sproutMat = clayMat(plot.watered ? '#56C868' : '#73B95F', 0.6);
    const sproutTipMat = clayMat(plot.watered ? '#75DE81' : '#8FD177', 0.56);
    const moundMat = clayMat(plot.watered ? '#3B2110' : '#5E3B22', 0.94);
    const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
      depth: 0.012,
      bevelEnabled: false,
    });
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
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.032, 8), moundMat);
      collar.position.y = 0.012;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.028, 0.15, 7), sproutMat);
      stem.position.y = 0.075;
      const l1 = new THREE.Mesh(leafGeo, sproutMat);
      l1.scale.setScalar(0.56);
      l1.position.set(0, 0.13, 0);
      l1.rotation.x = 0.85;
      const l2 = l1.clone();
      l2.rotation.y = Math.PI;
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), sproutTipMat);
      bud.position.y = 0.16;
      sprout.add(collar, stem, l1, l2, bud);
      g.add(sprout);
    });
  }

  // 4. Ready Stage (14 Crafted Botanical Models)
  if (plot.stage === 'ready' && plot.crop) {
    const leafRich = clayMat('#4C9A4E', 0.7);
    const leafDeep = clayMat('#387D42', 0.72);
    const leafBright = clayMat('#64AF56', 0.66);
    const woodMat = clayMat('#8A5B36', 0.8);
    const blossomMat = clayMat('#FFFBF2', 0.55);
    const pollenMat = clayMat('#F4C946', 0.55);

    if (plot.crop === 'wheat') {
      const stalkMat = clayMat('#D8B34A', 0.64);
      const grainMat = glossyClayMat('#F5CD58', 0.36);
      const huskMat = clayMat('#DFB042', 0.62);
      const awnMat = clayMat('#F2DC8A', 0.65);
      const grassBaseMat = clayMat('#92AF4A', 0.72);
      const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.04, 0.25), {
        depth: 0.008,
        bevelEnabled: false,
      });

      const clusters: [number, number, number][] = [
        [-0.25, -0.2, -0.14],
        [0.06, -0.24, 0.08],
        [0.27, -0.14, 0.15],
        [-0.22, 0.12, -0.1],
        [0.02, 0.04, 0.05],
        [0.24, 0.2, 0.13],
        [-0.08, 0.26, -0.08],
      ];
      clusters.forEach(([wx, wz, bend], idx) => {
        const cl = new THREE.Group();
        cl.position.set(wx, SOIL_Y, wz);

        // Golden-green base sheath blades
        for (let b = 0; b < 3; b++) {
          const blade = new THREE.Mesh(bladeGeo, b === 0 ? leafBright : grassBaseMat);
          blade.rotation.y = idx * 1.1 + b * 2.1;
          blade.rotation.x = 0.45 + b * 0.12;
          cl.add(blade);
        }

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(bend * 0.35, 0.26, (idx % 2 === 0 ? 1 : -1) * 0.03),
          new THREE.Vector3(bend, 0.48, (idx % 2 === 0 ? 1 : -1) * 0.06),
        ]);
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 7, 0.015, 6, false), stalkMat);
        cl.add(stalk);

        const head = buildWheatHead(grainMat, huskMat, awnMat);
        head.position.set(bend, 0.47, (idx % 2 === 0 ? 1 : -1) * 0.06);
        head.rotation.z = -bend * 1.05;
        head.rotation.x = idx % 2 === 0 ? 0.18 : -0.16;
        head.rotation.y = idx * 0.7;
        cl.add(head);

        g.add(cl);
      });
    } else if (plot.crop === 'carrot') {
      const carrotMat = glossyClayMat('#F07B29', 0.32);
      const collarMat = clayMat('#52321E', 0.92);
      const carrotBodyGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.045, 0.08),
          new THREE.Vector2(0.105, 0.2),
          new THREE.Vector2(0.12, 0.27),
          new THREE.Vector2(0.055, 0.3),
          new THREE.Vector2(0, 0.3),
        ],
        10,
      );
      const spots: [number, number][] = [
        [-0.25, -0.18],
        [0.23, -0.2],
        [-0.21, 0.2],
        [0.24, 0.19],
      ];
      spots.forEach(([cx, cz], idx) => {
        const cg = new THREE.Group();
        cg.position.set(cx, SOIL_Y, cz);
        cg.rotation.y = idx * 0.85;
        const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.185, 0.065, 9), collarMat);
        mound.position.y = 0.02;
        const root = new THREE.Mesh(carrotBodyGeo, carrotMat);
        root.position.y = -0.125;
        const plume = buildCarrotPlume(leafDeep, leafBright);
        plume.position.y = 0.155;
        cg.add(mound, root, plume);
        g.add(cg);
      });
    } else if (plot.crop === 'corn') {
      const cobMat = glossyClayMat('#F8CD46', 0.28);
      const kernelMat = glossyClayMat('#FFE06B', 0.25);
      const tasselMat = clayMat('#DFAD5B', 0.72);
      const silkMat = clayMat('#D69D52', 0.7);
      const leafGeo = new THREE.ExtrudeGeometry(createBladeShape(0.092, 0.36), {
        depth: 0.012,
        bevelEnabled: false,
      });
      const kernelGeo = new THREE.SphereGeometry(0.018, 5, 5);
      const cobGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.058, 0.04),
          new THREE.Vector2(0.066, 0.16),
          new THREE.Vector2(0.044, 0.25),
          new THREE.Vector2(0, 0.28),
        ],
        9,
      );
      const spots: [number, number][] = [
        [-0.24, -0.15],
        [0.23, -0.13],
        [-0.01, 0.22],
      ];
      spots.forEach(([cx, cz], idx) => {
        const plant = new THREE.Group();
        plant.position.set(cx, SOIL_Y, cz);
        plant.rotation.y = idx * 1.15;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.052, 0.82, 8), leafDeep);
        stalk.position.y = 0.41;
        plant.add(stalk);

        for (let ny = 0.2; ny <= 0.62; ny += 0.2) {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 8), leafRich);
          ring.position.y = ny;
          plant.add(ring);
        }

        // Arching ribbon leaves
        for (let l = 0; l < 5; l++) {
          const leaf = new THREE.Mesh(leafGeo, l % 2 === 0 ? leafRich : leafBright);
          leaf.position.set(0, 0.16 + l * 0.12, 0);
          leaf.rotation.y = l * (Math.PI * 0.62);
          leaf.rotation.x = 1.02;
          plant.add(leaf);
        }

        // Golden cob cradled on side with kernel texture beads + peeled husks + silk
        const cobGroup = new THREE.Group();
        cobGroup.position.set(0.065, 0.38, 0.045);
        cobGroup.rotation.z = -0.45;
        const cob = new THREE.Mesh(cobGeo, cobMat);
        cobGroup.add(cob);

        for (let row = 0; row < 4; row++) {
          const ky = 0.06 + row * 0.048;
          for (let col = 0; col < 6; col++) {
            const ka = (col / 6) * Math.PI * 2;
            const k = new THREE.Mesh(kernelGeo, kernelMat);
            const r = row === 3 ? 0.046 : 0.058;
            k.position.set(Math.cos(ka) * r, ky, Math.sin(ka) * r);
            cobGroup.add(k);
          }
        }

        const huskL = new THREE.Mesh(leafGeo, leafBright);
        huskL.scale.set(0.68, 0.72, 0.68);
        huskL.position.set(-0.025, -0.02, 0.04);
        huskL.rotation.x = 0.36;
        const huskR = huskL.clone();
        huskR.position.set(0.03, -0.02, -0.04);
        huskR.rotation.y = Math.PI;
        const silk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 5), silkMat);
        silk.position.y = 0.3;
        cobGroup.add(huskL, huskR, silk);
        plant.add(cobGroup);

        for (let t = 0; t < 3; t++) {
          const plume = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.15, 5), tasselMat);
          plume.position.set((t - 1) * 0.03, 0.88, 0);
          plume.rotation.z = (t - 1) * -0.25;
          plant.add(plume);
        }
        g.add(plant);
      });
    } else if (plot.crop === 'strawberry') {
      const berryMat = glossyClayMat('#E63E53', 0.24);
      const seedMat = clayMat('#FFE39C', 0.5);
      const berryGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.042, 0.032),
          new THREE.Vector2(0.072, 0.082),
          new THREE.Vector2(0.06, 0.13),
          new THREE.Vector2(0, 0.14),
        ],
        9,
      );
      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.014,
        bevelEnabled: false,
      });

      const bushSpots: [number, number][] = [
        [-0.2, -0.14],
        [0.2, 0.14],
      ];
      bushSpots.forEach(([bx, bz], idx) => {
        const mound = new THREE.Group();
        mound.position.set(bx, SOIL_Y, bz);
        for (let l = 0; l < 7; l++) {
          const leaf = new THREE.Mesh(leafGeo, l % 2 === 0 ? leafRich : leafDeep);
          leaf.rotation.y = (l / 7) * Math.PI * 2 + idx * 0.4;
          leaf.rotation.x = 0.72 + (l % 2) * 0.18;
          leaf.scale.setScalar(0.88);
          mound.add(leaf);
        }
        for (const [fx, fy, fz] of [
          [-0.14, 0.04, 0.13],
          [0.14, 0.05, 0.12],
          [0.02, 0.08, -0.15],
        ]) {
          const berry = new THREE.Mesh(berryGeo, berryMat);
          berry.position.set(fx, fy, fz);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(0.054, 0.032, 5), leafBright);
          cap.position.set(fx, fy + 0.132, fz);
          mound.add(berry, cap);
          for (let s = 0; s < 3; s++) {
            const sa = s * 2.1;
            const sd = new THREE.Mesh(new THREE.SphereGeometry(0.009, 4, 4), seedMat);
            sd.position.set(fx + Math.cos(sa) * 0.062, fy + 0.08, fz + Math.sin(sa) * 0.062);
            mound.add(sd);
          }
        }
        const flower = buildTinyBlossom(blossomMat, pollenMat);
        flower.position.set(0, 0.25, 0.02);
        mound.add(flower);
        g.add(mound);
      });
    } else if (plot.crop === 'tomato') {
      const tomMat = glossyClayMat('#E33D31', 0.22);
      const stakeL = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.86, 7), woodMat);
      stakeL.position.set(-0.28, SOIL_Y + 0.41, 0);
      const stakeR = stakeL.clone();
      stakeR.position.x = 0.28;
      const barTop = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 6), woodMat);
      barTop.rotation.z = Math.PI / 2;
      barTop.position.set(0, SOIL_Y + 0.68, 0);
      const barMid = barTop.clone();
      barMid.position.y = SOIL_Y + 0.36;
      g.add(stakeL, stakeR, barTop, barMid);

      for (const [fx, fy, fz, r] of [
        [-0.16, SOIL_Y + 0.28, 0.06, 0.2],
        [0.16, SOIL_Y + 0.32, -0.05, 0.21],
        [0, SOIL_Y + 0.5, 0.02, 0.22],
      ]) {
        const fol = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), leafRich);
        fol.scale.set(1.1, 0.85, 0.95);
        fol.position.set(fx, fy, fz);
        g.add(fol);
      }
      for (const [tx, ty, tz] of [
        [-0.22, SOIL_Y + 0.32, 0.2],
        [0.18, SOIL_Y + 0.26, 0.22],
        [-0.04, SOIL_Y + 0.56, 0.2],
        [0.2, SOIL_Y + 0.52, -0.14],
        [-0.18, SOIL_Y + 0.46, -0.16],
      ]) {
        const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 9), tomMat);
        fruit.scale.set(1.08, 0.88, 1.08);
        fruit.position.set(tx, ty, tz);
        const calyx = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.03, 5), leafDeep);
        calyx.position.set(tx, ty + 0.085, tz);
        g.add(fruit, calyx);
      }
      const fl = buildTinyBlossom(pollenMat, woodMat);
      fl.position.set(0.08, SOIL_Y + 0.66, 0.14);
      g.add(fl);
    } else if (plot.crop === 'lemon') {
      const lemonMat = glossyClayMat('#F7D23E', 0.24);
      const lemonGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.042, 0.024),
          new THREE.Vector2(0.068, 0.085),
          new THREE.Vector2(0.042, 0.145),
          new THREE.Vector2(0, 0.17),
        ],
        9,
      );
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.068, 0.38, 8), woodMat);
      trunk.position.y = SOIL_Y + 0.18;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.14, SOIL_Y + 0.48, 0.04, 0.22, leafDeep],
        [0.16, SOIL_Y + 0.46, -0.05, 0.21, leafRich],
        [0.0, SOIL_Y + 0.62, 0.02, 0.23, leafBright],
      ] as const) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        puff.position.set(cx, cy, cz);
        g.add(puff);
      }
      for (const [fx, fy, fz, rz] of [
        [-0.22, SOIL_Y + 0.44, 0.2, 0.35],
        [0.2, SOIL_Y + 0.42, 0.18, -0.3],
        [0.02, SOIL_Y + 0.62, 0.22, 0.15],
        [-0.12, SOIL_Y + 0.56, -0.18, -0.25],
      ]) {
        const cit = new THREE.Mesh(lemonGeo, lemonMat);
        cit.position.set(fx, fy, fz);
        cit.rotation.z = rz;
        g.add(cit);
      }
      const fl = buildTinyBlossom(blossomMat, pollenMat);
      fl.position.set(0.14, SOIL_Y + 0.72, 0.14);
      g.add(fl);
    } else if (plot.crop === 'sugarcane') {
      const caneMat = clayMat('#6DB34F', 0.54);
      const nodeMat = clayMat('#DCE49D', 0.6);
      const leafGeo = new THREE.ExtrudeGeometry(createBladeShape(0.075, 0.34), {
        depth: 0.01,
        bevelEnabled: false,
      });
      const spots: [number, number, number][] = [
        [-0.24, -0.14, 0.8],
        [0.02, -0.2, 0.92],
        [0.24, -0.1, 0.76],
        [-0.12, 0.18, 0.86],
        [0.18, 0.18, 0.74],
      ];
      spots.forEach(([sx, sz, h], idx) => {
        const cane = new THREE.Group();
        cane.position.set(sx, SOIL_Y, sz);
        cane.rotation.y = idx * 0.9;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, h, 8), caneMat);
        stalk.position.y = h / 2;
        cane.add(stalk);
        for (let ny = 0.22; ny < h - 0.1; ny += 0.22) {
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.024, 8), nodeMat);
          ring.position.y = ny;
          cane.add(ring);
        }
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(leafGeo, b % 2 === 0 ? leafRich : leafBright);
          blade.position.y = h - 0.05;
          blade.rotation.y = (b / 4) * Math.PI * 2;
          blade.rotation.x = 0.78;
          cane.add(blade);
        }
        g.add(cane);
      });
    } else if (plot.crop === 'watermelon') {
      const stripeTex = createWatermelonTexture();
      disposables.push(stripeTex);
      const melonMat = new THREE.MeshPhysicalMaterial({
        map: stripeTex,
        roughness: 0.3,
        clearcoat: 0.6,
        clearcoatRoughness: 0.24,
      });
      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, SOIL_Y + 0.02, -0.24),
        new THREE.Vector3(-0.1, SOIL_Y + 0.02, 0.04),
        new THREE.Vector3(0.24, SOIL_Y + 0.02, -0.12),
        new THREE.Vector3(0.36, SOIL_Y + 0.02, 0.24),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 12, 0.022, 6, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.015,
        bevelEnabled: false,
      });
      for (const [lx, lz, ry] of [
        [-0.32, 0.22, 0.4],
        [0.32, -0.26, -0.8],
        [0.0, 0.32, 2.2],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, SOIL_Y + 0.04, lz);
        lf.rotation.x = 1.28;
        lf.rotation.z = ry;
        lf.scale.setScalar(0.85);
        g.add(lf);
      }

      const melonMain = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), melonMat);
      melonMain.scale.set(1.22, 0.92, 0.96);
      melonMain.position.set(-0.08, SOIL_Y + 0.18, 0.02);
      const melonSmall = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 9), melonMat);
      melonSmall.scale.set(1.16, 0.92, 0.96);
      melonSmall.position.set(0.26, SOIL_Y + 0.12, 0.14);
      melonSmall.rotation.y = 0.7;
      g.add(melonMain, melonSmall);
    } else if (plot.crop === 'pumpkin') {
      const pumpMat = glossyClayMat('#E87624', 0.32);
      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.34, SOIL_Y + 0.02, 0.24),
        new THREE.Vector3(-0.04, SOIL_Y + 0.02, -0.05),
        new THREE.Vector3(0.32, SOIL_Y + 0.02, 0.18),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 10, 0.024, 6, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.015,
        bevelEnabled: false,
      });
      for (const [lx, lz, ry] of [
        [-0.32, -0.22, 0.9],
        [0.32, -0.22, -0.7],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, SOIL_Y + 0.04, lz);
        lf.rotation.x = 1.25;
        lf.rotation.z = ry;
        lf.scale.setScalar(0.92);
        g.add(lf);
      }

      const bigPumpkin = buildRibbedPumpkin(pumpMat, leafDeep, 1.0);
      bigPumpkin.position.set(-0.08, SOIL_Y, 0.04);
      const smallPumpkin = buildRibbedPumpkin(pumpMat, leafDeep, 0.72);
      smallPumpkin.position.set(0.26, SOIL_Y, 0.14);
      smallPumpkin.rotation.y = 1.1;
      g.add(bigPumpkin, smallPumpkin);
    } else if (plot.crop === 'cacao') {
      const podRipe = glossyClayMat('#A5512F', 0.34);
      const podGold = glossyClayMat('#D99A3B', 0.34);
      const podGeo = new THREE.LatheGeometry(
        [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.052, 0.04),
          new THREE.Vector2(0.068, 0.12),
          new THREE.Vector2(0.046, 0.2),
          new THREE.Vector2(0, 0.24),
        ],
        8,
      );
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.56, 8), woodMat);
      trunk.position.y = SOIL_Y + 0.27;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.14, SOIL_Y + 0.62, 0.06, 0.22, leafDeep],
        [0.14, SOIL_Y + 0.6, -0.06, 0.21, leafRich],
        [0, SOIL_Y + 0.74, 0, 0.23, leafBright],
      ] as const) {
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        puff.scale.set(1.15, 0.8, 1.15);
        puff.position.set(cx, cy, cz);
        g.add(puff);
      }
      for (const [px, py, pz, mat, rz] of [
        [-0.1, SOIL_Y + 0.3, 0.08, podRipe, 0.2],
        [0.1, SOIL_Y + 0.36, 0.07, podGold, -0.18],
        [0.02, SOIL_Y + 0.26, -0.1, podRipe, 0.1],
      ] as const) {
        const pod = new THREE.Mesh(podGeo, mat);
        pod.position.set(px, py, pz);
        pod.rotation.z = rz;
        g.add(pod);
      }
    } else if (plot.crop === 'coffee') {
      const cherryRed = glossyClayMat('#C93241', 0.26);
      const cherryOrange = glossyClayMat('#E47B34', 0.3);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.056, 0.42, 7), woodMat);
      trunk.position.y = SOIL_Y + 0.2;
      g.add(trunk);

      for (const [cx, cy, cz, r, mat] of [
        [-0.15, SOIL_Y + 0.46, 0.04, 0.21, leafDeep],
        [0.15, SOIL_Y + 0.44, -0.04, 0.2, leafDeep],
        [0, SOIL_Y + 0.6, 0, 0.23, leafRich],
      ] as const) {
        const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
        canopy.position.set(cx, cy, cz);
        g.add(canopy);
      }
      const cherryGeo = new THREE.SphereGeometry(0.046, 7, 7);
      for (const [bx, by, bz, mat] of [
        [-0.18, SOIL_Y + 0.46, 0.2, cherryRed],
        [-0.11, SOIL_Y + 0.52, 0.22, cherryRed],
        [0.16, SOIL_Y + 0.42, 0.19, cherryOrange],
        [0.2, SOIL_Y + 0.48, 0.16, cherryRed],
        [0.02, SOIL_Y + 0.64, 0.21, cherryRed],
        [-0.08, SOIL_Y + 0.58, -0.2, cherryOrange],
        [0.12, SOIL_Y + 0.5, -0.18, cherryRed],
      ] as const) {
        const berry = new THREE.Mesh(cherryGeo, mat);
        berry.position.set(bx, by, bz);
        g.add(berry);
      }
    } else if (plot.crop === 'rice') {
      const riceStalkMat = clayMat('#78A849', 0.66);
      const panicleMat = glossyClayMat('#F2E082', 0.38);
      const bladeGeo = new THREE.ExtrudeGeometry(createBladeShape(0.036, 0.29), {
        depth: 0.008,
        bevelEnabled: false,
      });
      const tufts: [number, number, number][] = [
        [-0.24, -0.2, -0.1],
        [0.08, -0.24, 0.12],
        [0.26, -0.1, 0.15],
        [-0.2, 0.14, -0.13],
        [0.12, 0.22, 0.12],
        [-0.02, 0.0, 0.06],
      ];
      tufts.forEach(([rx, rz, lean], idx) => {
        const tuft = new THREE.Group();
        tuft.position.set(rx, SOIL_Y, rz);
        tuft.rotation.y = idx * 0.95;

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(lean * 0.4, 0.26, 0),
          new THREE.Vector3(lean * 0.95, 0.43, 0),
        ]);
        const stalk = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.014, 6, false), riceStalkMat);
        tuft.add(stalk);

        const panicle = buildRicePanicle(panicleMat, riceStalkMat);
        panicle.position.set(lean * 0.95, 0.43, 0);
        if (lean < 0) panicle.rotation.y = Math.PI;
        tuft.add(panicle);

        for (let b = 0; b < 3; b++) {
          const lf = new THREE.Mesh(bladeGeo, b === 0 ? leafDeep : leafRich);
          lf.rotation.y = b * 2.05;
          lf.rotation.x = 0.48 + (b % 2) * 0.16;
          tuft.add(lf);
        }
        g.add(tuft);
      });
    } else if (plot.crop === 'scallion') {
      const bulbMat = clayMat('#F4F6EE', 0.46);
      const shootMat = glossyClayMat('#52AC49', 0.34);
      const shootTipMat = clayMat('#76C862', 0.45);
      const parsleyGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.01,
        bevelEnabled: false,
      });
      const clusters: [number, number][] = [
        [-0.26, -0.18],
        [0.0, -0.22],
        [0.24, -0.16],
        [-0.22, 0.16],
        [0.04, 0.12],
        [0.26, 0.18],
      ];
      clusters.forEach(([sx, sz], idx) => {
        const cl = new THREE.Group();
        cl.position.set(sx, SOIL_Y, sz);
        cl.rotation.y = idx * 0.7;
        for (let s = 0; s < 3; s++) {
          const ox = (s - 1) * 0.048;
          const oz = (s % 2 === 0 ? 1 : -1) * 0.025;
          const h = 0.36 + ((s + idx) % 3) * 0.08;
          const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.095, 7), bulbMat);
          bulb.position.set(ox, 0.045, oz);
          const stalk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.014, 0.028, h, 7),
            s === 1 ? shootTipMat : shootMat,
          );
          stalk.position.set(ox, 0.09 + h / 2, oz);
          stalk.rotation.z = (s - 1) * -0.12;
          stalk.rotation.x = (idx % 2 === 0 ? 1 : -1) * 0.06;
          cl.add(bulb, stalk);
        }
        const herb = new THREE.Mesh(parsleyGeo, leafRich);
        herb.scale.setScalar(0.5);
        herb.position.set(0.05, 0.08, 0.05);
        herb.rotation.x = 0.85;
        cl.add(herb);
        g.add(cl);
      });
    } else if (plot.crop === 'vanilla') {
      const podMat = glossyClayMat('#523222', 0.28);
      const podUnripeMat = clayMat('#659B49', 0.48);
      const orchidPetalMat = clayMat('#FFF5D6', 0.42);
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.78, 8), woodMat);
      stake.position.set(0, SOIL_Y + 0.39, 0);
      g.add(stake);

      const vineCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, SOIL_Y + 0.02, 0.06),
        new THREE.Vector3(0.09, SOIL_Y + 0.24, 0.02),
        new THREE.Vector3(-0.08, SOIL_Y + 0.48, -0.04),
        new THREE.Vector3(0.08, SOIL_Y + 0.7, 0.04),
      ]);
      const vine = new THREE.Mesh(new THREE.TubeGeometry(vineCurve, 12, 0.022, 6, false), leafDeep);
      g.add(vine);

      const leafGeo = new THREE.ExtrudeGeometry(createLeafShape(), {
        depth: 0.012,
        bevelEnabled: false,
      });
      for (const [lx, ly, lz, ry] of [
        [0.06, SOIL_Y + 0.26, 0.06, 0.4],
        [-0.08, SOIL_Y + 0.46, 0.04, 2.5],
        [0.06, SOIL_Y + 0.64, -0.04, -0.8],
        [-0.06, SOIL_Y + 0.68, 0.06, 1.8],
      ]) {
        const lf = new THREE.Mesh(leafGeo, leafRich);
        lf.position.set(lx, ly, lz);
        lf.rotation.y = ry;
        lf.rotation.x = 1.05;
        lf.scale.setScalar(0.75);
        g.add(lf);
      }

      for (const [px, py, pz, mat, rz] of [
        [0.14, SOIL_Y + 0.38, 0.1, podMat, 0.12],
        [0.18, SOIL_Y + 0.36, 0.04, podMat, 0.04],
        [-0.14, SOIL_Y + 0.48, 0.09, podUnripeMat, -0.1],
        [-0.16, SOIL_Y + 0.28, -0.06, podMat, -0.08],
      ] as const) {
        const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.16, 4, 6), mat);
        pod.position.set(px, py, pz);
        pod.rotation.z = rz;
        g.add(pod);
      }

      const orchid1 = buildTinyBlossom(orchidPetalMat, pollenMat);
      orchid1.scale.setScalar(1.35);
      orchid1.position.set(0.11, SOIL_Y + 0.68, 0.11);
      const orchid2 = buildTinyBlossom(orchidPetalMat, pollenMat);
      orchid2.scale.setScalar(1.2);
      orchid2.position.set(-0.1, SOIL_Y + 0.58, -0.09);
      g.add(orchid1, orchid2);
    }
  }

  // 5. Pest (Chú sâu xanh uốn lượn — chỉ có SÂU, không vẽ bọ)
  if (plot.hasPest && plot.stage !== 'empty') {
    const wormGroup = new THREE.Group();
    const pestY = plot.stage === 'ready' ? SOIL_Y + 0.19 : SOIL_Y + 0.08;
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
        new THREE.SphereGeometry(sr, 8, 7),
        si % 2 === 0 ? segLime : segEmerald,
      );
      seg.position.set(sx, sy, sz);
      wormGroup.add(seg);
    });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.054, 9, 8), headMat);
    head.position.set(0.006, 0.074, 0.155);
    wormGroup.add(head);

    for (const ex of [-0.022, 0.022]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.011, 5, 5), eyeMat);
      eye.position.set(0.006 + ex, 0.088, 0.202);
      const feeler = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.04, 5), hornMat);
      feeler.position.set(0.006 + ex * 1.15, 0.124, 0.172);
      feeler.rotation.x = 0.45;
      feeler.rotation.z = ex > 0 ? -0.35 : 0.35;
      wormGroup.add(eye, feeler);
    }

    g.add(wormGroup);
  }

  return g;
}
