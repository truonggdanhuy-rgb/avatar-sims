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
  }

  return g;
}
