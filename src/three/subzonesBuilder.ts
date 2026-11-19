import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {TINA_AVATAR} from '../data/avatarCatalog';
import {GardenPlotState, TimeOfDay, ZoneId} from '../types/game';
import {buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {
  clayMat,
  createCheckerFloorTexture,
  createWoodPlankTexture,
  glossyClayMat,
  makeShadowed,
} from './materials';
import {TownAnchor, WorldCollider} from './townBuilder';

export interface SubzoneWorld {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  clickTargets: THREE.Object3D[];
  labelAnchors: TownAnchor[];
  colliders: WorldCollider[];
  update: (elapsed: number, timeOfDay: TimeOfDay) => void;
  dispose: () => void;
}

function addBoxProxy(
  parent: THREE.Object3D,
  size: [number, number, number],
  pos: [number, number, number],
  userData: Record<string, unknown>,
  targets: THREE.Object3D[],
) {
  const proxy = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    new THREE.MeshBasicMaterial({visible: false}),
  );
  proxy.position.set(pos[0], pos[1], pos[2]);
  proxy.userData = userData;
  parent.add(proxy);
  targets.push(proxy);
}

function createExitDoorway(
  label: string,
  pos: [number, number, number],
  accentColor: string,
  targets: THREE.Object3D[],
  anchors: TownAnchor[],
): THREE.Group {
  const doorGroup = new THREE.Group();
  doorGroup.position.set(pos[0], pos[1], pos[2]);

  const mat = new THREE.Mesh(
    new RoundedBoxGeometry(1.75, 0.08, 0.95, 2, 0.03),
    clayMat(accentColor, 0.72),
  );
  mat.position.y = 0.04;

  const postL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.09, 1.35, 10),
    clayMat('#7D5333', 0.7),
  );
  postL.position.set(-0.9, 0.68, 0);
  const postR = postL.clone();
  postR.position.x = 0.9;

  const signBoard = new THREE.Mesh(
    new RoundedBoxGeometry(2.05, 0.44, 0.14, 3, 0.04),
    clayMat('#FFF6E6', 0.65),
  );
  signBoard.position.set(0, 1.25, 0);

  doorGroup.add(mat, postL, postR, signBoard);
  makeShadowed(doorGroup, true, true);
  addBoxProxy(
    doorGroup,
    [2.1, 1.5, 1.3],
    [0, 0.75, 0],
    {kind: 'exit', tx: pos[0], tz: pos[2] - 0.8},
    targets,
  );
  anchors.push({
    id: 'exit_door',
    label,
    worldPos: new THREE.Vector3(pos[0], 1.75, pos[2]),
  });

  return doorGroup;
}

