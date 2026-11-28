import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {ALL_FISH_CATALOG} from '../data/fishingCatalog';
import {getDollByHandheld} from '../data/hddollCatalog';
import {INSECT_CATALOG} from '../data/insectCatalog';
import {
  FishSpeciesId,
  FurnitureCatalogItem,
  FurnitureDisplayItem,
  HandheldStyle,
  InsectSpeciesId,
} from '../types/game';
import {buildDollPlushModel, DollPlushRig, updateDollPlushAnimation} from './dollPlush3d';
import {createInsectMeshForSpecies} from './insects3d';
import {clayMat, glossyClayMat} from './materials';

export interface DisplayFurnitureController {
  kind: 'doll_display' | 'aquarium_display' | 'insect_display';
  dolls: Array<{
    rig: DollPlushRig;
    baseY: number;
    phase: number;
  }>;
  fishes: Array<{
    root: THREE.Group;
    tail?: THREE.Object3D;
    swimMode: 'fish' | 'jelly' | 'crawl' | 'clam';
    centerX: number;
    centerY: number;
    centerZ: number;
    radiusX: number;
    radiusZ: number;
    bobAmp: number;
    speed: number;
    phase: number;
  }>;
  bubbles: Array<{
    mesh: THREE.Mesh;
    baseX: number;
    baseZ: number;
    minY: number;
    riseH: number;
    speed: number;
    phase: number;
  }>;
  insects: Array<{
    root: THREE.Group;
    leftWing?: THREE.Object3D;
    rightWing?: THREE.Object3D;
    isFlying: boolean;
    wingSpeed: number;
    baseX: number;
    baseY: number;
    baseZ: number;
    orbitRx: number;
    orbitRz: number;
    phase: number;
  }>;
  seaweeds: Array<{
    mesh: THREE.Object3D;
    baseRotZ: number;
    phase: number;
  }>;
}

interface SlotCoord {
  x: number;
  y: number;
  z: number;
}

