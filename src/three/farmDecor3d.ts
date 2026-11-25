import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FarmDecorCatalogItem} from '../types/game';
import {clayMat, glossyClayMat} from './materials';

export interface BuiltFarmDecorMesh {
  group: THREE.Group;
  windmillBlades?: THREE.Object3D;
  lanternMat?: THREE.MeshStandardMaterial;
  hoverBees?: THREE.Object3D;
  floatingDuck?: THREE.Object3D;
}

export function buildFarmDecorMesh(
  item: FarmDecorCatalogItem,
  options?: {isNight?: boolean},
): BuiltFarmDecorMesh {
  const group = new THREE.Group();
  let windmillBlades: THREE.Object3D | undefined;
  let lanternMat: THREE.MeshStandardMaterial | undefined;
  let hoverBees: THREE.Object3D | undefined;
  let floatingDuck: THREE.Object3D | undefined;

  const isNight = Boolean(options?.isNight);

  switch (item.kind) {
    case 'farm_fence_white': {
      const postMat = clayMat('#F7F1E4', 0.72);
      const railMat = clayMat('#DFC7A5', 0.74);
      const topRail = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.08, 0.08, 2, 0.02), railMat);
      topRail.position.set(0, 0.5, 0);
      const botRail = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.08, 0.08, 2, 0.02), railMat);
      botRail.position.set(0, 0.22, 0);
      group.add(topRail, botRail);
      for (let i = -2; i <= 2; i++) {
        const px = i * 0.44;
        const slat = new THREE.Mesh(new RoundedBoxGeometry(0.15, 0.66, 0.09, 2, 0.025), postMat);
        slat.position.set(px, 0.33, 0);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 4), postMat);
        cap.rotation.y = Math.PI / 4;
        cap.position.set(px, 0.71, 0);
        group.add(slat, cap);
      }
      break;
    }

    case 'farm_fence_ranch': {
      const postMat = clayMat('#8D5B34', 0.8);
      const railMat = clayMat('#C48C59', 0.74);
      [-0.96, 0, 0.96].forEach((px) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.78, 0.14, 2, 0.03), postMat);
        post.position.set(px, 0.39, 0);
        group.add(post);
      });
      [0.3, 0.6].forEach((ry) => {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(2.16, 0.09, 0.075, 2, 0.02), railMat);
        rail.position.set(0, ry, 0);
        group.add(rail);
      });
      break;
    }

    case 'farm_signpost': {
      const woodDark = clayMat('#8A5831', 0.78);
      const boardCream = clayMat('#F7E8C9', 0.66);
      const boardGreen = clayMat('#72B066', 0.68);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.14, 8), clayMat('#9DA3A8', 0.85));
      base.position.y = 0.07;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 1.55, 8), woodDark);
      pole.position.y = 0.82;
      const arrow1 = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.22, 0.07, 2, 0.025), boardCream);
      arrow1.position.set(0.12, 1.38, 0.04);
      arrow1.rotation.z = 0.05;
      const tip1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 4), boardCream);
      tip1.rotation.z = -Math.PI / 2;
      tip1.position.set(0.49, 1.4, 0.04);
      const arrow2 = new THREE.Mesh(new RoundedBoxGeometry(0.58, 0.2, 0.07, 2, 0.025), boardGreen);
      arrow2.position.set(-0.1, 1.08, -0.04);
      arrow2.rotation.z = -0.06;
      const tip2 = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.16, 4), boardGreen);
      tip2.rotation.z = Math.PI / 2;
      tip2.position.set(-0.43, 1.1, -0.04);
      group.add(base, pole, arrow1, tip1, arrow2, tip2);
      break;
    }

    case 'farm_sunflower_barrel': {
      const barrelMat = clayMat('#9E663A', 0.76);
      const hoopMat = clayMat('#4C535A', 0.5, 0.55);
      const soilMat = clayMat('#654328', 0.92);
      const stemMat = clayMat('#529A49', 0.74);
      const petalMat = glossyClayMat('#F7C538', 0.34);
      const coreMat = clayMat('#5B371C', 0.84);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.31, 0.56, 12), barrelMat);
      barrel.position.y = 0.28;
      const hoop1 = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.022, 6, 16), hoopMat);
      hoop1.rotation.x = Math.PI / 2;
      hoop1.position.y = 0.45;
      const hoop2 = hoop1.clone();
      hoop2.position.y = 0.14;
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 10), soilMat);
      soil.position.y = 0.54;
      group.add(barrel, hoop1, hoop2, soil);

      const blooms: [number, number, number, number][] = [
        [0, 1.06, 0, 0.22],
        [-0.18, 0.88, 0.14, 0.16],
        [0.19, 0.9, -0.1, 0.17],
      ];
      blooms.forEach(([fx, fy, fz, rad]) => {
        const stem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.022, 0.028, fy - 0.5, 6),
          stemMat,
        );
        stem.position.set(fx * 0.65, 0.5 + (fy - 0.5) * 0.5, fz * 0.65);
        const petals = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.9, 0.055, 12), petalMat);
        petals.rotation.x = Math.PI * 0.36;
        petals.position.set(fx, fy, fz);
        const core = new THREE.Mesh(new THREE.SphereGeometry(rad * 0.55, 8, 7), coreMat);
        core.position.set(fx, fy + 0.015, fz + 0.03);
        group.add(stem, petals, core);
      });
      break;
    }

    case 'farm_hay_bale': {
      const hayMat = clayMat('#E5B94C', 0.88);
      const bandMat = clayMat('#AD722B', 0.78);
      const specs: [number, number, number, number][] = [
        [-0.32, 0.28, 0.14, 0.1],
        [0.32, 0.28, -0.08, -0.18],
        [0.02, 0.74, 0.02, 0.45],
      ];
      specs.forEach(([hx, hy, hz, ry]) => {
        const bale = new THREE.Group();
        bale.position.set(hx, hy, hz);
        bale.rotation.y = ry;
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.68, 12), hayMat);
        roll.rotation.z = Math.PI / 2;
        const bandL = new THREE.Mesh(new THREE.TorusGeometry(0.282, 0.018, 6, 14), bandMat);
        bandL.rotation.y = Math.PI / 2;
        bandL.position.x = -0.16;
        const bandR = bandL.clone();
        bandR.position.x = 0.16;
        bale.add(roll, bandL, bandR);
        group.add(bale);
      });
      break;
    }

    case 'farm_flower_cart': {
      const woodMat = clayMat('#C6884F', 0.72);
      const woodDark = clayMat('#7D4F2B', 0.78);
      const soilMat = clayMat('#5E3E26', 0.9);
      const leafMat = clayMat('#5CAD59', 0.72);
      const wheelMat = clayMat('#4C535B', 0.65);

      const bed = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.28, 0.66, 2, 0.04), woodMat);
      bed.position.set(-0.04, 0.36, 0);
      const soil = new THREE.Mesh(new RoundedBoxGeometry(0.84, 0.08, 0.56, 2, 0.02), soilMat);
      soil.position.set(-0.04, 0.48, 0);
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(0.46, 0.21, 0);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), woodDark);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(0.46, 0.21, 0);
      [-0.22, 0.22].forEach((sz) => {
        const leg = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.26, 0.08, 1, 0.02), woodDark);
        leg.position.set(-0.36, 0.13, sz);
        const handle = new THREE.Mesh(new RoundedBoxGeometry(0.48, 0.055, 0.055, 1, 0.02), woodDark);
        handle.position.set(-0.62, 0.42, sz);
        handle.rotation.z = 0.18;
        group.add(leg, handle);
      });
      group.add(bed, soil, wheel, hub);

      const palette = ['#F595B4', '#FFD966', '#FFA97A', '#D6B4FC'];
      for (let i = 0; i < 6; i++) {
        const fx = -0.3 + (i % 3) * 0.26;
        const fz = i < 3 ? -0.14 : 0.14;
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 7), leafMat);
        bush.position.set(fx, 0.56, fz);
        const fl = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 7, 6),
          glossyClayMat(palette[i % palette.length], 0.35),
        );
        fl.position.set(fx, 0.67, fz);
        group.add(bush, fl);
      }
      break;
    }

    case 'farm_scarecrow': {
      const poleMat = clayMat('#7D512D', 0.8);
      const shirtMat = clayMat('#4E82B4', 0.76);
      const hayMat = clayMat('#E7BD53', 0.86);
      const headMat = clayMat('#F4D9B0', 0.82);
      const hatMat = clayMat('#C68C45', 0.84);
      const ribbonMat = clayMat('#D95D4E', 0.65);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 1.65, 8), poleMat);
      post.position.y = 0.82;
      const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.12, 7), poleMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.y = 1.18;
      const torso = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.56, 0.24, 2, 0.06), shirtMat);
      torso.position.y = 1.12;
      const sleeveL = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.16, 0.16, 2, 0.04), shirtMat);
      sleeveL.position.set(-0.34, 1.2, 0);
      const sleeveR = sleeveL.clone();
      sleeveR.position.x = 0.34;
      [-0.54, 0.54].forEach((hx) => {
        const strawHand = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.18, 6), hayMat);
        strawHand.rotation.z = hx < 0 ? Math.PI / 2 : -Math.PI / 2;
        strawHand.position.set(hx, 1.2, 0);
        group.add(strawHand);
      });
      const strawSkirt = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.34, 8), hayMat);
      strawSkirt.position.y = 0.72;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 9), headMat);
      head.position.y = 1.56;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.04, 12), hatMat);
      brim.position.y = 1.7;
      const hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.3, 10), hatMat);
      hatTop.position.y = 1.85;
      const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.22, 0.055, 10), ribbonMat);
      hatBand.position.y = 1.74;
      group.add(post, crossbar, torso, sleeveL, sleeveR, strawSkirt, head, brim, hatTop, hatBand);
      break;
    }

    case 'farm_lantern_post': {
      const ironMat = clayMat('#444E58', 0.48, 0.45);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.18, 10), ironMat);
      base.position.y = 0.09;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 1.92, 8), ironMat);
      pole.position.y = 1.05;
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.055, 0.055, 1, 0.015), ironMat);
      arm.position.set(0.14, 1.98, 0);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.14, 6), ironMat);
      cap.position.set(0.28, 1.88, 0);
      lanternMat = new THREE.MeshStandardMaterial({
        color: '#FFF6D1',
        emissive: '#FFC954',
        emissiveIntensity: isNight ? 1.85 : 0.25,
        roughness: 0.22,
      });
      const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.2, 6), lanternMat);
      bulb.position.set(0.28, 1.74, 0);
      group.add(base, pole, arm, cap, bulb);
      break;
    }

    case 'farm_picnic_blanket': {
      const matRed = clayMat('#E66C64', 0.85);
      const matCream = clayMat('#FFF8EC', 0.82);
      const cloth = new THREE.Mesh(new RoundedBoxGeometry(1.96, 0.035, 1.56, 2, 0.015), matRed);
      cloth.position.y = 0.018;
      group.add(cloth);
      for (let ix = -1; ix <= 1; ix += 2) {
        for (let iz = -1; iz <= 1; iz += 2) {
          const sq = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.04, 0.36, 1, 0.008), matCream);
          sq.position.set(ix * 0.45, 0.02, iz * 0.36);
          group.add(sq);
        }
      }
      // Cute wicker picnic basket + apples on corner
      const wicker = clayMat('#C99352', 0.8);
      const basket = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.24, 0.3, 2, 0.04), wicker);
      basket.position.set(-0.55, 0.14, -0.35);
      const appleMat = glossyClayMat('#E04D4D', 0.3);
      const a1 = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 7), appleMat);
      a1.position.set(0.22, 0.09, 0.15);
      const a2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 7), glossyClayMat('#F4C444', 0.32));
      a2.position.set(0.35, 0.085, 0.08);
      group.add(basket, a1, a2);
      break;
    }

    case 'farm_garden_bench': {
      const woodMat = clayMat('#BD834F', 0.72);
      const legMat = clayMat('#464E56', 0.55, 0.35);
      const seat = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.085, 0.52, 2, 0.025), woodMat);
      seat.position.set(0, 0.44, 0);
      const back = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.38, 0.08, 2, 0.025), woodMat);
      back.position.set(0, 0.74, -0.22);
      back.rotation.x = -0.14;
      group.add(seat, back);
      [-0.62, 0.62].forEach((lx) => {
        [-0.16, 0.16].forEach((lz) => {
          const leg = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.42, 0.08, 1, 0.015), legMat);
          leg.position.set(lx, 0.21, lz);
          group.add(leg);
        });
        const arm = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.07, 0.48, 2, 0.02), legMat);
        arm.position.set(lx, 0.62, 0.02);
        group.add(arm);
      });
      break;
    }

    case 'farm_birdbath_fountain': {
      const stoneMat = clayMat('#E2DDD2', 0.78);
      const waterMat = glossyClayMat('#78CEE8', 0.2);
      const birdMat = glossyClayMat('#F5C853', 0.35);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.18, 12), stoneMat);
      base.position.y = 0.09;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.58, 12), stoneMat);
      col.position.y = 0.46;
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.28, 0.18, 16), stoneMat);
      basin.position.y = 0.8;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16), waterMat);
      water.position.y = 0.89;
      const bird = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 7), birdMat);
      bird.scale.set(0.9, 0.85, 1.25);
      bird.position.set(0.39, 0.96, 0.12);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 5), clayMat('#F28B30', 0.5));
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0.39, 0.97, 0.22);
      group.add(base, col, basin, water, bird, beak);
      break;
    }

    case 'farm_floral_arch': {
      const woodCream = clayMat('#F4EDE1', 0.72);
      const vineMat = clayMat('#5BA657', 0.74);
      const roseMat = glossyClayMat('#F48AA8', 0.34);
      const roseAlt = glossyClayMat('#FFD670', 0.36);

      [-1.02, 1.02].forEach((px) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.05, 0.14, 2, 0.03), woodCream);
        post.position.set(px, 1.02, 0);
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), vineMat);
        bush.position.set(px, 0.26, 0);
        group.add(post, bush);
      });
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.02, 0.075, 8, 20, Math.PI),
        woodCream,
      );
      arch.position.set(0, 2.02, 0);
      group.add(arch);

      for (let i = 0; i <= 8; i++) {
        const th = (i / 8) * Math.PI;
        const rx = Math.cos(th) * 1.04;
        const ry = 2.04 + Math.sin(th) * 1.04;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), vineMat);
        leaf.position.set(rx, ry, 0.05);
        const rose = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 7, 6),
          i % 2 === 0 ? roseMat : roseAlt,
        );
        rose.position.set(rx, ry + 0.06, 0.12);
        group.add(leaf, rose);
      }
      break;
    }

    case 'farm_stone_well': {
      const stoneMat = clayMat('#9DA5AC', 0.84);
      const roofMat = clayMat('#C9664F', 0.72);
      const woodMat = clayMat('#875631', 0.78);
      const waterMat = glossyClayMat('#5EB8DB', 0.22);

      const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.68, 0.68, 12), stoneMat);
      wall.position.y = 0.34;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 8, 14), clayMat('#C8C3B8', 0.8));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.68;
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.06, 12), waterMat);
      water.position.y = 0.52;
      [-0.56, 0.56].forEach((px) => {
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.11, 1.32, 0.11, 2, 0.02), woodMat);
        post.position.set(px, 1.24, 0);
        group.add(post);
      });
      const roofL = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.09, 0.78, 2, 0.02), roofMat);
      roofL.position.set(0, 2.02, -0.28);
      roofL.rotation.x = -0.52;
      const roofR = roofL.clone();
      roofR.position.z = 0.28;
      roofR.rotation.x = 0.52;
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.2, 8), woodMat);
      bucket.position.set(0, 1.15, 0);
      group.add(wall, rim, water, roofL, roofR, bucket);
      break;
    }

    case 'farm_mini_windmill': {
      const towerMat = clayMat('#F5EAD7', 0.74);
      const roofMat = clayMat('#D96452', 0.68);
      const trimMat = clayMat('#8E5B35', 0.76);
      const sailMat = clayMat('#FFF8EC', 0.62);

      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.84, 0.22, 10), clayMat('#9DA5AC', 0.82));
      plinth.position.y = 0.11;
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.68, 1.85, 10), towerMat);
      tower.position.y = 1.14;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.62, 10), roofMat);
      roof.position.y = 2.34;
      const door = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.54, 0.12, 2, 0.03), trimMat);
      door.position.set(0, 0.49, 0.61);

      const hub = new THREE.Group();
      hub.position.set(0, 1.88, 0.55);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), trimMat);
      hub.add(cap);
      for (let b = 0; b < 4; b++) {
        const ang = (b * Math.PI) / 2;
        const armGrp = new THREE.Group();
        armGrp.rotation.z = ang;
        const spar = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.94, 0.04, 1, 0.01), trimMat);
        spar.position.y = 0.47;
        const sail = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.72, 0.025, 1, 0.01), sailMat);
        sail.position.set(0.13, 0.56, 0.01);
        armGrp.add(spar, sail);
        hub.add(armGrp);
      }
      windmillBlades = hub;
      group.add(plinth, tower, roof, door, hub);
      break;
    }

    case 'farm_wooden_pergola': {
      const woodMat = clayMat(item.color || '#B87E4B', 0.72);
      const vineMat = clayMat('#5AA658', 0.76);
      const wisteriaMat = glossyClayMat(item.accentColor || '#A67CE2', 0.4);
      const wisteriaLight = glossyClayMat('#D6B8FA', 0.44);

      [-1.08, 1.08].forEach((px) => {
        [-0.5, 0.5].forEach((pz) => {
          const post = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.24, 0.14, 2, 0.02), woodMat);
          post.position.set(px, 1.12, pz);
          const plinth = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.16, 0.22, 1, 0.02), clayMat('#9DA5AC', 0.85));
          plinth.position.set(px, 0.08, pz);
          group.add(post, plinth);
        });
        const sideBeam = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.14, 1.42, 2, 0.02), woodMat);
        sideBeam.position.set(px, 2.26, 0);
        group.add(sideBeam);
      });
      for (let i = -3; i <= 3; i++) {
        const rafter = new THREE.Mesh(new RoundedBoxGeometry(2.56, 0.11, 0.1, 1, 0.02), woodMat);
        rafter.position.set(0, 2.38, i * 0.21);
        group.add(rafter);
      }
      // Lush green canopy & hanging purple wisteria clusters
      for (let i = -3; i <= 3; i++) {
        const bx = i * 0.34;
        const bz = (i % 2 === 0 ? 1 : -1) * 0.22;
        const leafCap = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), vineMat);
        leafCap.scale.set(1.3, 0.55, 1.2);
        leafCap.position.set(bx, 2.48, bz);
        group.add(leafCap);
        const cluster = new THREE.Mesh(
          new THREE.ConeGeometry(0.085, 0.34, 7),
          i % 2 === 0 ? wisteriaMat : wisteriaLight,
        );
        cluster.rotation.x = Math.PI;
        cluster.position.set(bx, 2.16, bz * 1.4);
        group.add(cluster);
      }
      break;
    }

    case 'farm_pumpkin_patch': {
      const soilMat = clayMat('#654328', 0.92);
      const vineMat = clayMat(item.accentColor || '#5B9A4A', 0.76);
      const pumOrange = glossyClayMat(item.color || '#EB7D34', 0.36);
      const pumGold = glossyClayMat('#F4B844', 0.38);
      const stemMat = clayMat('#526E32', 0.8);

      const soilBed = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.09, 1.12, 2, 0.03), soilMat);
      soilBed.position.y = 0.045;
      group.add(soilBed);

      const addPumpkin = (px: number, pz: number, r: number, mat: THREE.Material) => {
        const pg = new THREE.Group();
        pg.position.set(px, 0.08 + r * 0.72, pz);
        for (let lobe = 0; lobe < 3; lobe++) {
          const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 9), mat);
          seg.scale.set(1.18, 0.78, 0.72);
          seg.rotation.y = (lobe * Math.PI) / 3;
          pg.add(seg);
        }
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.22, r * 0.55, 6), stemMat);
        stalk.position.y = r * 0.85;
        stalk.rotation.z = 0.18;
        pg.add(stalk);
        group.add(pg);
      };

      addPumpkin(-0.32, 0.08, 0.26, pumOrange);
      addPumpkin(0.28, -0.1, 0.22, pumGold);
      addPumpkin(0.14, 0.28, 0.17, pumOrange);

      [
        [-0.45, -0.25],
        [0.44, 0.24],
        [-0.05, -0.32],
      ].forEach(([lx, lz]) => {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 6), vineMat);
        leaf.scale.set(1.2, 0.4, 1.1);
        leaf.position.set(lx, 0.12, lz);
        group.add(leaf);
      });
      break;
    }

    case 'farm_beehive_stand': {
      const standMat = clayMat(item.accentColor || '#9E683B', 0.78);
      const hiveMat = clayMat(item.color || '#F2C14E', 0.62);
      const roofMat = clayMat('#B85D3B', 0.72);
      const darkSlot = clayMat('#3B281B', 0.9);

      // Stand legs + shelf
      [-0.2, 0.2].forEach((lx) => {
        [-0.16, 0.16].forEach((lz) => {
          const leg = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.42, 0.06, 1, 0.01), standMat);
          leg.position.set(lx, 0.21, lz);
          group.add(leg);
        });
      });
      const platform = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.05, 0.52, 2, 0.012), standMat);
      platform.position.y = 0.44;

      // 3 stacked bee box tiers + pitched overhang roof
      for (let t = 0; t < 3; t++) {
        const tier = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.16, 0.4, 2, 0.016), hiveMat);
        tier.position.set(0, 0.55 + t * 0.17, 0);
        group.add(tier);
      }
      const entry = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.03), darkSlot);
      entry.position.set(0, 0.5, 0.205);
      const roofL = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.045, 0.48, 1, 0.01), roofMat);
      roofL.position.set(-0.13, 1.07, 0);
      roofL.rotation.z = 0.38;
      const roofR = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.045, 0.48, 1, 0.01), roofMat);
      roofR.position.set(0.13, 1.07, 0);
      roofR.rotation.z = -0.38;

      // Orbiting cute bees group (animated in subzonesBuilder)
      const beeOrbit = new THREE.Group();
      beeOrbit.position.y = 0.88;
      const beeBodyMat = glossyClayMat('#FFD13B', 0.35);
      const wingMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        transparent: true,
        opacity: 0.78,
        roughness: 0.25,
      });
      for (let b = 0; b < 3; b++) {
        const ang = (b * Math.PI * 2) / 3;
        const bee = new THREE.Group();
        bee.position.set(Math.cos(ang) * 0.38, (b - 1) * 0.12, Math.sin(ang) * 0.38);
        bee.rotation.y = -ang;
        const body = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 7), beeBodyMat);
        body.scale.set(0.85, 0.85, 1.35);
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.039, 0.032, 8), darkSlot);
        stripe.rotation.x = Math.PI / 2;
        const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), wingMat);
        wingL.scale.set(1.2, 0.25, 0.7);
        wingL.position.set(-0.032, 0.036, 0);
        const wingR = wingL.clone();
        wingR.position.x = 0.032;
        bee.add(body, stripe, wingL, wingR);
        beeOrbit.add(bee);
      }
      hoverBees = beeOrbit;
      group.add(platform, entry, roofL, roofR, beeOrbit);
      break;
    }

    case 'farm_watering_trough': {
      const woodMat = clayMat(item.color || '#9C683E', 0.78);
      const hoopMat = clayMat('#4C535A', 0.55);
      const waterMat = glossyClayMat(item.accentColor || '#69C2E3', 0.18);
      const pumpMat = clayMat('#B84A3E', 0.6);

      // Wooden trough body + water surface
      const base = new THREE.Mesh(new RoundedBoxGeometry(1.06, 0.36, 0.54, 2, 0.03), woodMat);
      base.position.set(-0.06, 0.22, 0);
      const water = new THREE.Mesh(new RoundedBoxGeometry(0.94, 0.05, 0.42, 1, 0.01), waterMat);
      water.position.set(-0.06, 0.39, 0);
      [-0.35, 0.23].forEach((bx) => {
        const band = new THREE.Mesh(new RoundedBoxGeometry(0.045, 0.38, 0.56, 1, 0.01), hoopMat);
        band.position.set(bx, 0.22, 0);
        group.add(band);
      });
      // Cast-iron hand pump on right end
      const pumpCol = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.64, 10), pumpMat);
      pumpCol.position.set(0.46, 0.32, 0);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.2, 8), pumpMat);
      spout.rotation.z = Math.PI * 0.36;
      spout.position.set(0.35, 0.52, 0);
      const lever = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.035, 0.035, 1, 0.01), hoopMat);
      lever.position.set(0.56, 0.58, 0);
      lever.rotation.z = -0.32;

      group.add(base, water, pumpCol, spout, lever);
      break;
    }

    case 'farm_duck_pond_mini': {
      const stoneMat = clayMat('#9AA3AB', 0.84);
      const stoneAlt = clayMat('#B8B2A6', 0.84);
      const waterMat = glossyClayMat(item.color || '#73C8E8', 0.16);
      const padMat = clayMat('#5AA658', 0.72);
      const lotusMat = glossyClayMat('#F7A1B8', 0.35);

      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.9, 0.1, 18), waterMat);
      basin.scale.set(1.06, 1, 0.9);
      basin.position.y = 0.06;
      group.add(basin);

      // Ring of smooth river pebbles around rim
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const pebble = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.035, 0),
          i % 2 === 0 ? stoneMat : stoneAlt,
        );
        pebble.scale.set(1.2, 0.68, 1.05);
        pebble.position.set(Math.cos(a) * 0.88, 0.11, Math.sin(a) * 0.76);
        pebble.rotation.y = a;
        group.add(pebble);
      }

      // 2 lily pads + pink lotus bloom
      [
        [-0.36, -0.22, 0.2],
        [0.38, 0.25, 0.16],
      ].forEach(([px, pz, rad], idx) => {
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.025, 12), padMat);
        pad.position.set(px, 0.12, pz);
        group.add(pad);
        if (idx === 0) {
          const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 7), lotusMat);
          lotus.scale.set(1, 0.65, 1);
          lotus.position.set(px, 0.16, pz);
          group.add(lotus);
        }
      });

      // Cute floating yellow rubber/farm duck (animated bobbing)
      const duckGrp = new THREE.Group();
      duckGrp.position.set(0.12, 0.14, -0.05);
      const duckMat = glossyClayMat(item.accentColor || '#F7D252', 0.32);
      const dBody = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 9), duckMat);
      dBody.scale.set(1.0, 0.85, 1.32);
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 9), duckMat);
      dHead.position.set(0, 0.12, 0.11);
      const dBill = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.075, 6), clayMat('#F28B30', 0.45));
      dBill.rotation.x = Math.PI / 2;
      dBill.position.set(0, 0.105, 0.21);
      duckGrp.add(dBody, dHead, dBill);
      floatingDuck = duckGrp;
      group.add(duckGrp);
      break;
    }

    case 'farm_mailbox_cute': {
      const postMat = clayMat(item.accentColor || '#F6E7CE', 0.72);
      const boxMat = glossyClayMat(item.color || '#E05B5B', 0.32);
      const flagMat = glossyClayMat('#F5C44E', 0.35);

      const post = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.96, 0.11, 2, 0.02), postMat);
      post.position.y = 0.48;
      const brace = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.07, 0.38, 1, 0.015), postMat);
      brace.position.y = 0.96;

      const boxBot = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.16, 0.42, 2, 0.02), boxMat);
      boxBot.position.y = 1.07;
      const boxArch = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.42, 14), boxMat);
      boxArch.rotation.x = Math.PI / 2;
      boxArch.position.y = 1.15;

      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), clayMat('#FFF8F0', 0.6));
      slot.position.set(0, 1.1, 0.215);
      const flagStem = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.16, 0.02, 1, 0.005), flagMat);
      flagStem.position.set(0.135, 1.16, 0.05);
      const flagTip = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.05, 0.08, 1, 0.005), flagMat);
      flagTip.position.set(0.135, 1.22, 0.09);

      // Tiny flower tuft at base
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 7, 6), clayMat('#64A85E', 0.76));
      tuft.position.set(0.1, 0.08, 0.08);
      group.add(post, brace, boxBot, boxArch, slot, flagStem, flagTip, tuft);
      break;
    }

    case 'farm_hammock_stand': {
      const woodMat = clayMat('#9E6B40', 0.76);
      const slingMat = clayMat(item.color || '#F48A78', 0.8);
      const stripeMat = clayMat(item.accentColor || '#FFF5E4', 0.82);

      const beam = new THREE.Mesh(new RoundedBoxGeometry(1.78, 0.1, 0.1, 2, 0.02), woodMat);
      beam.position.y = 0.14;
      [-0.88, 0.88].forEach((sx) => {
        const legBase = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.1, 0.72, 2, 0.02), woodMat);
        legBase.position.set(sx, 0.06, 0);
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.92, 0.09, 2, 0.02), woodMat);
        post.position.set(sx * 1.06, 0.54, 0);
        post.rotation.z = sx < 0 ? 0.34 : -0.34;
        group.add(legBase, post);
      });

      // Gently curved fabric hammock sling + pillow
      for (let i = -3; i <= 3; i++) {
        const t = i / 3;
        const hx = t * 0.74;
        const hy = 0.44 + t * t * 0.32;
        const seg = new THREE.Mesh(
          new RoundedBoxGeometry(0.28, 0.045, 0.58, 2, 0.015),
          i % 2 === 0 ? slingMat : stripeMat,
        );
        seg.position.set(hx, hy, 0);
        seg.rotation.z = t * 0.42;
        group.add(seg);
      }
      const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.11, 0.36, 2, 0.04), stripeMat);
      pillow.position.set(-0.46, 0.58, 0);
      pillow.rotation.z = -0.24;
      group.add(beam, pillow);
      break;
    }

    case 'farm_tractor_decor': {
      const redMat = glossyClayMat(item.color || '#D94B43', 0.28);
      const darkMat = clayMat(item.accentColor || '#3E464E', 0.7);
      const rimMat = glossyClayMat('#F4CE62', 0.32);
      const glassMat = new THREE.MeshStandardMaterial({
        color: '#BCE3F5',
        roughness: 0.15,
        transparent: true,
        opacity: 0.65,
      });

      const chassis = new THREE.Mesh(new RoundedBoxGeometry(1.42, 0.18, 0.64, 2, 0.03), darkMat);
      chassis.position.y = 0.32;
      const hood = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.44, 0.58, 2, 0.06), redMat);
      hood.position.set(0.32, 0.62, 0);
      const cab = new THREE.Mesh(new RoundedBoxGeometry(0.68, 0.74, 0.72, 2, 0.05), redMat);
      cab.position.set(-0.34, 0.84, 0);
      const windshield = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.36, 0.66, 1, 0.02), glassMat);
      windshield.position.set(-0.32, 0.94, 0);
      const roof = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.08, 0.8, 2, 0.02), redMat);
      roof.position.set(-0.34, 1.24, 0);

      // Exhaust pipe + headlights
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.44, 8), darkMat);
      exhaust.position.set(0.46, 1.0, -0.18);
      [-0.18, 0.18].forEach((lz) => {
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), clayMat('#FFF5B8', 0.3));
        lamp.rotation.z = Math.PI / 2;
        lamp.position.set(0.71, 0.64, lz);
        group.add(lamp);
      });

      // Big rear tractor wheels & smaller front steering wheels
      [-0.44, 0.44].forEach((wz) => {
        const rearTire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.2, 16), darkMat);
        rearTire.rotation.x = Math.PI / 2;
        rearTire.position.set(-0.34, 0.38, wz);
        const rearRim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 12), rimMat);
        rearRim.rotation.x = Math.PI / 2;
        rearRim.position.set(-0.34, 0.38, wz);

        const frontTire = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 14), darkMat);
        frontTire.rotation.x = Math.PI / 2;
        frontTire.position.set(0.52, 0.22, wz * 0.88);
        const frontRim = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 10), rimMat);
        frontRim.rotation.x = Math.PI / 2;
        frontRim.position.set(0.52, 0.22, wz * 0.88);
        group.add(rearTire, rearRim, frontTire, frontRim);
      });

      group.add(chassis, hood, cab, windshield, roof, exhaust);
      break;
    }
  }

  return {group, windmillBlades, lanternMat, hoverBees, floatingDuck};
}