export function buildSubzoneScene(
  zone: Exclude<ZoneId, 'town'>,
  options: {
    plots: GardenPlotState[];
    fishingState: 'idle' | 'waiting' | 'bite';
  },
): SubzoneWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];
  let updateFn: (elapsed: number, timeOfDay: TimeOfDay) => void = () => {};

  const woodTex = createWoodPlankTexture();
  disposables.push(woodTex);

  // Default floor mesh (overridden per zone as needed)
  let groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 11),
    new THREE.MeshStandardMaterial({map: woodTex, roughness: 0.75}),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  groundMesh.userData = {kind: 'ground'};

  if (zone === 'home') {
    // Cutaway Cozy Cottage Diorama
    const floorBase = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 0.4, 10.6, 3, 0.08),
      clayMat('#B9885A', 0.72),
    );
    floorBase.position.y = -0.21;
    floorBase.receiveShadow = true;
    group.add(floorBase);
    group.add(groundMesh);

    // Low 360-friendly Cutaway Diorama Wainscot Walls
    const backWall = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 1.85, 0.32, 3, 0.06),
      clayMat('#F7EBD7', 0.78),
    );
    backWall.position.set(0, 0.92, -5.18);
    const leftWall = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 1.05, 10.6, 3, 0.06),
      clayMat('#F0E1C8', 0.78),
    );
    leftWall.position.set(-4.1, 0.52, 0);
    const rightWall = leftWall.clone();
    rightWall.position.x = 4.1;
    group.add(backWall, leftWall, rightWall);

    // Window in back diorama wall
    const winFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.9, 1.2, 0.18, 3, 0.05),
      clayMat('#8C5E3A', 0.65),
    );
    winFrame.position.set(0, 1.35, -5.0);
    const winGlass = new THREE.Mesh(
      new RoundedBoxGeometry(1.6, 0.95, 0.2, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: '#AEE4FA',
        emissive: '#FFE08A',
        emissiveIntensity: 0.15,
        roughness: 0.15,
      }),
    );
    winGlass.position.set(0, 1.35, -4.98);
    group.add(winFrame, winGlass);

    // Cozy Oval Rug
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.35, 0.05, 32),
      clayMat('#E69B8B', 0.9),
    );
    rug.scale.set(1.1, 1, 0.78);
    rug.position.set(0, 0.025, 0.3);
    const rugInner = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.78, 0.06, 32),
      clayMat('#F7E2CE', 0.9),
    );
    rugInner.scale.set(1.1, 1, 0.78);
    rugInner.position.set(0, 0.026, 0.3);
    group.add(rug, rugInner);

    // 1. SCULPTED WARDROBE WITH MIRROR (Top-Left)
    const wardrobe = new THREE.Group();
    wardrobe.position.set(-2.65, 0, -3.55);
    wardrobe.rotation.y = 0.22;
    const wBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 2.8, 1.05, 4, 0.08),
      clayMat('#A87449', 0.68),
    );
    wBody.position.y = 1.4;
    const wTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.02, 0.2, 1.18, 3, 0.05),
      clayMat('#8A5C36', 0.65),
    );
    wTop.position.y = 2.86;
    const mirror = new THREE.Mesh(
      new RoundedBoxGeometry(0.66, 1.85, 0.08, 3, 0.03),
      glossyClayMat('#DDF3FC', 0.1),
    );
    mirror.position.set(0.42, 1.5, 0.52);
    const doorPanel = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 2.25, 0.08, 3, 0.03),
      clayMat('#C59363', 0.64),
    );
    doorPanel.position.set(-0.42, 1.45, 0.52);
    wardrobe.add(wBody, wTop, mirror, doorPanel);
    makeShadowed(wardrobe, true, true);
    addBoxProxy(
      wardrobe,
      [2.1, 3.0, 1.4],
      [0, 1.5, 0],
      {kind: 'wardrobe', tx: -2.2, tz: -1.9},
      clickTargets,
    );
    colliders.push({type: 'box', id: 'wardrobe', x: -2.65, z: -3.55, hw: 1.0, hd: 0.62, rotY: 0.22});
    labelAnchors.push({
      id: 'wardrobe',
      label: 'Tủ Thay Đồ',
      worldPos: new THREE.Vector3(-2.65, 3.25, -3.55),
    });
    group.add(wardrobe);

    // 2. SCULPTED COZY BED (Top-Right)
    const bed = new THREE.Group();
    bed.position.set(2.35, 0, -3.2);
    const headboard = new THREE.Mesh(
      new RoundedBoxGeometry(2.15, 1.45, 0.22, 3, 0.06),
      clayMat('#9A6942', 0.7),
    );
    headboard.position.set(0, 0.75, -1.15);
    const mattress = new THREE.Mesh(
      new RoundedBoxGeometry(2.05, 0.52, 2.35, 4, 0.12),
      clayMat('#FFFDF8', 0.78),
    );
    mattress.position.set(0, 0.42, 0);
    const blanket = new THREE.Mesh(
      new RoundedBoxGeometry(2.12, 0.54, 1.52, 4, 0.14),
      clayMat('#E5887B', 0.74),
    );
    blanket.position.set(0, 0.44, 0.44);
    const pillow = new THREE.Mesh(
      new RoundedBoxGeometry(0.85, 0.24, 0.52, 3, 0.08),
      clayMat('#FFFDF8', 0.8),
    );
    pillow.position.set(-0.45, 0.74, -0.78);
    const pillow2 = pillow.clone();
    pillow2.position.x = 0.45;
    bed.add(headboard, mattress, blanket, pillow, pillow2);
    makeShadowed(bed, true, true);
    addBoxProxy(
      bed,
      [2.3, 1.5, 2.6],
      [0, 0.7, 0],
      {
        kind: 'bed',
        tx: 1.0,
        tz: -2.4,
        seatX: 2.35,
        seatZ: -3.1,
        seatY: 0.68,
        sitRotY: 0,
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'bed', x: 2.35, z: -3.2, hw: 1.08, hd: 1.25});
    labelAnchors.push({
      id: 'bed',
      label: 'Giường Ngủ',
      worldPos: new THREE.Vector3(2.35, 1.65, -3.2),
    });
    group.add(bed);

    // 3. SCULPTED PLUSH SOFA (Mid-Left, facing +X)
    const sofa = new THREE.Group();
    sofa.position.set(-2.5, 0, 1.3);
    sofa.rotation.y = Math.PI / 2;
    const seat = new THREE.Mesh(
      new RoundedBoxGeometry(2.0, 0.52, 1.0, 4, 0.14),
      clayMat('#7BAE8B', 0.76),
    );
    seat.position.y = 0.36;
    const back = new THREE.Mesh(
      new RoundedBoxGeometry(2.0, 0.85, 0.32, 4, 0.12),
      clayMat('#669977', 0.76),
    );
    back.position.set(0, 0.7, -0.38);
    sofa.add(seat, back);
    makeShadowed(sofa, true, true);
    addBoxProxy(
      sofa,
      [2.2, 1.2, 1.2],
      [0, 0.55, 0],
      {
        kind: 'sofa',
        tx: -1.45,
        tz: 1.3,
        seatX: -2.38,
        seatZ: 1.3,
        seatY: 0.62,
        sitRotY: Math.PI / 2,
        colliderId: 'sofa',
      },
      clickTargets,
    );
    colliders.push({type: 'box', id: 'sofa', x: -2.5, z: 1.3, hw: 1.05, hd: 0.55, rotY: Math.PI / 2});
    labelAnchors.push({
      id: 'sofa',
      label: 'Ghế Sofa',
      worldPos: new THREE.Vector3(-2.5, 1.35, 1.3),
    });
    group.add(sofa);

    // 4. EXIT DOORWAY
    group.add(createExitDoorway('Ra Thị Trấn', [0, 0, 4.45], '#C9735B', clickTargets, labelAnchors));
    makeShadowed(group, true, true);
  } else if (zone === 'garden') {
    const grassFloor = new THREE.Mesh(
      new RoundedBoxGeometry(8.8, 0.4, 11.2, 3, 0.1),
      clayMat('#8ECC72', 0.85),
    );
    grassFloor.position.y = -0.21;
    grassFloor.receiveShadow = true;
    grassFloor.userData = {kind: 'ground'};
    groundMesh = grassFloor;
    group.add(grassFloor);

    // Picket Fence along back
    for (let i = -4; i <= 4; i++) {
      const picket = new THREE.Mesh(
        new RoundedBoxGeometry(0.45, 1.15, 0.16, 2, 0.04),
        clayMat('#FFF8EB', 0.72),
      );
      picket.position.set(i * 0.95, 0.58, -4.9);
      group.add(picket);
    }

    // Cozy Conservatory Greenhouse corner (no heavy transmission pass)
    const gh = new THREE.Group();
    gh.position.set(-2.15, 0, -3.35);
    const ghGlassMat = new THREE.MeshStandardMaterial({
      color: '#D4F2FC',
      transparent: true,
      opacity: 0.48,
      roughness: 0.16,
      metalness: 0.08,
      depthWrite: false,
    });
    const ghFrameMat = clayMat('#4C7B63', 0.62);
    const ghBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, 0.45, 2.0, 2, 0.05),
      clayMat('#C4B39D', 0.8),
    );
    ghBase.position.y = 0.22;
    const ghGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.65, 1.35, 1.85),
      ghGlassMat,
    );
    ghGlass.position.y = 1.12;
    const ghRoof = new THREE.Mesh(
      new THREE.ConeGeometry(1.85, 0.95, 4),
      ghGlassMat,
    );
    ghRoof.rotation.y = Math.PI / 4;
    ghRoof.scale.set(1.15, 1, 0.82);
    ghRoof.position.y = 2.25;
    const ghBeam = new THREE.Mesh(
      new RoundedBoxGeometry(2.74, 0.09, 1.94, 2, 0.02),
      ghFrameMat,
    );
    ghBeam.position.y = 1.8;
    gh.add(ghBase, ghGlass, ghRoof, ghBeam);
    group.add(gh);
    colliders.push({type: 'box', x: -2.15, z: -3.35, hw: 1.45, hd: 1.05});

    // Stone Water Well
    const well = new THREE.Group();
    well.position.set(2.55, 0, -3.1);
    const wellWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.82, 0.75, 16),
      clayMat('#9EA8B3', 0.78),
    );
    wellWall.position.y = 0.38;
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.08, 16),
      glossyClayMat('#63C1E8', 0.12),
    );
    wellWater.position.y = 0.74;
    const wellRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 0.65, 4),
      clayMat('#C9735B', 0.68),
    );
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.position.y = 1.65;
    well.add(wellWall, wellWater, wellRoof);
    makeShadowed(well, true, true);
    addBoxProxy(well, [1.8, 2.0, 1.8], [0, 1.0, 0], {kind: 'well', tx: 1.6, tz: -2.2}, clickTargets);
    colliders.push({type: 'circle', x: 2.55, z: -3.1, r: 0.9});
    labelAnchors.push({id: 'well', label: 'Giếng Nước', worldPos: new THREE.Vector3(2.55, 2.15, -3.1)});
    group.add(well);

    // 6 Sculpted Raised Soil Plots
    options.plots.forEach((plot, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const px = -2.2 + col * 2.2;
      const pz = -0.5 + row * 2.1;

      const plotGroup = new THREE.Group();
      plotGroup.position.set(px, 0, pz);

      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(1.65, 0.24, 1.55, 3, 0.05),
        clayMat('#A87549', 0.78),
      );
      frame.position.y = 0.12;
      const dirt = new THREE.Mesh(
        new RoundedBoxGeometry(1.42, 0.26, 1.32, 2, 0.03),
        clayMat(plot.stage === 'watered' ? '#5E3D23' : '#7C5333', 0.92),
      );
      dirt.position.y = 0.14;
      plotGroup.add(frame, dirt);

      if (plot.stage === 'planted' || plot.stage === 'watered') {
        const sprout = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 10),
          clayMat(plot.stage === 'watered' ? '#6FE078' : '#5BB862', 0.6),
        );
        sprout.position.y = 0.36;
        plotGroup.add(sprout);
      } else if (plot.stage === 'ready') {
        const fruitCol =
          plot.crop === 'strawberry'
            ? '#E84A5F'
            : plot.crop === 'sunflower'
              ? '#F9C74F'
              : '#F38D3C';
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 8), clayMat('#4E9450'));
        stem.position.y = 0.42;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), glossyClayMat(fruitCol, 0.35));
        head.position.y = 0.68;
        plotGroup.add(stem, head);
      }

      makeShadowed(plotGroup, true, true);
      addBoxProxy(
        plotGroup,
        [1.7, 1.0, 1.6],
        [0, 0.45, 0],
        {kind: 'plot', plotId: plot.id, tx: px, tz: pz + 1.18},
        clickTargets,
      );
      colliders.push({type: 'box', x: px, z: pz, hw: 0.84, hd: 0.78});
      const stageLabel =
        plot.stage === 'empty'
          ? 'Gieo Hạt'
          : plot.stage === 'planted'
            ? 'Tưới Nước'
            : plot.stage === 'watered'
              ? 'Đang Lớn'
              : 'Thu Hoạch';
      labelAnchors.push({
        id: `plot_${plot.id}`,
        label: stageLabel,
        worldPos: new THREE.Vector3(px, 1.05, pz),
      });
      group.add(plotGroup);
    });

    group.add(createExitDoorway('Cổng Thị Trấn', [0, 0, 4.55], '#6EA85C', clickTargets, labelAnchors));
  } else if (zone === 'fishing') {
    const bank = new THREE.Mesh(
      new RoundedBoxGeometry(9.0, 0.5, 5.8, 3, 0.1),
      clayMat('#93CE74', 0.85),
    );
    bank.position.set(0, -0.25, 2.5);
    bank.receiveShadow = true;
    bank.userData = {kind: 'ground'};
    groundMesh = bank;
    group.add(bank);

    // Sculpted Lake Water
    const water = new THREE.Mesh(
      new RoundedBoxGeometry(10.5, 0.3, 6.8, 2, 0.05),
      glossyClayMat('#4AB3DA', 0.12),
    );
    water.position.set(0, -0.32, -2.5);
    group.add(water);

    // Timber Pier extending out
    const pier = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 0.24, 4.2, 3, 0.05),
      clayMat('#C59160', 0.72),
    );
    pier.position.set(0, 0.06, -0.3);
    makeShadowed(pier, true, true);
    group.add(pier);
    // Keep player out of deep lake water except along the wooden pier
    colliders.push({type: 'box', x: -2.9, z: -2.1, hw: 1.8, hd: 1.85});
    colliders.push({type: 'box', x: 2.9, z: -2.1, hw: 1.8, hd: 1.85});
    colliders.push({type: 'box', x: 0, z: -3.2, hw: 1.6, hd: 0.8});

    // Bobber in water
    const bobber = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 14, 14),
      glossyClayMat(options.fishingState === 'bite' ? '#F9C74F' : '#E84A5F', 0.2),
    );
    bobber.position.set(0, -0.08, -3.15);
    bobber.visible = options.fishingState !== 'idle';
    group.add(bobber);

    addBoxProxy(
      group,
      [3.4, 1.4, 3.2],
      [0, 0.4, -2.6],
      {kind: 'fish_cast', tx: 0, tz: -1.4},
      clickTargets,
    );
    labelAnchors.push({
      id: 'fish_cast',
      label:
        options.fishingState === 'idle'
          ? 'Chạm Thả Cần'
          : options.fishingState === 'waiting'
            ? 'Đang Chờ Cá...'
            : 'Giật Cần Ngay!',
      worldPos: new THREE.Vector3(0, 1.15, -2.8),
    });

    updateFn = (elapsed) => {
      if (bobber.visible) {
        bobber.position.y =
          options.fishingState === 'bite'
            ? -0.02 + Math.sin(elapsed * 18) * 0.16
            : -0.08 + Math.sin(elapsed * 3) * 0.05;
      }
    };

    group.add(createExitDoorway('Lối Về Phố', [0, 0, 4.45], '#E2C9A3', clickTargets, labelAnchors));
  } else if (zone === 'arcade') {
    const checkerTex = createCheckerFloorTexture();
    disposables.push(checkerTex);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(8.2, 10.6),
      new THREE.MeshStandardMaterial({map: checkerTex, roughness: 0.6}),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    const wall = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 1.35, 0.32, 3, 0.06),
      clayMat('#382E57', 0.68),
    );
    wall.position.set(0, 0.68, -5.18);
    group.add(wall);

    // Cabinet 1: Bắt Sao
    const cab = new THREE.Group();
    cab.position.set(-1.95, 0, -2.8);
    const cabBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.7, 2.6, 1.35, 4, 0.1),
      clayMat('#E86F74', 0.45),
    );
    cabBody.position.y = 1.3;
    const screen = new THREE.Mesh(
      new RoundedBoxGeometry(1.25, 0.95, 0.12, 2, 0.04),
      new THREE.MeshStandardMaterial({
        color: '#22325C',
        emissive: '#3D63B8',
        emissiveIntensity: 0.55,
      }),
    );
    screen.position.set(0, 1.65, 0.65);
    cab.add(cabBody, screen);
    makeShadowed(cab, true, true);
    addBoxProxy(cab, [1.9, 2.7, 1.6], [0, 1.3, 0], {kind: 'arcade_star', tx: -1.95, tz: -1.35}, clickTargets);
    colliders.push({type: 'box', x: -1.95, z: -2.8, hw: 0.9, hd: 0.72});
    labelAnchors.push({id: 'arcade_star', label: 'Máy Bắt Sao', worldPos: new THREE.Vector3(-1.95, 2.85, -2.8)});
    group.add(cab);

    // Cabinet 2: Claw Machine
    const claw = new THREE.Group();
    claw.position.set(1.95, 0, -2.8);
    const clawBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.7, 1.15, 1.35, 4, 0.08),
      clayMat('#6DB2E6', 0.48),
    );
    clawBase.position.y = 0.58;
    const clawGlass = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 1.3, 1.2, 3, 0.06),
      new THREE.MeshPhysicalMaterial({
        color: '#DDF3FF',
        transparent: true,
        opacity: 0.52,
        roughness: 0.1,
        depthWrite: false,
      }),
    );
    clawGlass.position.y = 1.75;
    const plush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), clayMat('#F4A261', 0.72));
    plush.position.set(-0.25, 1.35, 0);
    const plush2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), clayMat('#F7A8B8', 0.72));
    plush2.position.set(0.3, 1.32, 0.15);
    claw.add(clawBase, clawGlass, plush, plush2);
    makeShadowed(claw, true, true);
    addBoxProxy(claw, [1.9, 2.7, 1.6], [0, 1.3, 0], {kind: 'arcade_claw', tx: 1.95, tz: -1.35}, clickTargets);
    colliders.push({type: 'box', x: 1.95, z: -2.8, hw: 0.9, hd: 0.72});
    labelAnchors.push({id: 'arcade_claw', label: 'Gắp Thú Bông', worldPos: new THREE.Vector3(1.95, 2.85, -2.8)});
    group.add(claw);

    group.add(createExitDoorway('Ra Thị Trấn', [0, 0, 4.45], '#E86F74', clickTargets, labelAnchors));
  } else if (zone === 'boutique') {
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 0.4, 10.6, 3, 0.08),
      clayMat('#EBD6CB', 0.72),
    );
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    const wall = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 1.45, 0.32, 3, 0.06),
      clayMat('#FCEEEF', 0.75),
    );
    wall.position.set(0, 0.72, -5.18);
    group.add(wall);

    // Warm Boutique Runner Rug
    const rug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.45, 0.05, 32),
      clayMat('#F5C6CE', 0.88),
    );
    rug.scale.set(1.15, 1, 0.85);
    rug.position.set(0, 0.025, 0.35);
    group.add(rug);

    // Sculpted Shop Counter (Click Counter -> open_shop)
    const counter = new THREE.Group();
    counter.position.set(0, 0, -1.65);
    const desk = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, 0.96, 0.95, 4, 0.08),
      clayMat('#D9788A', 0.58),
    );
    desk.position.y = 0.48;
    const deskTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.98, 0.14, 1.1, 3, 0.05),
      clayMat('#FFF9F2', 0.5),
    );
    deskTop.position.y = 0.98;
    const registerBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.55, 0.24, 0.42, 3, 0.04),
      clayMat('#F7D7A8', 0.55),
    );
    registerBase.position.set(0.75, 1.16, 0);
    const catalogBook = new THREE.Mesh(
      new RoundedBoxGeometry(0.65, 0.1, 0.46, 2, 0.03),
      glossyClayMat('#FFD166', 0.25),
    );
    catalogBook.position.set(-0.55, 1.1, 0.1);
    counter.add(desk, deskTop, registerBase, catalogBook);
    makeShadowed(counter, true, true);
    addBoxProxy(
      counter,
      [3.0, 1.5, 1.35],
      [0, 0.75, 0],
      {kind: 'open_shop', tx: 0, tz: -0.25},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -1.65, hw: 1.52, hd: 0.62});
    labelAnchors.push({
      id: 'shop_counter',
      label: 'Quầy Cửa Hàng',
      worldPos: new THREE.Vector3(0, 1.55, -1.65),
    });
    group.add(counter);

    // Employee Tina standing behind her counter (Click Tina -> open_shop)
    const tinaRig = buildAvatarRig(TINA_AVATAR);
    tinaRig.root.position.set(0, 0, -2.6);
    tinaRig.root.rotation.y = 0;
    updateAvatarRigAnimation(tinaRig, 'idle', 0, false);
    group.add(tinaRig.root);
    addBoxProxy(
      group,
      [1.2, 2.0, 1.2],
      [0, 1.0, -2.6],
      {kind: 'open_shop', tx: 0, tz: -0.25},
      clickTargets,
    );
    colliders.push({type: 'circle', x: 0, z: -2.6, r: 0.45});
    labelAnchors.push({
      id: 'tina_npc',
      label: 'Tina',
      worldPos: new THREE.Vector3(0, 2.15, -2.6),
    });

    group.add(createExitDoorway('Cửa Ra Phố', [0, 0, 4.45], '#E58E9A', clickTargets, labelAnchors));
  }

  return {
    group,
    groundMesh,
    clickTargets,
    labelAnchors,
    colliders,
    update: updateFn,
    dispose: () => {
      disposables.forEach((t) => t.dispose());
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}