export function buildDisplayFurnitureMesh(cat: FurnitureCatalogItem): THREE.Group {
  const g = new THREE.Group();

  const oakMat = clayMat('#E8C7A2', 0.68);
  const darkOakMat = clayMat('#8D603D', 0.7);
  const creamMat = clayMat('#FFF8EE', 0.65);
  const pastelPinkMat = clayMat('#F9A8D4', 0.56);
  const velvetPadMat = clayMat('#FDE7F3', 0.8);
  const goldTrimMat = glossyClayMat('#F5C451', 0.28);
  const ledStripMat = new THREE.MeshStandardMaterial({
    color: '#FFFBEB',
    emissive: '#FDE68A',
    emissiveIntensity: 0.75,
    roughness: 0.25,
  });

  if (cat.kind === 'doll_shelf_small' || cat.kind === 'doll_shelf_large') {
    const isLarge = cat.kind === 'doll_shelf_large';
    const w = isLarge ? 1.82 : 1.06;
    const d = isLarge ? 0.46 : 0.42;
    const h = isLarge ? 1.56 : 1.08;

    // Base plinth + feet
    const basePlinth = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.14, d, 3, 0.03),
      darkOakMat,
    );
    basePlinth.position.y = 0.07;
    g.add(basePlinth);

    // Side pillars
    [-1, 1].forEach((s) => {
      const side = new THREE.Mesh(
        new RoundedBoxGeometry(0.07, h - 0.1, d - 0.03, 2, 0.02),
        oakMat,
      );
      side.position.set(s * (w / 2 - 0.035), 0.1 + (h - 0.1) / 2, 0);
      g.add(side);
    });

    // Back panel + soft pastel backdrop
    const backWood = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.06, h - 0.12, 0.04, 2, 0.015),
      creamMat,
    );
    backWood.position.set(0, 0.1 + (h - 0.12) / 2, -d / 2 + 0.03);
    const backAccent = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.18, h - 0.26, 0.02, 2, 0.01),
      clayMat(isLarge ? '#FCE7F3' : '#FDF2F8', 0.85),
    );
    backAccent.position.set(0, 0.12 + (h - 0.26) / 2, -d / 2 + 0.055);
    g.add(backWood, backAccent);

    // Crown top arch
    const topShelf = new THREE.Mesh(
      new RoundedBoxGeometry(w + 0.06, 0.08, d + 0.04, 3, 0.025),
      oakMat,
    );
    topShelf.position.y = h + 0.03;
    const archTrim = new THREE.Mesh(
      new RoundedBoxGeometry(w * 0.62, 0.12, 0.05, 3, 0.03),
      pastelPinkMat,
    );
    archTrim.position.set(0, h + 0.1, 0);
    const heartGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), goldTrimMat);
    heartGem.position.set(0, h + 0.11, 0.04);
    g.add(topShelf, archTrim, heartGem);

    const slotCoords: SlotCoord[] = [];
    if (!isLarge) {
      // Single cozy mid-tier gallery shelf (2 slots side by side)
      const deckY = 0.44;
      const deck = new THREE.Mesh(
        new RoundedBoxGeometry(w - 0.08, 0.06, d - 0.04, 2, 0.02),
        creamMat,
      );
      deck.position.set(0, deckY, 0.01);
      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(w - 0.24, 0.02, 0.025), ledStripMat);
      ledBar.position.set(0, h - 0.04, -0.02);
      g.add(deck, ledBar);

      [-0.26, 0.26].forEach((sx) => {
        const pad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.18, 0.03, 18),
          velvetPadMat,
        );
        pad.position.set(sx, deckY + 0.045, 0.02);
        const padRim = new THREE.Mesh(
          new THREE.TorusGeometry(0.165, 0.012, 8, 20),
          pastelPinkMat,
        );
        padRim.rotation.x = Math.PI / 2;
        padRim.position.set(sx, deckY + 0.058, 0.02);
        g.add(pad, padRim);
        slotCoords.push({x: sx, y: deckY + 0.06, z: 0.02});
      });
    } else {
      // 2-tier grand display shelf (4 slots: 2 lower + 2 upper)
      const tiers = [0.22, 0.90];
      tiers.forEach((tierY, tIdx) => {
        const deck = new THREE.Mesh(
          new RoundedBoxGeometry(w - 0.08, 0.06, d - 0.04, 2, 0.02),
          creamMat,
        );
        deck.position.set(0, tierY, 0.01);
        const ledBar = new THREE.Mesh(
          new THREE.BoxGeometry(w - 0.24, 0.022, 0.025),
          ledStripMat,
        );
        ledBar.position.set(0, tIdx === 0 ? 0.85 : h - 0.04, -0.02);
        g.add(deck, ledBar);

        [-0.44, 0.44].forEach((sx) => {
          const pad = new THREE.Mesh(
            new THREE.CylinderGeometry(0.18, 0.2, 0.032, 18),
            velvetPadMat,
          );
          pad.position.set(sx, tierY + 0.046, 0.02);
          const padRim = new THREE.Mesh(
            new THREE.TorusGeometry(0.185, 0.013, 8, 22),
            tIdx === 1 ? goldTrimMat : pastelPinkMat,
          );
          padRim.rotation.x = Math.PI / 2;
          padRim.position.set(sx, tierY + 0.06, 0.02);
          g.add(pad, padRim);
          slotCoords.push({x: sx, y: tierY + 0.062, z: 0.02});
        });
      });
    }

    // Front brass plaque
    const plaque = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.06, 0.03, 2, 0.01),
      goldTrimMat,
    );
    plaque.position.set(0, 0.075, d / 2 + 0.005);
    g.add(plaque);

    g.userData.displaySlots = slotCoords;
    return g;
  }

  if (cat.kind === 'aquarium_small' || cat.kind === 'aquarium_large') {
    const isLarge = cat.kind === 'aquarium_large';
    const w = isLarge ? 1.98 : 0.98;
    const d = isLarge ? 0.72 : 0.56;
    const standH = isLarge ? 0.56 : 0.46;
    const tankH = isLarge ? 0.98 : 0.66;

    const standMat = clayMat(isLarge ? '#1E293B' : '#2C3A4E', 0.42);
    const frameMat = glossyClayMat(isLarge ? '#334155' : '#475569', 0.3);
    const stand = new THREE.Mesh(
      new RoundedBoxGeometry(w, standH, d, 3, 0.03),
      standMat,
    );
    stand.position.y = standH / 2;
    g.add(stand);

    // Cabinet door trim + handles
    const doorsCount = isLarge ? 2 : 1;
    for (let i = 0; i < doorsCount; i++) {
      const dx = doorsCount === 2 ? (i === 0 ? -w * 0.24 : w * 0.24) : 0;
      const door = new THREE.Mesh(
        new RoundedBoxGeometry(w / doorsCount - 0.1, standH - 0.12, 0.025, 2, 0.01),
        clayMat('#27364B', 0.5),
      );
      door.position.set(dx, standH / 2, d / 2 + 0.004);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), goldTrimMat);
      knob.position.set(dx + (doorsCount === 2 ? (i === 0 ? 0.14 : -0.14) : 0.18), standH / 2, d / 2 + 0.025);
      g.add(door, knob);
    }

    // Tank corner pillars + top hood with cyan aquarium light
    const hoodH = 0.09;
    const hood = new THREE.Mesh(
      new RoundedBoxGeometry(w + 0.03, hoodH, d + 0.03, 3, 0.025),
      frameMat,
    );
    hood.position.y = standH + tankH + hoodH / 2;
    const aquaLed = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.16, 0.022, d - 0.16),
      new THREE.MeshStandardMaterial({
        color: '#E0F2FE',
        emissive: '#38BDF8',
        emissiveIntensity: 1.05,
        roughness: 0.2,
      }),
    );
    aquaLed.position.y = standH + tankH - 0.005;
    g.add(hood, aquaLed);

    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sz]) => {
      const post = new THREE.Mesh(
        new RoundedBoxGeometry(0.042, tankH + 0.02, 0.042, 2, 0.01),
        frameMat,
      );
      post.position.set(sx * (w / 2 - 0.018), standH + tankH / 2, sz * (d / 2 - 0.018));
      g.add(post);
    });

    // Sand floor
    const sand = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.08, 0.075, d - 0.08, 2, 0.02),
      clayMat('#F4DFB4', 0.88),
    );
    sand.position.y = standH + 0.042;
    g.add(sand);

    // Crystal glowing Play Together turquoise water core
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#4CD4F8',
      emissive: '#0EA5E9',
      emissiveIntensity: 0.24,
      roughness: 0.12,
      metalness: 0.05,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const waterBox = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.075, tankH - 0.09, d - 0.075),
      waterMat,
    );
    waterBox.position.y = standH + tankH / 2 + 0.015;
    waterBox.renderOrder = 3;
    g.add(waterBox);

    // Outer crisp glass panes
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#E6F9FF',
      roughness: 0.08,
      metalness: 0.14,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const glassBox = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.03, tankH, d - 0.03, 2, 0.015),
      glassMat,
    );
    glassBox.position.y = standH + tankH / 2;
    glassBox.renderOrder = 4;
    g.add(glassBox);

    // Decorative rocks, coral & swaying seaweed blades
    const rockMat = clayMat('#7D8597', 0.85);
    const coralPinkMat = clayMat('#FB7185', 0.65);
    const coralGoldMat = clayMat('#FBBF24', 0.65);
    const kelpMat = clayMat('#34D399', 0.65);

    const rockPositions = isLarge
      ? [
          [-0.64, 0.11, -0.1, 1.15],
          [-0.5, 0.09, 0.08, 0.8],
          [0.58, 0.11, -0.06, 1.05],
          [0.05, 0.08, -0.14, 0.72],
        ]
      : [
          [-0.24, 0.09, -0.08, 0.75],
          [0.24, 0.08, 0.06, 0.65],
        ];
    rockPositions.forEach(([rx, ry, rz, rs]) => {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 * rs, 0), rockMat);
      rock.scale.set(1.2, 0.78, 1);
      rock.position.set(rx, standH + ry, rz);
      g.add(rock);
    });

    const coralSpots = isLarge
      ? [
          [-0.68, -0.12, true],
          [0.64, 0.06, false],
          [0.22, -0.16, true],
        ]
      : [[-0.25, -0.1, true]];
    coralSpots.forEach(([cx, cz, isPink]) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(cx as number, standH + 0.09, cz as number);
      const cMat = isPink ? coralPinkMat : coralGoldMat;
      [-0.04, 0, 0.045].forEach((bx, bi) => {
        const branch = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.022, 0.1 + (bi === 1 ? 0.06 : 0), 5, 8),
          cMat,
        );
        branch.position.set(bx, 0.08, 0);
        branch.rotation.z = -bx * 4.5;
        cGrp.add(branch);
      });
      g.add(cGrp);
    });

    const seaweedMeshes: Array<{mesh: THREE.Object3D; baseRotZ: number; phase: number}> = [];
    const kelpXs = isLarge ? [-0.8, -0.35, 0.42, 0.78] : [-0.34, 0.3];
    kelpXs.forEach((kx, ki) => {
      const blade = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, isLarge ? 0.48 : 0.34, 6),
        kelpMat,
      );
      blade.scale.set(1.1, 1, 0.35);
      blade.position.set(kx, standH + (isLarge ? 0.28 : 0.21), (ki % 2 === 0 ? -1 : 1) * 0.11);
      g.add(blade);
      seaweedMeshes.push({mesh: blade, baseRotZ: (ki % 2 === 0 ? 1 : -1) * 0.06, phase: ki * 1.4});
    });

    // Ambient bubble particles
    const bubbleMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      emissive: '#BAE6FD',
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.72,
      roughness: 0.1,
    });
    const bubbles: DisplayFurnitureController['bubbles'] = [];
    const bubbleCount = isLarge ? 12 : 6;
    for (let i = 0; i < bubbleCount; i++) {
      const r = 0.012 + (i % 3) * 0.005;
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), bubbleMat);
      const bx = ((i / bubbleCount) - 0.5) * (w - 0.32);
      const bz = ((i % 3) - 1) * (d * 0.2);
      b.position.set(bx, standH + 0.14, bz);
      g.add(b);
      bubbles.push({
        mesh: b,
        baseX: bx,
        baseZ: bz,
        minY: standH + 0.12,
        riseH: tankH - 0.2,
        speed: 0.32 + (i % 4) * 0.09,
        phase: i * 0.27,
      });
    }

    g.userData.aquariumBounds = {
      w: w - 0.24,
      h: tankH - 0.24,
      d: d - 0.22,
      centerY: standH + tankH * 0.52,
      floorY: standH + 0.11,
    };
    g.userData.bubbles = bubbles;
    g.userData.seaweeds = seaweedMeshes;
    return g;
  }

  // Insect Display Cases (Play Together botanical glass vitrine)
  const isLarge = cat.kind === 'insect_display_large';
  const w = isLarge ? 1.72 : 0.86;
  const d = isLarge ? 0.64 : 0.52;
  const standH = isLarge ? 0.44 : 0.38;
  const boxH = isLarge ? 0.96 : 0.68;

  const woodMat = clayMat(isLarge ? '#8D603D' : '#C89B6E', 0.72);
  const mossMat = clayMat('#65B35C', 0.85);
  const barkMat = clayMat('#7D5333', 0.85);
  const flowerMat = clayMat('#F472B6', 0.6);

  const baseCab = new THREE.Mesh(new RoundedBoxGeometry(w, standH, d, 3, 0.03), woodMat);
  baseCab.position.y = standH / 2;
  const brassPlaque = new THREE.Mesh(
    new RoundedBoxGeometry(isLarge ? 0.42 : 0.24, 0.06, 0.025, 2, 0.01),
    goldTrimMat,
  );
  brassPlaque.position.set(0, standH * 0.55, d / 2 + 0.008);
  g.add(baseCab, brassPlaque);

  // Mossy terrarium bed
  const mossBed = new THREE.Mesh(
    new RoundedBoxGeometry(w - 0.08, 0.08, d - 0.08, 3, 0.03),
    mossMat,
  );
  mossBed.position.y = standH + 0.04;
  g.add(mossBed);

  // Perch logs + leaves + mini flowers inside
  const branchMain = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.032, w * 0.56, 6, 10),
    barkMat,
  );
  branchMain.rotation.z = Math.PI / 2 - 0.18;
  branchMain.position.set(0, standH + 0.26, -0.02);
  g.add(branchMain);

  const twigOffsets = isLarge ? [-0.52, 0, 0.52] : [-0.18, 0.18];
  twigOffsets.forEach((tx, idx) => {
    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), mossMat);
    mound.scale.set(1.3, 0.55, 1.1);
    mound.position.set(tx, standH + 0.07, idx % 2 === 0 ? 0.1 : -0.1);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.14, 6), kelpMatFallback());
    stem.position.set(tx + 0.04, standH + 0.14, idx % 2 === 0 ? 0.12 : -0.08);
    const blossom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.024, 0.022, 8),
      idx % 2 === 0 ? flowerMat : clayMat('#FDE047', 0.6),
    );
    blossom.position.set(tx + 0.04, standH + 0.21, idx % 2 === 0 ? 0.12 : -0.08);
    g.add(mound, stem, blossom);
  });

  // Botanical glass enclosure + top wooden canopy
  const canopy = new THREE.Mesh(
    new RoundedBoxGeometry(w + 0.04, 0.085, d + 0.04, 3, 0.025),
    woodMat,
  );
  canopy.position.y = standH + boxH + 0.04;
  const warmBar = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.16, 0.022, d - 0.16),
    ledStripMat,
  );
  warmBar.position.y = standH + boxH - 0.005;
  g.add(canopy, warmBar);

  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const corner = new THREE.Mesh(
      new RoundedBoxGeometry(0.04, boxH, 0.04, 2, 0.01),
      woodMat,
    );
    corner.position.set(sx * (w / 2 - 0.02), standH + boxH / 2, sz * (d / 2 - 0.02));
    g.add(corner);
  });

  const terrariumGlass = new THREE.Mesh(
    new RoundedBoxGeometry(w - 0.03, boxH, d - 0.03, 2, 0.015),
    new THREE.MeshStandardMaterial({
      color: '#F5FFF8',
      roughness: 0.08,
      metalness: 0.12,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
    }),
  );
  terrariumGlass.position.y = standH + boxH / 2;
  terrariumGlass.renderOrder = 4;
  g.add(terrariumGlass);

  g.userData.insectTerrarium = {
    w: w - 0.22,
    h: boxH - 0.2,
    d: d - 0.2,
    floorY: standH + 0.09,
    centerY: standH + boxH * 0.52,
  };
  return g;
}

