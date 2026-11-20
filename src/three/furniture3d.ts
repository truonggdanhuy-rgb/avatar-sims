import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FurnitureCatalogItem} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

export function buildFurnitureMesh(item: FurnitureCatalogItem): THREE.Group {
  const g = new THREE.Group();
  const mainMat = clayMat(item.color, 0.72);
  const accentMat = clayMat(item.accentColor || '#9E734B', 0.65);

  switch (item.kind) {
    case 'sofa': {
      const base = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.44, 0.96, 3, 0.12),
        mainMat,
      );
      base.position.y = 0.28;
      const back = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.78, 0.28, 3, 0.1),
        accentMat,
      );
      back.position.set(0, 0.62, -0.35);
      [-0.88, 0.88].forEach((ax) => {
        const arm = new THREE.Mesh(
          new RoundedBoxGeometry(0.24, 0.52, 0.94, 3, 0.08),
          accentMat,
        );
        arm.position.set(ax, 0.42, 0);
        g.add(arm);
      });
      [-0.5, 0.5].forEach((px) => {
        const cushion = new THREE.Mesh(
          new RoundedBoxGeometry(0.42, 0.32, 0.18, 2, 0.06),
          clayMat('#FFF6EA', 0.8),
        );
        cushion.position.set(px, 0.58, -0.14);
        cushion.rotation.x = -0.2;
        g.add(cushion);
      });
      g.add(base, back);
      break;
    }

    case 'armchair': {
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.98, 0.42, 0.94, 3, 0.12),
        mainMat,
      );
      seat.position.y = 0.28;
      const back = new THREE.Mesh(
        new RoundedBoxGeometry(0.98, 0.78, 0.24, 3, 0.09),
        accentMat,
      );
      back.position.set(0, 0.62, -0.36);
      [-0.42, 0.42].forEach((ax) => {
        const arm = new THREE.Mesh(
          new RoundedBoxGeometry(0.18, 0.5, 0.88, 2, 0.06),
          accentMat,
        );
        arm.position.set(ax, 0.4, 0);
        g.add(arm);
      });
      g.add(seat, back);
      break;
    }

    case 'coffee_table': {
      const top = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 0.12, 0.88, 3, 0.05),
        mainMat,
      );
      top.position.y = 0.46;
      [
        [-0.54, -0.32],
        [0.54, -0.32],
        [-0.54, 0.32],
        [0.54, 0.32],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.42, 7), accentMat);
        leg.position.set(lx, 0.21, lz);
        g.add(leg);
      });
      const tray = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.26, 0.05, 12),
        clayMat('#FFF8EB', 0.5),
      );
      tray.position.set(-0.2, 0.54, 0);
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.06, 0.11, 9),
        clayMat('#F28482', 0.4),
      );
      mug.position.set(-0.2, 0.61, 0);
      g.add(top, tray, mug);
      break;
    }

    case 'tv_stand': {
      const cabinet = new THREE.Mesh(
        new RoundedBoxGeometry(1.9, 0.58, 0.68, 3, 0.05),
        mainMat,
      );
      cabinet.position.y = 0.34;
      const screenFrame = new THREE.Mesh(
        new RoundedBoxGeometry(1.52, 0.92, 0.1, 2, 0.04),
        accentMat,
      );
      screenFrame.position.set(0, 1.15, -0.05);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.36, 0.76, 0.11),
        glossyClayMat('#8CD3F5', 0.18),
      );
      screen.position.set(0, 1.15, -0.04);
      const standNeck = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.22, 0.12),
        accentMat,
      );
      standNeck.position.set(0, 0.68, -0.05);
      g.add(cabinet, screenFrame, screen, standNeck);
      break;
    }

    case 'bookshelf': {
      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(1.42, 2.05, 0.58, 2, 0.05),
        mainMat,
      );
      frame.position.y = 1.04;
      g.add(frame);
      const bookCols = ['#E86B82', '#6BA383', '#FFD166', '#69B3E7'];
      [0.55, 1.15, 1.72].forEach((sy, rIdx) => {
        const shelf = new THREE.Mesh(
          new THREE.BoxGeometry(1.26, 0.06, 0.52),
          clayMat('#8C5E3A', 0.7),
        );
        shelf.position.set(0, sy - 0.15, 0.05);
        g.add(shelf);
        for (let b = 0; b < 4; b++) {
          const bk = new THREE.Mesh(
            new RoundedBoxGeometry(0.14, 0.34 + ((b + rIdx) % 2) * 0.06, 0.36, 2, 0.02),
            clayMat(bookCols[(b + rIdx) % bookCols.length], 0.6),
          );
          bk.position.set(-0.42 + b * 0.22, sy + 0.05, 0.08);
          g.add(bk);
        }
      });
      break;
    }

    case 'rug_round': {
      const outer = new THREE.Mesh(
        new THREE.CylinderGeometry(1.55, 1.58, 0.04, 24),
        mainMat,
      );
      outer.scale.set(1.06, 1, 0.84);
      outer.position.y = 0.02;
      const inner = new THREE.Mesh(
        new THREE.CylinderGeometry(1.16, 1.18, 0.045, 24),
        accentMat,
      );
      inner.scale.set(1.06, 1, 0.84);
      inner.position.y = 0.022;
      g.add(outer, inner);
      break;
    }

    case 'bed': {
      const headboard = new THREE.Mesh(
        new RoundedBoxGeometry(2.1, 1.42, 0.2, 3, 0.06),
        accentMat,
      );
      headboard.position.set(0, 0.72, -1.12);
      const mattress = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.5, 2.3, 3, 0.1),
        clayMat('#FFFDF8', 0.78),
      );
      mattress.position.set(0, 0.4, 0);
      const blanket = new THREE.Mesh(
        new RoundedBoxGeometry(2.08, 0.52, 1.5, 3, 0.12),
        mainMat,
      );
      blanket.position.set(0, 0.42, 0.42);
      [-0.44, 0.44].forEach((px) => {
        const pillow = new THREE.Mesh(
          new RoundedBoxGeometry(0.82, 0.22, 0.5, 2, 0.07),
          clayMat('#FFFDF8', 0.8),
        );
        pillow.position.set(px, 0.72, -0.76);
        g.add(pillow);
      });
      g.add(headboard, mattress, blanket);
      break;
    }

    case 'wardrobe': {
      const wBody = new THREE.Mesh(
        new RoundedBoxGeometry(1.82, 2.65, 1.0, 3, 0.07),
        mainMat,
      );
      wBody.position.y = 1.32;
      const wTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.98, 0.18, 1.12, 2, 0.04),
        clayMat('#8A5C36', 0.65),
      );
      wTop.position.y = 2.7;
      const mirror = new THREE.Mesh(
        new RoundedBoxGeometry(0.64, 1.78, 0.08, 2, 0.03),
        glossyClayMat(item.accentColor || '#DDF3FC', 0.1),
      );
      mirror.position.set(0.4, 1.42, 0.5);
      const doorPanel = new THREE.Mesh(
        new RoundedBoxGeometry(0.66, 2.15, 0.08, 2, 0.03),
        clayMat('#C59363', 0.64),
      );
      doorPanel.position.set(-0.4, 1.38, 0.5);
      g.add(wBody, wTop, mirror, doorPanel);
      break;
    }

    case 'nightstand': {
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.68, 0.68, 2, 0.05),
        mainMat,
      );
      body.position.y = 0.36;
      const drawer = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.22, 0.06, 2, 0.02),
        clayMat('#E8C79B', 0.65),
      );
      drawer.position.set(0, 0.48, 0.34);
      const lampBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.11, 0.14, 8),
        clayMat('#8C5E3A', 0.65),
      );
      lampBase.position.set(0, 0.77, 0);
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 0.24, 10),
        accentMat,
      );
      shade.position.set(0, 0.94, 0);
      g.add(body, drawer, lampBase, shade);
      break;
    }

    case 'dining_table': {
      const top = new THREE.Mesh(
        new RoundedBoxGeometry(2.0, 0.12, 1.32, 3, 0.05),
        mainMat,
      );
      top.position.y = 0.84;
      [
        [-0.82, -0.48],
        [0.82, -0.48],
        [-0.82, 0.48],
        [0.82, 0.48],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.82, 7), mainMat);
        leg.position.set(lx, 0.41, lz);
        g.add(leg);
      });
      const runner = new THREE.Mesh(
        new RoundedBoxGeometry(1.75, 0.02, 0.42, 2, 0.01),
        accentMat,
      );
      runner.position.y = 0.91;
      const vase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.11, 0.22, 8),
        clayMat('#76B5C5', 0.4),
      );
      vase.position.set(0, 1.02, 0);
      g.add(top, runner, vase);
      break;
    }

    case 'dining_chair': {
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.62, 0.1, 0.58, 2, 0.04),
        accentMat,
      );
      seat.position.y = 0.48;
      const back = new THREE.Mesh(
        new RoundedBoxGeometry(0.6, 0.56, 0.1, 2, 0.03),
        mainMat,
      );
      back.position.set(0, 0.78, -0.24);
      [
        [-0.22, -0.2],
        [0.22, -0.2],
        [-0.22, 0.2],
        [0.22, 0.2],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.46, 6), mainMat);
        leg.position.set(lx, 0.23, lz);
        g.add(leg);
      });
      g.add(seat, back);
      break;
    }

    case 'fridge': {
      const body = new THREE.Mesh(
        new RoundedBoxGeometry(1.04, 2.28, 0.96, 3, 0.08),
        mainMat,
      );
      body.position.y = 1.14;
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(1.06, 0.04, 0.98),
        accentMat,
      );
      seam.position.y = 1.48;
      [0.95, 1.85].forEach((hy) => {
        const handle = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.38, 0.08, 2, 0.02),
          accentMat,
        );
        handle.position.set(-0.34, hy, 0.5);
        g.add(handle);
      });
      g.add(body, seam);
      break;
    }

    case 'dish_cabinet': {
      const base = new THREE.Mesh(
        new RoundedBoxGeometry(1.48, 0.92, 0.74, 2, 0.05),
        mainMat,
      );
      base.position.y = 0.46;
      const hutch = new THREE.Mesh(
        new RoundedBoxGeometry(1.42, 1.24, 0.52, 2, 0.05),
        mainMat,
      );
      hutch.position.set(0, 1.54, -0.08);
      [-0.34, 0.34].forEach((gx) => {
        const glass = new THREE.Mesh(
          new RoundedBoxGeometry(0.56, 0.95, 0.05, 2, 0.02),
          glossyClayMat(item.accentColor || '#D8F1FA', 0.14),
        );
        glass.position.set(gx, 1.56, 0.19);
        g.add(glass);
      });
      g.add(base, hutch);
      break;
    }

    case 'bathtub': {
      const tub = new THREE.Mesh(
        new RoundedBoxGeometry(1.98, 0.72, 1.06, 4, 0.24),
        mainMat,
      );
      tub.position.y = 0.38;
      const water = new THREE.Mesh(
        new RoundedBoxGeometry(1.7, 0.08, 0.8, 3, 0.14),
        glossyClayMat(item.accentColor || '#75C9EE', 0.12),
      );
      water.position.y = 0.68;
      const faucet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 0.34, 8),
        clayMat('#D2DCE6', 0.25, 0.6),
      );
      faucet.position.set(0.84, 0.82, 0);
      g.add(tub, water, faucet);
      break;
    }

    case 'vanity_sink': {
      const cab = new THREE.Mesh(
        new RoundedBoxGeometry(1.24, 0.84, 0.72, 2, 0.05),
        mainMat,
      );
      cab.position.y = 0.42;
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.12, 12),
        clayMat('#FFFFFF', 0.25),
      );
      basin.position.set(0, 0.88, 0.02);
      const mirror = new THREE.Mesh(
        new RoundedBoxGeometry(0.96, 0.88, 0.08, 2, 0.03),
        glossyClayMat(item.accentColor || '#BCE7F9', 0.1),
      );
      mirror.position.set(0, 1.54, -0.26);
      g.add(cab, basin, mirror);
      break;
    }

    case 'floor_lamp': {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 12), accentMat);
      base.position.y = 0.04;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.75, 8), accentMat);
      pole.position.y = 0.92;
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.36, 0.42, 12),
        new THREE.MeshStandardMaterial({
          color: item.color,
          emissive: '#FFD166',
          emissiveIntensity: 0.22,
          roughness: 0.45,
        }),
      );
      shade.position.y = 1.84;
      g.add(base, pole, shade);
      break;
    }

    case 'potted_plant': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 10), accentMat);
      pot.position.y = 0.21;
      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.23, 0.23, 0.05, 10),
        clayMat('#6E472B', 0.9),
      );
      soil.position.y = 0.42;
      const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.32, 9, 8), mainMat);
      c1.position.set(0, 0.72, 0);
      const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), mainMat);
      c2.position.set(-0.2, 0.64, 0.14);
      const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), mainMat);
      c3.position.set(0.2, 0.68, -0.1);
      g.add(pot, soil, c1, c2, c3);
      break;
    }

    case 'window_single': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(1.18, 1.38, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.16, 0.09), glassMat);
      glass.position.set(0, cy, 0.03);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.18, 0.11), mainMat);
      barV.position.set(0, cy, 0.04);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.06, 0.11), mainMat);
      barH.position.set(0, cy + 0.06, 0.04);
      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(1.32, 0.09, 0.2, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.7, 0.07);
      g.add(frame, glass, barV, barH, sill);
      break;
    }

    case 'window_double': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: item.accentColor || '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(2.14, 1.42, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      [-0.5, 0.5].forEach((sx) => {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(0.86, 1.18, 0.09), glassMat);
        pane.position.set(sx, cy, 0.03);
        const sashH = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.11), mainMat);
        sashH.position.set(sx, cy + 0.06, 0.04);
        const sashV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.11), mainMat);
        sashV.position.set(sx, cy, 0.04);
        g.add(pane, sashH, sashV);
      });
      const centerPost = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.32, 0.12), mainMat);
      centerPost.position.set(0, cy, 0.04);
      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(2.3, 0.09, 0.22, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.72, 0.08);
      g.add(frame, centerPost, sill);
      break;
    }

    case 'window_curtain': {
      const cy = item.mountHeight ?? 1.78;
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#BFE9FA',
        emissive: '#FFE8A3',
        emissiveIntensity: 0.16,
        roughness: 0.16,
      });
      const frame = new THREE.Mesh(new RoundedBoxGeometry(2.04, 1.4, 0.08, 2, 0.03), mainMat);
      frame.position.set(0, cy, 0.02);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.18, 0.09), glassMat);
      glass.position.set(0, cy, 0.03);
      const barV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.11), mainMat);
      barV.position.set(0, cy, 0.04);
      const barH = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.06, 0.11), mainMat);
      barH.position.set(0, cy + 0.06, 0.04);

      const rod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 2.52, 8),
        clayMat('#7E5333', 0.62),
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set(0, cy + 0.82, 0.12);
      [-1.27, 1.27].forEach((fx) => {
        const finial = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 8, 8),
          glossyClayMat('#F4C95D', 0.25),
        );
        finial.position.set(fx, cy + 0.82, 0.12);
        g.add(finial);
      });

      const curtainMat = clayMat(item.accentColor || '#8ABEA2', 0.85);
      [-0.98, 0.98].forEach((cx) => {
        const drape = new THREE.Mesh(
          new RoundedBoxGeometry(0.42, 1.62, 0.14, 2, 0.05),
          curtainMat,
        );
        drape.position.set(cx, cy, 0.12);
        const tie = new THREE.Mesh(
          new RoundedBoxGeometry(0.44, 0.08, 0.16, 2, 0.02),
          clayMat('#FFF6E8', 0.72),
        );
        tie.position.set(cx, cy - 0.18, 0.13);
        g.add(drape, tie);
      });

      const sill = new THREE.Mesh(
        new RoundedBoxGeometry(2.18, 0.09, 0.22, 2, 0.03),
        clayMat('#FFF6E8', 0.68),
      );
      sill.position.set(0, cy - 0.71, 0.08);
      g.add(frame, glass, barV, barH, rod, sill);
      break;
    }

    case 'wall_clock': {
      const cy = item.mountHeight ?? 2.15;
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 18), mainMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(0, cy, 0.03);

      const face = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.09, 18),
        clayMat(item.accentColor || '#FFFDF6', 0.45),
      );
      face.rotation.x = Math.PI / 2;
      face.position.set(0, cy, 0.035);

      const handMat = clayMat('#4A3525', 0.5);
      const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.03), handMat);
      hourHand.position.set(0, cy + 0.07, 0.085);
      const minHand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.028, 0.03), handMat);
      minHand.position.set(0.08, cy, 0.09);
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        glossyClayMat('#F4C95D', 0.25),
      );
      pin.position.set(0, cy, 0.095);

      // 4 cardinal hour ticks
      [
        [0, 0.24],
        [0, -0.24],
        [0.24, 0],
        [-0.24, 0],
      ].forEach(([tx, ty]) => {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.02), handMat);
        tick.position.set(tx, cy + ty, 0.082);
        g.add(tick);
      });

      g.add(bezel, face, hourHand, minHand, pin);
      break;
    }

    case 'kitchen_l_counter': {
      const cabBodyMat = clayMat(item.color || '#F4EBDC', 0.72);
      const cabDoorMat = clayMat(item.accentColor || '#DFCEB4', 0.68);
      const marbleTopMat = glossyClayMat('#FAF8F5', 0.28);
      const metalMat = clayMat('#CFD8E0', 0.25, 0.72);
      const stoveGlassMat = glossyClayMat('#1E2532', 0.14);
      const handleGoldMat = glossyClayMat('#F4C95D', 0.25);

      // Back wing centered around local (-0.03, -1.69)
      const backBase = new THREE.Mesh(
        new RoundedBoxGeometry(3.55, 0.84, 1.0, 2, 0.04),
        cabBodyMat,
      );
      backBase.position.set(-0.03, 0.42, -1.69);
      const backTop = new THREE.Mesh(
        new RoundedBoxGeometry(3.62, 0.08, 1.08, 2, 0.03),
        marbleTopMat,
      );
      backTop.position.set(-0.03, 0.88, -1.69);

      // Right wing centered around local (+1.27, +0.95)
      const rightBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.0, 0.84, 4.28, 2, 0.04),
        cabBodyMat,
      );
      rightBase.position.set(1.27, 0.42, 0.95);
      const rightTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.08, 0.08, 4.36, 2, 0.03),
        marbleTopMat,
      );
      rightTop.position.set(1.27, 0.88, 0.95);

      [-1.35, -0.5, 0.35].forEach((cx) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.68, 0.66, 0.05, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(cx, 0.42, -1.17);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(cx + 0.22, 0.52, -1.13);
        g.add(dPanel, knob);
      });
      [-0.5, 0.4, 1.3, 2.2].forEach((cz) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.05, 0.66, 0.72, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(0.75, 0.42, cz);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(0.71, 0.52, cz + 0.24);
        g.add(dPanel, knob);
      });

      const sinkRim = new THREE.Mesh(
        new RoundedBoxGeometry(1.02, 0.04, 0.68, 2, 0.02),
        metalMat,
      );
      sinkRim.position.set(-0.9, 0.92, -1.69);
      const sinkBasin = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.05, 0.52),
        clayMat('#8D9AA6', 0.35, 0.5),
      );
      sinkBasin.position.set(-0.9, 0.925, -1.69);
      const faucetBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8),
        metalMat,
      );
      faucetBase.position.set(-0.9, 1.06, -2.01);
      const faucetNeck = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.025, 6, 10, Math.PI),
        metalMat,
      );
      faucetNeck.rotation.y = Math.PI / 2;
      faucetNeck.position.set(-0.9, 1.2, -1.9);

      const stoveBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.03, 1.25, 2, 0.02),
        stoveGlassMat,
      );
      stoveBase.position.set(1.27, 0.93, 0.4);
      [0.07, 0.73].forEach((bz) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.15, 0.19, 16),
          new THREE.MeshBasicMaterial({color: '#6BC5F2'}),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(1.27, 0.95, bz);
        g.add(ring);
      });

      g.add(
        backBase,
        backTop,
        rightBase,
        rightTop,
        sinkRim,
        sinkBasin,
        faucetBase,
        faucetNeck,
        stoveBase,
      );
      break;
    }

    case 'wooden_table': {
      const top = new THREE.Mesh(
        new RoundedBoxGeometry(1.52, 0.1, 0.94, 3, 0.04),
        mainMat,
      );
      top.position.y = 0.73;
      const apron = new THREE.Mesh(
        new RoundedBoxGeometry(1.36, 0.09, 0.78, 2, 0.02),
        accentMat,
      );
      apron.position.y = 0.65;
      [
        [-0.64, -0.35],
        [0.64, -0.35],
        [-0.64, 0.35],
        [0.64, 0.35],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new RoundedBoxGeometry(0.09, 0.72, 0.09, 2, 0.02),
          accentMat,
        );
        leg.position.set(lx, 0.36, lz);
        g.add(leg);
      });
      g.add(top, apron);
      break;
    }

    case 'wooden_chair': {
      const seat = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.08, 0.54, 2, 0.03),
        mainMat,
      );
      seat.position.y = 0.44;
      const cushion = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.04, 0.44, 2, 0.02),
        accentMat,
      );
      cushion.position.y = 0.49;
      [-0.22, 0.22].forEach((bx) => {
        const post = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.56, 0.06, 2, 0.02),
          mainMat,
        );
        post.position.set(bx, 0.72, -0.22);
        g.add(post);
      });
      const rail = new THREE.Mesh(
        new RoundedBoxGeometry(0.54, 0.14, 0.06, 2, 0.02),
        mainMat,
      );
      rail.position.set(0, 0.93, -0.22);
      const midRail = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.07, 0.04, 2, 0.01),
        mainMat,
      );
      midRail.position.set(0, 0.69, -0.22);
      [
        [-0.21, -0.2],
        [0.21, -0.2],
        [-0.21, 0.2],
        [0.21, 0.2],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.032, 0.026, 0.44, 7),
          mainMat,
        );
        leg.position.set(lx, 0.22, lz);
        g.add(leg);
      });
      g.add(seat, cushion, rail, midRail);
      break;
    }

    case 'table_tv': {
      const baseFoot = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.04, 0.24, 2, 0.02),
        clayMat('#4B5563', 0.45),
      );
      baseFoot.position.y = 0.02;
      const neck = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.14, 0.06),
        clayMat('#4B5563', 0.45),
      );
      neck.position.set(0, 0.1, -0.02);
      const bezel = new THREE.Mesh(
        new RoundedBoxGeometry(1.24, 0.72, 0.07, 2, 0.03),
        mainMat,
      );
      bezel.position.set(0, 0.48, -0.02);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.12, 0.62, 0.08),
        glossyClayMat(item.accentColor || '#8ED8F8', 0.14),
      );
      screen.position.set(0, 0.48, -0.015);
      g.add(baseFoot, neck, bezel, screen);
      break;
    }

    case 'plant_fiddle': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.42, 12), accentMat);
      pot.position.y = 0.21;
      const soil = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.04, 10),
        clayMat('#6B4429', 0.9),
      );
      soil.position.y = 0.41;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.045, 0.88, 7),
        clayMat('#7B5636', 0.8),
      );
      stem.position.y = 0.78;
      const leafSpecs: [number, number, number, number, number][] = [
        [0, 1.24, 0, 0.22, 0.2],
        [-0.22, 1.05, 0.14, 0.2, 0.65],
        [0.24, 1.1, -0.1, 0.2, -0.6],
        [-0.14, 0.84, -0.18, 0.17, 0.8],
        [0.16, 0.88, 0.2, 0.18, -0.75],
      ];
      leafSpecs.forEach(([lx, ly, lz, r, tilt], idx) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), mainMat);
        leaf.scale.set(1.25, 0.32, 0.88);
        leaf.position.set(lx, ly, lz);
        leaf.rotation.z = tilt;
        leaf.rotation.y = idx * 0.9;
        g.add(leaf);
      });
      g.add(pot, soil, stem);
      break;
    }

    case 'plant_snake': {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 12), accentMat);
      pot.position.y = 0.17;
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.215, 0.215, 0.05, 12),
        clayMat('#FAF5EC', 0.55),
      );
      rim.position.y = 0.33;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const h = 0.42 + (i % 3) * 0.14;
        const blade = new THREE.Mesh(
          new RoundedBoxGeometry(0.09, h, 0.025, 2, 0.01),
          i % 2 === 0 ? mainMat : clayMat('#87C875', 0.65),
        );
        blade.position.set(Math.cos(ang) * 0.07, 0.34 + h * 0.44, Math.sin(ang) * 0.07);
        blade.rotation.y = -ang;
        blade.rotation.z = 0.08;
        g.add(blade);
      }
      g.add(pot, rim);
      break;
    }

    case 'flower_basket': {
      const basket = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.17, 0.22, 12),
        accentMat,
      );
      basket.position.y = 0.11;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.028, 6, 14),
        clayMat('#A57544', 0.72),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.22;
      const archHandle = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.022, 6, 14, Math.PI),
        clayMat('#A57544', 0.72),
      );
      archHandle.position.y = 0.22;
      const foliage = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 7),
        clayMat('#66AE5E', 0.78),
      );
      foliage.scale.set(1.15, 0.65, 1.0);
      foliage.position.y = 0.25;
      const blossomCols = [item.color, '#FFD166', '#FFF8E8', '#F28482', '#C5A3E8'];
      [
        [-0.1, 0.34, 0.08],
        [0.1, 0.34, 0.07],
        [0, 0.37, -0.05],
        [-0.08, 0.32, -0.09],
        [0.09, 0.33, -0.08],
      ].forEach(([fx, fy, fz], idx) => {
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.068, 7, 7),
          clayMat(blossomCols[idx % blossomCols.length], 0.55),
        );
        fl.position.set(fx, fy, fz);
        g.add(fl);
      });
      g.add(basket, rim, archHandle, foliage);
      break;
    }

    case 'wall_calendar': {
      const cy = item.mountHeight ?? 2.05;
      const board = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.68, 0.04, 2, 0.02),
        mainMat,
      );
      board.position.set(0, cy, 0.02);
      const topBanner = new THREE.Mesh(
        new RoundedBoxGeometry(0.52, 0.16, 0.048, 2, 0.015),
        accentMat,
      );
      topBanner.position.set(0, cy + 0.22, 0.025);
      const ringBar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.44, 6),
        clayMat('#6F4E37', 0.55),
      );
      ringBar.rotation.z = Math.PI / 2;
      ringBar.position.set(0, cy + 0.33, 0.03);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          const cell = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.08, 0.015),
            clayMat(r === 1 && c === 2 ? '#F4A261' : '#EADBC8', 0.72),
          );
          cell.position.set(-0.165 + c * 0.11, cy + 0.04 - r * 0.11, 0.042);
          g.add(cell);
        }
      }
      g.add(board, topBanner, ringBar);
      break;
    }

    case 'succulent_shelf': {
      const cy = item.mountHeight ?? 1.98;
      const plank = new THREE.Mesh(
        new RoundedBoxGeometry(1.18, 0.07, 0.34, 2, 0.02),
        mainMat,
      );
      plank.position.set(0, cy, 0.17);
      [-0.42, 0.42].forEach((bx) => {
        const bracket = new THREE.Mesh(
          new RoundedBoxGeometry(0.06, 0.18, 0.24, 2, 0.01),
          clayMat('#7D5333', 0.65),
        );
        bracket.position.set(bx, cy - 0.11, 0.12);
        g.add(bracket);
      });
      const leafCols = [item.accentColor || '#76BA86', '#8FC99E', '#5EA374'];
      [-0.35, 0, 0.35].forEach((px, idx) => {
        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.09, 0.07, 0.13, 9),
          clayMat(idx === 1 ? '#FFF4E2' : '#D98C5F', 0.7),
        );
        pot.position.set(px, cy + 0.1, 0.18);
        const succ = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.095, 0),
          clayMat(leafCols[idx], 0.62),
        );
        succ.scale.set(1.1, 0.85, 1.1);
        succ.position.set(px, cy + 0.19, 0.18);
        g.add(pot, succ);
      });
      g.add(plank);
      break;
    }

    case 'wall_tv': {
      const cy = item.mountHeight ?? 1.85;
      const mount = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.28, 0.04),
        clayMat('#4A5568', 0.5),
      );
      mount.position.set(0, cy, 0.02);
      const bezel = new THREE.Mesh(
        new RoundedBoxGeometry(1.76, 0.98, 0.06, 2, 0.03),
        mainMat,
      );
      bezel.position.set(0, cy, 0.065);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(1.62, 0.86, 0.07),
        glossyClayMat(item.accentColor || '#91D7F7', 0.12),
      );
      screen.position.set(0, cy, 0.07);
      const soundbar = new THREE.Mesh(
        new RoundedBoxGeometry(1.16, 0.09, 0.09, 2, 0.02),
        clayMat('#3B4252', 0.45),
      );
      soundbar.position.set(0, cy - 0.58, 0.07);
      g.add(mount, bezel, screen, soundbar);
      break;
    }

    case 'floor_paint':
    case 'wall_paint': {
      const can = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.22, 0.44, 14),
        clayMat('#E8EDF2', 0.4, 0.35),
      );
      can.position.y = 0.22;
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.244, 0.236, 0.18, 14),
        clayMat(item.color, 0.55),
      );
      band.position.y = 0.22;
      const paintTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.21, 0.03, 14),
        glossyClayMat(item.color, 0.2),
      );
      paintTop.position.y = 0.43;
      const swatch = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.12, 0.04, 2, 0.015),
        clayMat(item.accentColor || item.color, 0.5),
      );
      swatch.position.set(0, 0.22, 0.235);
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.25, 0.018, 6, 12, Math.PI),
        clayMat('#9AA5B1', 0.35, 0.65),
      );
      handle.position.y = 0.34;
      handle.rotation.x = 0.42;
      // Brush or Roller stick distinguishing wall vs floor paint
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.36, 7),
        clayMat('#C58F5B', 0.7),
      );
      stick.position.set(0.08, 0.54, -0.02);
      stick.rotation.z = -0.35;
      const brushHead = new THREE.Mesh(
        item.kind === 'wall_paint'
          ? new THREE.CylinderGeometry(0.05, 0.05, 0.18, 10)
          : new RoundedBoxGeometry(0.12, 0.08, 0.04, 2, 0.01),
        clayMat(item.color, 0.6),
      );
      if (item.kind === 'wall_paint') {
        brushHead.rotation.z = Math.PI / 2;
      }
      brushHead.position.set(0.14, 0.68, -0.02);
      g.add(can, band, paintTop, swatch, handle, stick, brushHead);
      break;
    }
  }

  return g;
}