function kelpMatFallback() {
  return clayMat('#4ADE80', 0.72);
}

const _fishPalette: Record<
  FishSpeciesId,
  {body: string; accent: string; belly?: string; mode: 'fish' | 'jelly' | 'crawl' | 'clam'; style?: 'round' | 'long' | 'flat' | 'betta' | 'shrimp' | 'turtle' | 'seahorse' | 'octopus' | 'whale'}
> = {
  ca_com: {body: '#CBD5E1', accent: '#60A5FA', belly: '#F8FAFC', mode: 'fish'},
  tom_cang_xanh: {body: '#2563EB', accent: '#38BDF8', mode: 'crawl', style: 'shrimp'},
  ca_ro_dong: {body: '#84A955', accent: '#D9E89C', mode: 'fish'},
  ca_chep: {body: '#F97316', accent: '#FFFFFF', belly: '#FFF7ED', mode: 'fish'},
  ca_tre_vang: {body: '#EAB308', accent: '#A16207', mode: 'fish', style: 'long'},
  ca_loc: {body: '#475569', accent: '#94A3B8', mode: 'fish', style: 'long'},
  ca_chinh: {body: '#334155', accent: '#64748B', mode: 'fish', style: 'long'},
  ca_lia_thia_3_duoi: {body: '#EC4899', accent: '#38BDF8', mode: 'fish', style: 'betta'},
  ca_la_han: {body: '#EF4444', accent: '#FACC15', mode: 'fish', style: 'round'},
  ca_tai_tuong_do: {body: '#F87171', accent: '#FCA5A5', mode: 'fish', style: 'round'},
  ca_heo_nuoc_ngot: {body: '#FB923C', accent: '#1E293B', mode: 'fish'},
  ca_rong_bac: {body: '#E2E8F0', accent: '#93C5FD', mode: 'fish', style: 'long'},
  ca_tam_song: {body: '#64748B', accent: '#CBD5E1', mode: 'fish', style: 'long'},
  ca_he: {body: '#FB923C', accent: '#FFFFFF', mode: 'fish'},
  sua_bien: {body: '#F472B6', accent: '#FBCFE8', mode: 'jelly'},
  sao_bien: {body: '#F59E0B', accent: '#FDE68A', mode: 'crawl', style: 'round'},
  ca_noc_gai: {body: '#FBBF24', accent: '#FEF3C7', mode: 'fish', style: 'round'},
  bach_tuoc: {body: '#A855F7', accent: '#E9D5FF', mode: 'jelly', style: 'octopus'},
  ca_thu_xanh: {body: '#0284C7', accent: '#7DD3FC', mode: 'fish', style: 'long'},
  ca_ngua: {body: '#F59E0B', accent: '#FDE047', mode: 'fish', style: 'seahorse'},
  tom_hum_do: {body: '#DC2626', accent: '#FCA5A5', mode: 'crawl', style: 'shrimp'},
  ca_duoi_dom: {body: '#38BDF8', accent: '#E0F2FE', mode: 'fish', style: 'flat'},
  rua_bien: {body: '#16A34A', accent: '#86EFAC', mode: 'fish', style: 'turtle'},
  so_tai_tuong: {body: '#E2E8F0', accent: '#0EA5E9', mode: 'clam'},
  ca_voi_xanh: {body: '#2563EB', accent: '#93C5FD', belly: '#EFF6FF', mode: 'fish', style: 'whale'},
};

function createAquariumFishMesh(speciesId: FishSpeciesId): {
  root: THREE.Group;
  tail?: THREE.Object3D;
  swimMode: 'fish' | 'jelly' | 'crawl' | 'clam';
} {
  const spec = _fishPalette[speciesId] ?? {body: '#38BDF8', accent: '#FDE047', mode: 'fish'};
  const root = new THREE.Group();
  const bodyMat = glossyClayMat(spec.body, 0.3);
  const accentMat = clayMat(spec.accent, 0.5);
  const eyeMat = glossyClayMat('#111827', 0.15);

  if (spec.mode === 'clam') {
    const shellLower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.065, 0.04, 12),
      bodyMat,
    );
    shellLower.scale.set(1.2, 1, 0.9);
    const mantle = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), accentMat);
    mantle.scale.set(1.15, 0.42, 0.85);
    mantle.position.y = 0.025;
    const shellUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.065, 0.036, 12),
      bodyMat,
    );
    shellUpper.scale.set(1.2, 1, 0.9);
    shellUpper.position.set(0, 0.055, -0.02);
    shellUpper.rotation.x = -0.45;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), clayMat('#FFFBEB', 0.2));
    pearl.position.set(0, 0.04, 0.01);
    root.add(shellLower, mantle, shellUpper, pearl);
    return {root, tail: shellUpper, swimMode: 'clam'};
  }

  if (spec.mode === 'jelly') {
    if (spec.style === 'octopus') {
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), bodyMat);
      head.scale.set(1, 1.15, 1);
      head.position.y = 0.025;
      root.add(head);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.06, 4, 8), accentMat);
        arm.position.set(Math.cos(a) * 0.04, -0.025, Math.sin(a) * 0.04);
        arm.rotation.z = -Math.cos(a) * 0.45;
        arm.rotation.x = Math.sin(a) * 0.45;
        root.add(arm);
      }
      [-1, 1].forEach((s) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), eyeMat);
        eye.position.set(s * 0.024, 0.02, 0.052);
        root.add(eye);
      });
      return {root, swimMode: 'jelly'};
    }

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58),
      new THREE.MeshStandardMaterial({
        color: spec.body,
        emissive: spec.body,
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: 0.78,
        roughness: 0.2,
      }),
    );
    dome.position.y = 0.01;
    root.add(dome);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const tent = new THREE.Mesh(new THREE.CapsuleGeometry(0.007, 0.08, 4, 6), accentMat);
      tent.position.set(Math.cos(a) * 0.032, -0.04, Math.sin(a) * 0.032);
      root.add(tent);
    }
    return {root, swimMode: 'jelly'};
  }

  if (spec.style === 'shrimp') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.085, 6, 10), bodyMat);
    body.rotation.x = Math.PI / 2;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.04, 6), accentMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.z = -0.075;
    [-1, 1].forEach((s) => {
      const claw = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), accentMat);
      claw.scale.set(0.8, 0.65, 1.4);
      claw.position.set(s * 0.042, 0.01, 0.065);
      root.add(claw);
    });
    root.add(body, tail);
    return {root, tail, swimMode: 'crawl'};
  }

  if (speciesId === 'sao_bien') {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const arm = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.075, 6), bodyMat);
      arm.rotation.z = -Math.cos(a) * (Math.PI / 2);
      arm.rotation.y = a;
      arm.position.set(Math.cos(a) * 0.032, 0.015, Math.sin(a) * 0.032);
      root.add(arm);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), accentMat);
    core.position.y = 0.018;
    root.add(core);
    return {root, swimMode: 'crawl'};
  }

  if (spec.style === 'turtle') {
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), bodyMat);
    shell.scale.set(0.95, 0.55, 1.15);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), accentMat);
    head.position.set(0, 0.008, 0.085);
    root.add(shell, head);
    [-1, 1].forEach((s) => {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.012, 0.032), accentMat);
      fin.position.set(s * 0.068, -0.005, 0.03);
      fin.rotation.y = -s * 0.4;
      root.add(fin);
    });
    return {root, swimMode: 'fish'};
  }

  if (spec.style === 'flat') {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.018, 14), bodyMat);
    disc.scale.set(1.25, 1, 1.05);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.09, 6), accentMat);
    tail.rotation.x = -Math.PI / 2;
    tail.position.z = -0.095;
    root.add(disc, tail);
    return {root, tail, swimMode: 'fish'};
  }

  if (spec.style === 'seahorse') {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.072, 6, 10), bodyMat);
    body.rotation.x = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), bodyMat);
    head.position.set(0, 0.052, 0.014);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.012, 0.032, 6), accentMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, 0.05, 0.04);
    const tail = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.007, 6, 12, Math.PI * 1.4), accentMat);
    tail.rotation.y = Math.PI / 2;
    tail.position.set(0, -0.05, -0.01);
    root.add(body, head, snout, tail);
    return {root, tail, swimMode: 'fish'};
  }

  // Standard fish / betta / round / long / whale
  const isWhale = spec.style === 'whale';
  const isLong = spec.style === 'long' || isWhale;
  const isRound = spec.style === 'round';
  const isBetta = spec.style === 'betta';

  const body = new THREE.Mesh(new THREE.SphereGeometry(isWhale ? 0.072 : 0.055, 14, 12), bodyMat);
  body.scale.set(
    isRound ? 0.62 : 0.68,
    isRound ? 1.1 : 0.85,
    isLong ? 1.85 : 1.35,
  );
  root.add(body);

  if (spec.belly) {
    const belly = new THREE.Mesh(
      new THREE.SphereGeometry(isWhale ? 0.064 : 0.046, 10, 8),
      clayMat(spec.belly, 0.55),
    );
    belly.scale.set(0.55, 0.45, isLong ? 1.65 : 1.15);
    belly.position.y = -0.022;
    root.add(belly);
  }

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, isLong ? -0.095 : -0.068);
  const tailGeo = isBetta
    ? new THREE.ConeGeometry(0.075, 0.095, 6)
    : new THREE.ConeGeometry(isWhale ? 0.058 : 0.042, 0.065, 6);
  const tailMesh = new THREE.Mesh(tailGeo, accentMat);
  tailMesh.scale.set(isWhale ? 1.4 : 0.28, isWhale ? 0.25 : 1.05, 1);
  tailMesh.rotation.x = Math.PI / 2;
  tailMesh.position.z = -0.032;
  tailPivot.add(tailMesh);
  root.add(tailPivot);

  const dorsal = new THREE.Mesh(
    new THREE.ConeGeometry(0.022, isBetta ? 0.068 : 0.044, 5),
    accentMat,
  );
  dorsal.scale.set(0.28, 1, 1.3);
  dorsal.position.set(0, 0.052, -0.008);
  dorsal.rotation.x = -0.25;
  root.add(dorsal);

  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), eyeMat);
    eye.position.set(s * 0.032, 0.012, isLong ? 0.065 : 0.042);
    root.add(eye);
  });

  if (isWhale) {
    root.scale.setScalar(1.35);
  }
  return {root, tail: tailPivot, swimMode: 'fish'};
}

export function populateDisplayFurnitureItems(
  meshGroup: THREE.Group,
  cat: FurnitureCatalogItem,
  displayItems?: FurnitureDisplayItem[],
): DisplayFurnitureController | null {
  const items = Array.isArray(displayItems) ? displayItems : [];

  if (cat.interactive === 'doll_display') {
    const slots = (meshGroup.userData.displaySlots as SlotCoord[] | undefined) ?? [];
    const dolls: DisplayFurnitureController['dolls'] = [];

    items.forEach((entry, idx) => {
      const slot = slots[entry.slotIndex] ?? slots[idx];
      if (!slot) return;
      const spec = getDollByHandheld(entry.itemId as HandheldStyle);
      if (!spec) return;

      const rig = buildDollPlushModel(spec.handheldId, spec.primaryColor);
      rig.root.scale.setScalar(0.76);
      rig.root.position.set(slot.x, slot.y + 0.135, slot.z);
      meshGroup.add(rig.root);
      dolls.push({
        rig,
        baseY: slot.y + 0.135,
        phase: idx * 1.15,
      });
    });

    return {
      kind: 'doll_display',
      dolls,
      fishes: [],
      bubbles: [],
      insects: [],
      seaweeds: [],
    };
  }

  if (cat.interactive === 'aquarium_display') {
    const bounds = meshGroup.userData.aquariumBounds as
      | {w: number; h: number; d: number; centerY: number; floorY: number}
      | undefined;
    const bubbles =
      (meshGroup.userData.bubbles as DisplayFurnitureController['bubbles'] | undefined) ?? [];
    const seaweeds =
      (meshGroup.userData.seaweeds as DisplayFurnitureController['seaweeds'] | undefined) ?? [];

    const fishes: DisplayFurnitureController['fishes'] = [];
    if (bounds) {
      const cap = cat.displayCapacity ?? 2;
      items.slice(0, cap).forEach((entry, idx) => {
        const spId = entry.itemId as FishSpeciesId;
        if (!(spId in ALL_FISH_CATALOG)) return;
        const fishMesh = createAquariumFishMesh(spId);
        const fishScale = cap > 2 ? 0.92 : 0.78;
        fishMesh.root.scale.setScalar(fishScale);
        meshGroup.add(fishMesh.root);

        const laneOffset = cap > 1 ? ((idx / Math.max(1, cap - 1)) - 0.5) * (bounds.w * 0.45) : 0;
        const laneY =
          fishMesh.swimMode === 'crawl' || fishMesh.swimMode === 'clam'
            ? bounds.floorY + 0.03
            : bounds.centerY + (((idx % 3) - 1) * bounds.h * 0.24);

        fishes.push({
          root: fishMesh.root,
          tail: fishMesh.tail,
          swimMode: fishMesh.swimMode,
          centerX: laneOffset * 0.55,
          centerY: laneY,
          centerZ: ((idx % 2 === 0 ? -1 : 1) * bounds.d) * 0.12,
          radiusX:
            fishMesh.swimMode === 'clam'
              ? 0
              : Math.max(0.12, bounds.w * (fishMesh.swimMode === 'crawl' ? 0.14 : 0.28)),
          radiusZ:
            fishMesh.swimMode === 'clam'
              ? 0
              : Math.max(0.06, bounds.d * 0.28),
          bobAmp: fishMesh.swimMode === 'jelly' ? 0.06 : fishMesh.swimMode === 'fish' ? 0.025 : 0,
          speed: fishMesh.swimMode === 'crawl' ? 0.35 : 0.75 + (idx % 3) * 0.18,
          phase: idx * 1.45,
        });
      });
    }

    return {
      kind: 'aquarium_display',
      dolls: [],
      fishes,
      bubbles,
      insects: [],
      seaweeds,
    };
  }

  if (cat.interactive === 'insect_display') {
    const bounds = meshGroup.userData.insectTerrarium as
      | {w: number; h: number; d: number; floorY: number; centerY: number}
      | undefined;
    const insects: DisplayFurnitureController['insects'] = [];

    if (bounds) {
      const matCache = new Map<string, THREE.Material>();
      const geoCache = new Map<string, THREE.BufferGeometry>();
      const cap = cat.displayCapacity ?? 2;

      items.slice(0, cap).forEach((entry, idx) => {
        const spId = entry.itemId as InsectSpeciesId;
        const spec = INSECT_CATALOG[spId];
        if (!spec) return;

        const meshData = createInsectMeshForSpecies(spec, matCache, geoCache);
        meshData.bodyGroup.scale.setScalar(cap > 2 ? 0.92 : 0.8);
        meshGroup.add(meshData.bodyGroup);

        const isFlying = meshData.isFlyingHover;
        const spreadX =
          cap > 1 ? ((idx / Math.max(1, cap - 1)) - 0.5) * (bounds.w * 0.72) : 0;
        const baseY = isFlying
          ? bounds.centerY + ((idx % 2 === 0 ? 1 : -0.5) * bounds.h * 0.2)
          : bounds.floorY + 0.05 + (idx % 2) * 0.14;
        const baseZ = ((idx % 2 === 0 ? 1 : -1) * bounds.d) * 0.16;

        meshData.bodyGroup.position.set(spreadX, baseY, baseZ);
        meshData.bodyGroup.rotation.y = (idx * 1.3) % (Math.PI * 2);

        insects.push({
          root: meshData.bodyGroup,
          leftWing: meshData.leftWing,
          rightWing: meshData.rightWing,
          isFlying,
          wingSpeed: meshData.wingSpeed,
          baseX: spreadX,
          baseY,
          baseZ,
          orbitRx: isFlying ? Math.min(0.14, bounds.w * 0.14) : 0.015,
          orbitRz: isFlying ? Math.min(0.1, bounds.d * 0.2) : 0.01,
          phase: idx * 1.6,
        });
      });
    }

    return {
      kind: 'insect_display',
      dolls: [],
      fishes: [],
      bubbles: [],
      insects,
      seaweeds: [],
    };
  }

  return null;
}

export function updateDisplayFurnitureAnimation(
  controllers: DisplayFurnitureController[],
  elapsed: number,
): void {
  for (let i = 0; i < controllers.length; i++) {
    const ctrl = controllers[i];

    for (let d = 0; d < ctrl.dolls.length; d++) {
      const item = ctrl.dolls[d];
      updateDollPlushAnimation(item.rig, elapsed + item.phase);
      item.rig.root.position.y = item.baseY + Math.sin(elapsed * 2.2 + item.phase) * 0.006;
    }

    for (let b = 0; b < ctrl.bubbles.length; b++) {
      const bub = ctrl.bubbles[b];
      const u = ((elapsed * bub.speed + bub.phase) % 1 + 1) % 1;
      bub.mesh.position.y = bub.minY + u * bub.riseH;
      bub.mesh.position.x = bub.baseX + Math.sin(elapsed * 3.1 + bub.phase * 5) * 0.016;
      const fadeScale = Math.sin(u * Math.PI) * 0.95 + 0.15;
      bub.mesh.scale.setScalar(fadeScale);
    }

    for (let s = 0; s < ctrl.seaweeds.length; s++) {
      const sw = ctrl.seaweeds[s];
      sw.mesh.rotation.z = sw.baseRotZ + Math.sin(elapsed * 1.9 + sw.phase) * 0.12;
    }

    for (let f = 0; f < ctrl.fishes.length; f++) {
      const fish = ctrl.fishes[f];
      if (fish.swimMode === 'clam') {
        if (fish.tail) {
          fish.tail.rotation.x = -0.35 - Math.abs(Math.sin(elapsed * 0.8 + fish.phase)) * 0.22;
        }
        continue;
      }

      const ang = elapsed * fish.speed + fish.phase;
      const nx = fish.centerX + Math.cos(ang) * fish.radiusX;
      const nz = fish.centerZ + Math.sin(ang * 2) * fish.radiusZ;
      const dx = -Math.sin(ang) * fish.radiusX * fish.speed;
      const dz = 2 * Math.cos(ang * 2) * fish.radiusZ * fish.speed;

      fish.root.position.set(
        nx,
        fish.centerY + Math.sin(elapsed * 2.2 + fish.phase) * fish.bobAmp,
        nz,
      );
      if (Math.hypot(dx, dz) > 0.001) {
        fish.root.rotation.y = Math.atan2(dx, dz);
      }
      if (fish.tail) {
        fish.tail.rotation.y = Math.sin(elapsed * 8.2 + fish.phase) * 0.34;
      }
    }

    for (let k = 0; k < ctrl.insects.length; k++) {
      const ins = ctrl.insects[k];
      if (ins.isFlying) {
        const ang = elapsed * 1.45 + ins.phase;
        const nx = ins.baseX + Math.cos(ang) * ins.orbitRx;
        const nz = ins.baseZ + Math.sin(ang * 2) * ins.orbitRz;
        const dx = -Math.sin(ang) * ins.orbitRx;
        const dz = 2 * Math.cos(ang * 2) * ins.orbitRz;
        ins.root.position.set(
          nx,
          ins.baseY + Math.sin(elapsed * 3.8 + ins.phase) * 0.035,
          nz,
        );
        if (Math.hypot(dx, dz) > 0.001) {
          ins.root.rotation.y = Math.atan2(dx, dz);
        }
        const flap = Math.sin(elapsed * ins.wingSpeed + ins.phase) * 0.68 + 0.16;
        if (ins.leftWing) ins.leftWing.rotation.z = -flap;
        if (ins.rightWing) ins.rightWing.rotation.z = flap;
      } else {
        ins.root.rotation.y = ins.phase + Math.sin(elapsed * 1.1 + ins.phase) * 0.14;
      }
    }
  }
}
