import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BOB_AVATAR, TINA_AVATAR} from '../data/avatarCatalog';
import {POND_FISH_SPECIES} from '../data/farmCatalog';
import {FURNITURE_BY_ID} from '../data/furnitureCatalog';
import {
  CoopKind,
  CoopTroughs,
  GardenPlotState,
  LivestockAnimalState,
  PlacedFurniture,
  PondFishState,
  TimeOfDay,
  ZoneId,
} from '../types/game';
import {buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {buildPlotBotanicalDecor} from './crops3d';
import {buildFurnitureMesh} from './furniture3d';
import {
  clayMat,
  createCheckerFloorTexture,
  createGrassTexture,
  createWoodPlankTexture,
  glossyClayMat,
} from './materials';
import {createTreeGeometries, TownAnchor, WorldCollider} from './townBuilder';

export interface HouseDoorHandle {
  id: string;
  label: string;
  x: number;
  z: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export interface HouseWallSurface {
  id: string;
  axis: 'x' | 'z';
  pos: number;
  minSpan: number;
  maxSpan: number;
  thickness: number;
  outerSide?: 1 | -1;
  isUp: () => boolean;
}

export interface SubzoneUpdateContext {
  cameraPos?: THREE.Vector3;
  playerPos?: {x: number; z: number};
}

export interface SubzoneWorld {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  clickTargets: THREE.Object3D[];
  labelAnchors: TownAnchor[];
  colliders: WorldCollider[];
  doors?: HouseDoorHandle[];
  wallSurfaces?: HouseWallSurface[];
  triggerPondFeed?: () => void;
  update: (elapsed: number, timeOfDay: TimeOfDay, context?: SubzoneUpdateContext) => void;
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
    new THREE.CylinderGeometry(0.08, 0.09, 1.35, 8),
    clayMat('#7D5333', 0.7),
  );
  postL.position.set(-0.9, 0.68, 0);
  const postR = postL.clone();
  postR.position.x = 0.9;

  const signBoard = new THREE.Mesh(
    new RoundedBoxGeometry(2.05, 0.44, 0.14, 2, 0.04),
    clayMat('#FFF6E6', 0.65),
  );
  signBoard.position.set(0, 1.25, 0);

  doorGroup.add(mat, postL, postR, signBoard);
  addBoxProxy(
    doorGroup,
    [2.1, 1.5, 1.3],
    [0, 0.75, 0],
    {kind: 'exit', tx: pos[0], tz: pos[2] - 0.85},
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
    placedFurniture?: PlacedFurniture[];
    openDoors?: Record<string, boolean>;
    livestock?: LivestockAnimalState[];
    troughs?: CoopTroughs;
    pondFish?: PondFishState[];
  },
): SubzoneWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];
  let doors: HouseDoorHandle[] | undefined;
  let wallSurfaces: HouseWallSurface[] | undefined;
  let triggerPondFeedFn: (() => void) | undefined;
  let updateFn: (elapsed: number, timeOfDay: TimeOfDay, context?: SubzoneUpdateContext) => void =
    () => {};

  const woodTex = createWoodPlankTexture();
  disposables.push(woodTex);

  let groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 11),
    new THREE.MeshStandardMaterial({map: woodTex, roughness: 0.75}),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.userData = {kind: 'ground'};

  if (zone === 'home') {
    // ========== EXPANDED UNIFIED 5-ROOM HOUSE BLOCK (24m x 17m, X:-13.5..+10.5, Z:-9.5..+7.5) ==========
    // Uniform wall height = 3.25m (taller than wardrobe 2.7m & fridge 2.28m)
    // Door / archway clear opening height = 2.45m (well above avatar head & hat)
    const WALL_H = 3.25;
    const BASE_H = 0.34;
    const UPPER_H = WALL_H - BASE_H; // 2.91m
    const DOOR_H = 2.45;
    const HEADER_H = WALL_H - DOOR_H; // 0.80m

    woodTex.repeat.set(9, 7);
    groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(24.0, 17.0),
      new THREE.MeshStandardMaterial({map: woodTex, roughness: 0.76}),
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(-1.5, 0, -1.0);
    groundMesh.userData = {kind: 'ground'};

    const floorBase = new THREE.Mesh(
      new RoundedBoxGeometry(24.4, 0.44, 17.4, 2, 0.08),
      clayMat('#B48254', 0.74),
    );
    floorBase.position.set(-1.5, -0.23, -1.0);
    group.add(floorBase, groundMesh);

    // Distinct Tile Floors for Kitchen (Front-Right: X +4..+10.5, Z -0.5..+7.5) and Bathroom (Back-Right: X +4..+10.5, Z -9.5..-0.5)
    const kitchenTex = createCheckerFloorTexture('#F7F1E5', '#EAE0CC');
    kitchenTex.repeat.set(4, 5);
    disposables.push(kitchenTex);
    const kitchenFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(6.45, 7.95),
      new THREE.MeshStandardMaterial({map: kitchenTex, roughness: 0.58}),
    );
    kitchenFloor.rotation.x = -Math.PI / 2;
    kitchenFloor.position.set(7.25, 0.008, 3.5);
    group.add(kitchenFloor);

    const bathTex = createCheckerFloorTexture('#E4F4FB', '#CEE9F7');
    bathTex.repeat.set(4, 5);
    disposables.push(bathTex);
    const bathFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(6.45, 8.95),
      new THREE.MeshStandardMaterial({map: bathTex, roughness: 0.52}),
    );
    bathFloor.rotation.x = -Math.PI / 2;
    bathFloor.position.set(7.25, 0.008, -5.0);
    group.add(bathFloor);

    const outerWallMat = clayMat('#F5E8D2', 0.78);
    const innerWallMat = clayMat('#EFE0C7', 0.78);
    const baseboardMat = clayMat('#DFCEB4', 0.76);
    const trimWoodMat = clayMat('#9D6D44', 0.7);
    const doorWoodMat = clayMat('#B87B49', 0.65);
    const handleGoldMat = glossyClayMat('#F4C95D', 0.25);

    interface SmartWallGroup {
      id: string;
      upperGroup: THREE.Group;
      axis: 'x' | 'z';
      pos: number;
      minSpan: number;
      maxSpan: number;
      outerSide?: 1 | -1;
      currentScaleY: number;
      attachedItems: THREE.Object3D[];
    }

    const smartWalls: SmartWallGroup[] = [];
    const wallSnapList: HouseWallSurface[] = [];

    const createSmartWallGroup = (cfg: {
      id: string;
      axis: 'x' | 'z';
      pos: number;
      minSpan: number;
      maxSpan: number;
      outerSide?: 1 | -1;
      initHidden?: boolean;
    }): SmartWallGroup => {
      const upperGroup = new THREE.Group();
      upperGroup.position.set(0, BASE_H, 0);
      const initScale = cfg.initHidden ? 0.001 : 1;
      upperGroup.scale.y = initScale;
      upperGroup.visible = !cfg.initHidden;
      group.add(upperGroup);
      const sw: SmartWallGroup = {
        id: cfg.id,
        upperGroup,
        axis: cfg.axis,
        pos: cfg.pos,
        minSpan: cfg.minSpan,
        maxSpan: cfg.maxSpan,
        outerSide: cfg.outerSide,
        currentScaleY: initScale,
        attachedItems: [],
      };
      smartWalls.push(sw);
      return sw;
    };

    const addWallSegment = (
      sw: SmartWallGroup,
      x: number,
      z: number,
      w: number,
      d: number,
      mat: THREE.Material,
      colliderId?: string,
      addSnap = false,
      snapSegments?: [number, number][],
    ) => {
      // Baseboard stub (always visible for room boundary clarity)
      const baseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, BASE_H, d),
        baseboardMat,
      );
      baseMesh.position.set(x, BASE_H / 2, z);
      group.add(baseMesh);

      // Upper wall section (from BASE_H to WALL_H = 3.25m)
      const upperMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, UPPER_H, d),
        mat,
      );
      upperMesh.position.set(x, UPPER_H / 2, z);
      upperMesh.userData = {kind: 'house_wall', wallId: sw.id};
      sw.upperGroup.add(upperMesh);
      clickTargets.push(upperMesh);

      colliders.push({type: 'box', id: colliderId, x, z, hw: w / 2, hd: d / 2});

      if (addSnap) {
        const thickness = sw.axis === 'z' ? d : w;
        if (snapSegments && snapSegments.length > 0) {
          snapSegments.forEach(([sMin, sMax], idx) => {
            wallSnapList.push({
              id: `${sw.id}_snap_${idx}`,
              axis: sw.axis,
              pos: sw.pos,
              minSpan: sMin,
              maxSpan: sMax,
              thickness,
              outerSide: sw.outerSide,
              isUp: () => sw.upperGroup.visible && sw.currentScaleY > 0.55,
            });
          });
        } else {
          const halfSpan = (sw.axis === 'z' ? w : d) / 2;
          const centerSpan = sw.axis === 'z' ? x : z;
          wallSnapList.push({
            id: `${sw.id}_snap`,
            axis: sw.axis,
            pos: sw.pos,
            minSpan: centerSpan - halfSpan + 0.45,
            maxSpan: centerSpan + halfSpan - 0.45,
            thickness,
            outerSide: sw.outerSide,
            isUp: () => sw.upperGroup.visible && sw.currentScaleY > 0.55,
          });
        }
      }
    };

    const addHeaderAboveOpening = (
      sw: SmartWallGroup,
      x: number,
      z: number,
      w: number,
      d: number,
      mat: THREE.Material,
    ) => {
      // Solid wall segment from DOOR_H (2.45m) up to WALL_H (3.25m)
      const upperWall = new THREE.Mesh(new THREE.BoxGeometry(w, HEADER_H, d), mat);
      upperWall.position.set(x, DOOR_H - BASE_H + HEADER_H / 2, z);
      sw.upperGroup.add(upperWall);

      // Decorative wood lintel at DOOR_H (2.45m)
      const lintelW = sw.axis === 'z' ? w + 0.16 : d + 0.1;
      const lintelD = sw.axis === 'z' ? d + 0.08 : w + 0.16;
      const lintel = new THREE.Mesh(
        new RoundedBoxGeometry(
          sw.axis === 'z' ? lintelW : lintelD,
          0.16,
          sw.axis === 'z' ? lintelD : lintelW,
          2,
          0.03,
        ),
        trimWoodMat,
      );
      lintel.position.set(x, DOOR_H - BASE_H + 0.04, z);
      sw.upperGroup.add(lintel);
    };

    // ---------- 1. OUTER PERIMETER WALLS (Uniform 3.25m height, smart cutaway) ----------
    const wallBack = createSmartWallGroup({
      id: 'wall_back',
      axis: 'z',
      pos: -9.5,
      minSpan: -13.5,
      maxSpan: 10.5,
      outerSide: -1,
    });
    addWallSegment(wallBack, -1.5, -9.5, 24.28, 0.28, outerWallMat, 'wall_back', true, [
      [-12.6, -5.5], // Bedroom back wall
      [-4.0, 3.3], // Back Room 2 back wall
      [4.7, 9.7], // Bathroom back wall
    ]);

    const wallLeft = createSmartWallGroup({
      id: 'wall_left',
      axis: 'x',
      pos: -13.5,
      minSpan: -9.5,
      maxSpan: 7.5,
      outerSide: -1,
    });
    addWallSegment(wallLeft, -13.5, -1.0, 0.28, 16.72, outerWallMat, 'wall_left', true, [
      [-8.7, -1.2], // Bedroom left wall
      [0.3, 6.7], // Living Room left wall
    ]);

    const wallRight = createSmartWallGroup({
      id: 'wall_right',
      axis: 'x',
      pos: 10.5,
      minSpan: -9.5,
      maxSpan: 7.5,
      outerSide: 1,
    });
    addWallSegment(wallRight, 10.5, -1.0, 0.28, 16.72, outerWallMat, 'wall_right', true, [
      [-8.7, -1.2], // Bathroom right wall
      [4.9, 6.8], // Kitchen right wall below counter
    ]);

    // Front wall with 2.45m exit doorway opening at X = -1.8 (hidden from default front camera!)
    const wallFront = createSmartWallGroup({
      id: 'wall_front',
      axis: 'z',
      pos: 7.5,
      minSpan: -13.5,
      maxSpan: 10.5,
      outerSide: 1,
      initHidden: true,
    });
    addWallSegment(wallFront, -8.27, 7.5, 10.74, 0.28, outerWallMat, 'wall_front_l', true, [
      [-12.6, -3.4],
    ]);
    addWallSegment(wallFront, 4.97, 7.5, 11.34, 0.28, outerWallMat, 'wall_front_r', true, [
      [-0.2, 3.4],
      [4.7, 9.7],
    ]);
    addHeaderAboveOpening(wallFront, -1.8, 7.5, 2.2, 0.28, outerWallMat);

    // ---------- 2. INTERIOR PARTITION WALLS (Uniform 3.25m height, 2.45m openings) ----------
    // Partition A: Living Room <-> Back-Left Bedroom (Z = -0.5, X: -13.5..-4.75) with door at X = -8.4
    const partBedroomFront = createSmartWallGroup({
      id: 'part_bed_front',
      axis: 'z',
      pos: -0.5,
      minSpan: -13.5,
      maxSpan: -4.75,
    });
    addWallSegment(partBedroomFront, -11.35, -0.5, 4.02, 0.24, innerWallMat, 'part_bed_1', true);
    addWallSegment(partBedroomFront, -6.105, -0.5, 2.71, 0.24, innerWallMat, 'part_bed_2', true);
    addHeaderAboveOpening(partBedroomFront, -8.4, -0.5, 1.88, 0.24, innerWallMat);

    // Partition B: Living Room <-> Back-Center Room (Z = -0.5, X: -4.75..+4.0) with door at X = -0.4
    const partBackFront = createSmartWallGroup({
      id: 'part_back_front',
      axis: 'z',
      pos: -0.5,
      minSpan: -4.75,
      maxSpan: 4.0,
    });
    addWallSegment(partBackFront, -3.045, -0.5, 3.41, 0.24, innerWallMat, 'part_back_1', true);
    addWallSegment(partBackFront, 2.27, -0.5, 3.46, 0.24, innerWallMat, 'part_back_2', true);
    addHeaderAboveOpening(partBackFront, -0.4, -0.5, 1.88, 0.24, innerWallMat);

    // Partition C: Divider between Bedroom & Back-Center Room (X = -4.75, Z: -9.5..-0.5)
    const partBackMid = createSmartWallGroup({
      id: 'part_back_mid',
      axis: 'x',
      pos: -4.75,
      minSpan: -9.5,
      maxSpan: -0.5,
    });
    addWallSegment(partBackMid, -4.75, -4.99, 0.24, 8.74, innerWallMat, 'part_back_mid', true);

    // Partition D: Living Room <-> Kitchen (X = +4.0, Z: -0.5..+7.5) with wide 2.45m-tall open archway (Z: +1.7..+4.7)
    const partKitchen = createSmartWallGroup({
      id: 'part_kitchen',
      axis: 'x',
      pos: 4.0,
      minSpan: -0.5,
      maxSpan: 7.5,
    });
    addWallSegment(partKitchen, 4.0, 0.66, 0.24, 2.08, innerWallMat, 'part_kit_1', true);
    addWallSegment(partKitchen, 4.0, 6.03, 0.24, 2.66, innerWallMat, 'part_kit_2', true);
    addHeaderAboveOpening(partKitchen, 4.0, 3.2, 0.24, 3.0, innerWallMat);
    [1.7, 4.7].forEach((az) => {
      const pillar = new THREE.Mesh(
        new RoundedBoxGeometry(0.3, DOOR_H - BASE_H, 0.16, 2, 0.03),
        trimWoodMat,
      );
      pillar.position.set(4.0, (DOOR_H - BASE_H) / 2, az);
      partKitchen.upperGroup.add(pillar);
    });

    // Partition E: Kitchen <-> Bathroom (Z = -0.5, X: +4.0..+10.5) with door at X = +5.45
    const partBathFront = createSmartWallGroup({
      id: 'part_bath_front',
      axis: 'z',
      pos: -0.5,
      minSpan: 4.0,
      maxSpan: 10.5,
    });
    addWallSegment(partBathFront, 4.335, -0.5, 0.43, 0.24, innerWallMat, 'part_bath_1', false);
    addWallSegment(partBathFront, 8.355, -0.5, 4.01, 0.24, innerWallMat, 'part_bath_2', true);
    addHeaderAboveOpening(partBathFront, 5.45, -0.5, 1.8, 0.24, innerWallMat);

    // Partition F: Back-Center Room <-> Bathroom (X = +4.0, Z: -9.5..-0.5)
    const partBackBath = createSmartWallGroup({
      id: 'part_back_bath',
      axis: 'x',
      pos: 4.0,
      minSpan: -9.5,
      maxSpan: -0.5,
    });
    addWallSegment(partBackBath, 4.0, -4.99, 0.24, 8.74, innerWallMat, 'part_back_bath', true);

    wallSurfaces = wallSnapList;

    // ========== 3 INTERACTIVE HINGED INTERIOR DOORS (2.42m tall, clear headroom) ==========
    const doorControllers: {
      handle: HouseDoorHandle;
      pivot: THREE.Group;
      closedAngle: number;
      openAngle: number;
      currentAngle: number;
      collider: WorldCollider;
    }[] = [];

    const createHingedDoor = (cfg: {
      id: string;
      label: string;
      hingeX: number;
      hingeZ: number;
      centerX: number;
      centerZ: number;
      width: number;
      openAngle: number;
      colHW: number;
      colHD: number;
      wallGroup: SmartWallGroup;
    }) => {
      const isOpenInit = Boolean(options.openDoors?.[cfg.id]);
      const pivot = new THREE.Group();
      pivot.position.set(cfg.hingeX, 0, cfg.hingeZ);

      const leafH = DOOR_H - 0.04; // 2.41m tall
      const panel = new THREE.Mesh(
        new RoundedBoxGeometry(cfg.width, leafH, 0.09, 2, 0.03),
        doorWoodMat,
      );
      panel.position.set(cfg.width / 2, leafH / 2, 0);

      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 7), handleGoldMat);
      knob.position.set(cfg.width - 0.18, 1.0, 0.07);
      pivot.add(panel, knob);
      pivot.rotation.y = isOpenInit ? cfg.openAngle : 0;
      group.add(pivot);
      cfg.wallGroup.attachedItems.push(pivot);

      const doorCollider: WorldCollider = {
        type: 'box',
        id: `col_${cfg.id}`,
        x: isOpenInit ? 9999 : cfg.centerX,
        z: isOpenInit ? 9999 : cfg.centerZ,
        hw: isOpenInit ? 0 : cfg.colHW,
        hd: isOpenInit ? 0 : cfg.colHD,
      };
      colliders.push(doorCollider);

      addBoxProxy(
        group,
        [cfg.width + 0.2, DOOR_H, 0.9],
        [cfg.centerX, DOOR_H / 2, cfg.centerZ],
        {kind: 'house_door', doorId: cfg.id},
        clickTargets,
      );

      const handle: HouseDoorHandle = {
        id: cfg.id,
        label: cfg.label,
        x: cfg.centerX,
        z: cfg.centerZ,
        isOpen: isOpenInit,
        setOpen: (open: boolean) => {
          handle.isOpen = open;
          if (open) {
            doorCollider.x = 9999;
            doorCollider.z = 9999;
            doorCollider.hw = 0;
            doorCollider.hd = 0;
          } else {
            doorCollider.x = cfg.centerX;
            doorCollider.z = cfg.centerZ;
            doorCollider.hw = cfg.colHW;
            doorCollider.hd = cfg.colHD;
          }
        },
      };

      doorControllers.push({
        handle,
        pivot,
        closedAngle: 0,
        openAngle: cfg.openAngle,
        currentAngle: isOpenInit ? cfg.openAngle : 0,
        collider: doorCollider,
      });
    };

    createHingedDoor({
      id: 'door_bedroom',
      label: 'Cửa Phòng Ngủ',
      hingeX: -9.32,
      hingeZ: -0.5,
      centerX: -8.4,
      centerZ: -0.5,
      width: 1.84,
      openAngle: 1.48,
      colHW: 0.96,
      colHD: 0.22,
      wallGroup: partBedroomFront,
    });

    createHingedDoor({
      id: 'door_back',
      label: 'Cửa Phòng Sau',
      hingeX: -1.32,
      hingeZ: -0.5,
      centerX: -0.4,
      centerZ: -0.5,
      width: 1.84,
      openAngle: 1.48,
      colHW: 0.96,
      colHD: 0.22,
      wallGroup: partBackFront,
    });

    createHingedDoor({
      id: 'door_bath',
      label: 'Cửa Phòng Tắm',
      hingeX: 4.57,
      hingeZ: -0.5,
      centerX: 5.45,
      centerZ: -0.5,
      width: 1.76,
      openAngle: 1.48,
      colHW: 0.92,
      colHD: 0.22,
      wallGroup: partBathFront,
    });

    doors = doorControllers.map((d) => d.handle);

    // ========== BUILT-IN LARGE L-SHAPED KITCHEN COUNTER (BỒN RỬA + BẾP TỪ ÂM + CHỖ TRỐNG) ==========
    {
      const kitchenCounter = new THREE.Group();
      const cabBodyMat = clayMat('#F4EBDC', 0.72);
      const cabDoorMat = clayMat('#DFCEB4', 0.68);
      const marbleTopMat = glossyClayMat('#FAF8F5', 0.28);
      const metalMat = clayMat('#CFD8E0', 0.25, 0.72);
      const stoveGlassMat = glossyClayMat('#1E2532', 0.14);

      // Back wing along Z = +0.16 (X: 6.75 to 10.3, flush against Z = -0.5 wall)
      const backBase = new THREE.Mesh(
        new RoundedBoxGeometry(3.55, 0.84, 1.0, 2, 0.04),
        cabBodyMat,
      );
      backBase.position.set(8.52, 0.42, 0.16);
      const backTop = new THREE.Mesh(
        new RoundedBoxGeometry(3.62, 0.08, 1.08, 2, 0.03),
        marbleTopMat,
      );
      backTop.position.set(8.52, 0.88, 0.16);

      // Right wing along X = +9.82 (Z: +0.66 to +4.95, flush against X = +10.5 outer wall)
      const rightBase = new THREE.Mesh(
        new RoundedBoxGeometry(1.0, 0.84, 4.28, 2, 0.04),
        cabBodyMat,
      );
      rightBase.position.set(9.82, 0.42, 2.8);
      const rightTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.08, 0.08, 4.36, 2, 0.03),
        marbleTopMat,
      );
      rightTop.position.set(9.82, 0.88, 2.8);

      [7.2, 8.05, 8.9].forEach((cx) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.68, 0.66, 0.05, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(cx, 0.42, 0.68);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(cx + 0.22, 0.52, 0.72);
        kitchenCounter.add(dPanel, knob);
      });
      [1.35, 2.25, 3.15, 4.05].forEach((cz) => {
        const dPanel = new THREE.Mesh(
          new RoundedBoxGeometry(0.05, 0.66, 0.72, 2, 0.02),
          cabDoorMat,
        );
        dPanel.position.set(9.3, 0.42, cz);
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), handleGoldMat);
        knob.position.set(9.26, 0.52, cz + 0.24);
        kitchenCounter.add(dPanel, knob);
      });

      // 1. Stainless Steel Sink + Gooseneck Faucet (on back wing at X = 7.65, Z = +0.16)
      const sinkRim = new THREE.Mesh(
        new RoundedBoxGeometry(1.02, 0.04, 0.68, 2, 0.02),
        metalMat,
      );
      sinkRim.position.set(7.65, 0.92, 0.16);
      const sinkBasin = new THREE.Mesh(
        new THREE.BoxGeometry(0.84, 0.05, 0.52),
        clayMat('#8D9AA6', 0.35, 0.5),
      );
      sinkBasin.position.set(7.65, 0.925, 0.16);
      const faucetBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8),
        metalMat,
      );
      faucetBase.position.set(7.65, 1.06, -0.16);
      const faucetNeck = new THREE.Mesh(
        new THREE.TorusGeometry(0.11, 0.025, 6, 10, Math.PI),
        metalMat,
      );
      faucetNeck.rotation.y = Math.PI / 2;
      faucetNeck.position.set(7.65, 1.2, -0.05);

      // 2. Built-in Black Glass Induction Cooktop (on right wing at X = 9.82, Z = +2.25)
      const stoveBase = new THREE.Mesh(
        new RoundedBoxGeometry(0.76, 0.03, 1.25, 2, 0.02),
        stoveGlassMat,
      );
      stoveBase.position.set(9.82, 0.93, 2.25);
      [1.92, 2.58].forEach((bz) => {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.15, 0.19, 16),
          new THREE.MeshBasicMaterial({color: '#6BC5F2'}),
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(9.82, 0.95, bz);
        kitchenCounter.add(ring);
      });

      kitchenCounter.add(
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
      group.add(kitchenCounter);

      colliders.push({type: 'box', id: 'kitchen_back', x: 8.52, z: 0.16, hw: 1.82, hd: 0.56});
      colliders.push({type: 'box', id: 'kitchen_right', x: 9.82, z: 2.8, hw: 0.56, hd: 2.22});
    }

    // ========== DYNAMIC PLACED FURNITURE ITEMS (FLOOR + WALL MOUNT) ==========
    const placedList = options.placedFurniture || [];
    placedList.forEach((pf) => {
      const cat = FURNITURE_BY_ID[pf.catalogId];
      if (!cat) return;

      const meshGroup = buildFurnitureMesh(cat);
      meshGroup.position.set(pf.x, 0, pf.z);
      meshGroup.rotation.y = pf.rotY;
      group.add(meshGroup);

      // Associate wall-mounted items (windows, wall clock) with their host SmartWall so they hide cleanly together
      if (cat.wallMount) {
        let bestWall: SmartWallGroup | null = null;
        let bestDist = 0.65;
        for (const sw of smartWalls) {
          const d = sw.axis === 'z' ? Math.abs(pf.z - sw.pos) : Math.abs(pf.x - sw.pos);
          const span = sw.axis === 'z' ? pf.x : pf.z;
          if (d < bestDist && span >= sw.minSpan - 0.3 && span <= sw.maxSpan + 0.3) {
            bestDist = d;
            bestWall = sw;
          }
        }
        if (bestWall) {
          bestWall.attachedItems.push(meshGroup);
          meshGroup.visible = bestWall.upperGroup.visible;
        }
      }

      const sinR = Math.sin(pf.rotY);
      const cosR = Math.cos(pf.rotY);
      const toWorld = (lx: number, lz: number) => ({
        wx: pf.x + lx * cosR + lz * sinR,
        wz: pf.z - lx * sinR + lz * cosR,
      });

      let proxyData: Record<string, unknown> = {
        kind: 'furniture',
        furnitureId: pf.instanceId,
        catalogId: pf.catalogId,
      };

      if (cat.interactive === 'sofa') {
        const front = toWorld(0, cat.halfD + 0.45);
        proxyData = {
          kind: 'sofa',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: front.wx,
          tz: front.wz,
          seatX: pf.x,
          seatZ: pf.z,
          seatY: 0.58,
          sitRotY: pf.rotY,
          colliderId: pf.instanceId,
        };
      } else if (cat.interactive === 'bed') {
        const side = toWorld(-(cat.halfW + 0.48), 0.35);
        proxyData = {
          kind: 'bed',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: side.wx,
          tz: side.wz,
          seatX: pf.x,
          seatZ: pf.z,
          seatY: 0.65,
          sitRotY: pf.rotY,
          colliderId: pf.instanceId,
        };
      } else if (cat.interactive === 'wardrobe') {
        const front = toWorld(0, cat.halfD + 0.58);
        proxyData = {
          kind: 'wardrobe',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: front.wx,
          tz: front.wz,
        };
      }

      const proxyCenterY = cat.wallMount ? (cat.mountHeight ?? 1.8) : 0.9;
      addBoxProxy(
        meshGroup,
        [Math.max(0.9, cat.halfW * 2), 1.8, Math.max(0.6, cat.halfD * 2)],
        [0, proxyCenterY, 0],
        proxyData,
        clickTargets,
      );

      if (!cat.walkable) {
        colliders.push({
          type: 'box',
          id: pf.instanceId,
          x: pf.x,
          z: pf.z,
          hw: cat.halfW,
          hd: cat.halfD,
          rotY: pf.rotY,
        });
      }
    });

    // Exit Doorway at Front Living Room Entrance
    group.add(createExitDoorway('Ra Thị Trấn', [-1.8, 0, 6.8], '#C9735B', clickTargets, labelAnchors));

    let prevElapsed = 0;
    updateFn = (elapsed, _tod, context) => {
      const dt = Math.min(Math.max(elapsed - prevElapsed, 0.001), 0.05);
      prevElapsed = elapsed;

      // 1. Smooth door swing animation
      for (const dc of doorControllers) {
        const target = dc.handle.isOpen ? dc.openAngle : dc.closedAngle;
        if (Math.abs(dc.currentAngle - target) > 0.002) {
          dc.currentAngle = THREE.MathUtils.damp(dc.currentAngle, target, 9, dt);
          dc.pivot.rotation.y = dc.currentAngle;
        }
      }

      // 2. Smart Wall Cutaway (Outer camera-facing walls + interior walls occluding the avatar)
      const camPos = context?.cameraPos;
      const pPos = context?.playerPos;
      if (camPos) {
        for (const sw of smartWalls) {
          let shouldHide = false;

          if (sw.outerSide !== undefined) {
            if (sw.axis === 'z') {
              shouldHide =
                sw.outerSide === 1 ? camPos.z > sw.pos - 2.2 : camPos.z < sw.pos + 2.2;
            } else {
              shouldHide =
                sw.outerSide === 1 ? camPos.x > sw.pos - 2.2 : camPos.x < sw.pos + 2.2;
            }
          } else if (pPos) {
            if (sw.axis === 'z') {
              const denom = pPos.z - camPos.z;
              if (Math.abs(denom) > 0.001) {
                const t = (sw.pos - camPos.z) / denom;
                if (t > 0.02 && t < 0.995) {
                  const crossX = camPos.x + (pPos.x - camPos.x) * t;
                  const crossY = camPos.y + (0.35 - camPos.y) * t;
                  if (
                    crossX >= sw.minSpan - 1.4 &&
                    crossX <= sw.maxSpan + 1.4 &&
                    crossY < WALL_H + 0.35
                  ) {
                    shouldHide = true;
                  }
                }
              }
              if (
                !shouldHide &&
                Math.sign(camPos.z - sw.pos) !== Math.sign(pPos.z - sw.pos) &&
                Math.abs(pPos.z - sw.pos) < 1.9 &&
                pPos.x >= sw.minSpan - 1.1 &&
                pPos.x <= sw.maxSpan + 1.1
              ) {
                shouldHide = true;
              }
            } else {
              const denom = pPos.x - camPos.x;
              if (Math.abs(denom) > 0.001) {
                const t = (sw.pos - camPos.x) / denom;
                if (t > 0.02 && t < 0.995) {
                  const crossZ = camPos.z + (pPos.z - camPos.z) * t;
                  const crossY = camPos.y + (0.35 - camPos.y) * t;
                  if (
                    crossZ >= sw.minSpan - 1.4 &&
                    crossZ <= sw.maxSpan + 1.4 &&
                    crossY < WALL_H + 0.35
                  ) {
                    shouldHide = true;
                  }
                }
              }
              if (
                !shouldHide &&
                Math.sign(camPos.x - sw.pos) !== Math.sign(pPos.x - sw.pos) &&
                Math.abs(pPos.x - sw.pos) < 1.9 &&
                pPos.z >= sw.minSpan - 1.1 &&
                pPos.z <= sw.maxSpan + 1.1
              ) {
                shouldHide = true;
              }
            }
          }

          const targetScale = shouldHide ? 0.001 : 1;
          if (Math.abs(sw.currentScaleY - targetScale) > 0.002) {
            sw.currentScaleY = THREE.MathUtils.damp(sw.currentScaleY, targetScale, 12, dt);
            sw.upperGroup.scale.y = sw.currentScaleY;
          }
          const isVis = sw.currentScaleY > 0.04;
          sw.upperGroup.visible = isVis;
          const itemsVis = sw.currentScaleY > 0.55;
          for (const item of sw.attachedItems) {
            item.visible = itemsVis;
          }
        }
      }
    };
  } else if (zone === 'garden') {
    // Spacious Open Farm Estate (54m x 40m) — lush grass, tall trees, 2 wide coops with low fences, big fish pond + bridge, back workshop row + mini warehouse & 20 crop beds
    const farmGrassTex = createGrassTexture();
    farmGrassTex.repeat.set(13, 10);
    disposables.push(farmGrassTex);

    const grassFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(54.0, 40.0),
      new THREE.MeshStandardMaterial({map: farmGrassTex, roughness: 0.88, metalness: 0}),
    );
    grassFloor.rotation.x = -Math.PI / 2;
    grassFloor.userData = {kind: 'ground'};
    groundMesh = grassFloor;
    group.add(grassFloor);

    // Sparse Town-Style Natural Stepping Stones directly on the grass (1 lightweight InstancedMesh draw call)
    const stepStoneSpots: [number, number, number, number][] = [];
    // Main center north-south stepping stones
    for (let i = 0, pz = -4.2; pz <= 12.2; i++, pz += 1.18) {
      const sx = (i % 2 === 0 ? -0.44 : 0.44) + ((i % 3) - 1) * 0.08;
      const scale = 0.88 + (i % 3) * 0.14;
      stepStoneSpots.push([sx, pz, scale, (i * 0.55) % (Math.PI * 2)]);
    }
    // East-west workshop cross-path stepping stones
    for (let i = 0; i < 24; i++) {
      const px = -12.6 + i * 1.22;
      if (px > 15.2) break;
      if (Math.abs(px) < 1.15) continue;
      const sz = -4.8 + (i % 2 === 0 ? -0.36 : 0.36);
      const scale = 0.86 + ((i + 1) % 3) * 0.12;
      stepStoneSpots.push([px, sz, scale, (i * 0.72) % (Math.PI * 2)]);
    }
    // Branches to Poultry Coop, Cattle Barn & Fish Pond Bridge
    for (const [bx, bz, s, rot] of [
      [-6.8, -0.6, 0.94, 0.3],
      [-7.9, -0.9, 1.05, 1.1],
      [-9.0, -0.5, 0.9, 2.0],
      [-6.8, 6.8, 1.0, 0.6],
      [-7.9, 6.4, 0.92, 1.4],
      [-9.0, 6.8, 1.04, 2.5],
      [6.8, 2.75, 0.95, 0.4],
      [7.85, 3.2, 1.06, 1.3],
      [8.8, 2.95, 0.98, 2.1],
    ] as [number, number, number, number][]) {
      stepStoneSpots.push([bx, bz, s, rot]);
    }

    const stepStoneGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.055, 9);
    const stepStoneMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.84});
    const stepStoneIM = new THREE.InstancedMesh(stepStoneGeo, stepStoneMat, stepStoneSpots.length);
    const stoneDummy = new THREE.Object3D();
    const stoneCol = new THREE.Color();
    const stonePalette = ['#E4D6C0', '#D6C5AC', '#EBE0CD', '#CBBBA2'];
    stepStoneSpots.forEach(([sx, sz, s, rot], i) => {
      stoneDummy.position.set(sx, 0.025, sz);
      stoneDummy.rotation.set(0, rot, 0);
      stoneDummy.scale.set(s * (1 + (i % 2) * 0.16), 1, s * 0.86);
      stoneDummy.updateMatrix();
      stepStoneIM.setMatrixAt(i, stoneDummy.matrix);
      stoneCol.set(stonePalette[i % stonePalette.length]);
      stepStoneIM.setColorAt(i, stoneCol);
    });
    stepStoneIM.instanceMatrix.needsUpdate = true;
    if (stepStoneIM.instanceColor) stepStoneIM.instanceColor.needsUpdate = true;
    stepStoneIM.computeBoundingSphere();
    group.add(stepStoneIM);

    // Tall broad-canopy trees surrounding the expanded Farm Estate perimeter (3 draw calls total!)
    const {trunkGeo, lowerCanopyGeo, upperCanopyGeo} = createTreeGeometries();
    const farmTreeList: [number, number, number][] = [
      // Back grove (-Z)
      [-23.5, -17.2, 1.72],
      [-17.5, -17.4, 1.62],
      [-11.5, -17.5, 1.7],
      [-5.5, -17.6, 1.66],
      [0.5, -17.6, 1.76],
      [6.5, -17.5, 1.64],
      [12.5, -17.4, 1.6],
      [18.5, -17.3, 1.7],
      [23.8, -17.0, 1.74],
      // Left forest border (-X)
      [-24.2, -12.2, 1.68],
      [-24.4, -5.8, 1.76],
      [-24.4, 0.8, 1.66],
      [-24.2, 7.4, 1.72],
      [-23.6, 13.8, 1.62],
      // Right forest border (+X)
      [24.0, -12.0, 1.68],
      [24.4, -5.6, 1.75],
      [24.4, 1.0, 1.66],
      [24.2, 7.6, 1.7],
      [23.5, 13.8, 1.6],
      // Front corner shade trees flanking the entrance (clear of center gate)
      [-19.2, 16.0, 1.6],
      [-12.8, 16.2, 1.54],
      [-6.8, 16.4, 1.5],
      [6.8, 16.4, 1.52],
      [12.8, 16.2, 1.56],
      [19.2, 16.0, 1.62],
    ];
    const treeTrunkIM = new THREE.InstancedMesh(
      trunkGeo,
      clayMat('#7B5337', 0.82),
      farmTreeList.length,
    );
    const treeLowerIM = new THREE.InstancedMesh(
      lowerCanopyGeo,
      new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.74}),
      farmTreeList.length,
    );
    const treeUpperIM = new THREE.InstancedMesh(
      upperCanopyGeo,
      new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.7}),
      farmTreeList.length,
    );
    const farmDummy = new THREE.Object3D();
    const farmLeafCol = new THREE.Color();
    const farmLowerPal = ['#529B59', '#5CA561', '#4C9354', '#60AC66'];
    const farmUpperPal = ['#6EC274', '#79CA7F', '#66B96D', '#80D085'];
    farmTreeList.forEach(([tx, tz, ts], i) => {
      farmDummy.position.set(tx, 0, tz);
      farmDummy.rotation.set(0, (i * 1.41) % (Math.PI * 2), 0);
      farmDummy.scale.setScalar(ts);
      farmDummy.updateMatrix();
      treeTrunkIM.setMatrixAt(i, farmDummy.matrix);
      treeLowerIM.setMatrixAt(i, farmDummy.matrix);
      treeUpperIM.setMatrixAt(i, farmDummy.matrix);
      farmLeafCol.set(farmLowerPal[i % farmLowerPal.length]);
      treeLowerIM.setColorAt(i, farmLeafCol);
      farmLeafCol.set(farmUpperPal[i % farmUpperPal.length]);
      treeUpperIM.setColorAt(i, farmLeafCol);
      colliders.push({type: 'circle', x: tx, z: tz, r: 0.45 * ts});
    });
    treeTrunkIM.instanceMatrix.needsUpdate = true;
    treeLowerIM.instanceMatrix.needsUpdate = true;
    treeUpperIM.instanceMatrix.needsUpdate = true;
    if (treeLowerIM.instanceColor) treeLowerIM.instanceColor.needsUpdate = true;
    if (treeUpperIM.instanceColor) treeUpperIM.instanceColor.needsUpdate = true;
    group.add(treeTrunkIM, treeLowerIM, treeUpperIM);

    // Helper for small wooden fences (used for crop borders & low symbolic pasture borders)
    const picketWoodMat = clayMat('#F7ECD9', 0.72);
    const railWoodMat = clayMat('#DFCAA8', 0.74);
    const ranchPostMat = clayMat('#9E6B40', 0.78);
    const ranchRailMat = clayMat('#BD8756', 0.74);

    const buildPicketRunX = (xStart: number, xEnd: number, zPos: number) => {
      const len = Math.abs(xEnd - xStart);
      const midX = (xStart + xEnd) / 2;
      const rail = new THREE.Mesh(new RoundedBoxGeometry(len, 0.08, 0.08, 2, 0.02), railWoodMat);
      rail.position.set(midX, 0.34, zPos);
      group.add(rail);
      const count = Math.max(2, Math.round(len / 0.75) + 1);
      for (let i = 0; i < count; i++) {
        const px = xStart + (i / (count - 1)) * (xEnd - xStart);
        const picket = new THREE.Mesh(
          new RoundedBoxGeometry(0.14, 0.56, 0.1, 2, 0.03),
          picketWoodMat,
        );
        picket.position.set(px, 0.28, zPos);
        group.add(picket);
      }
      colliders.push({type: 'box', x: midX, z: zPos, hw: len / 2 + 0.08, hd: 0.16});
    };

    // Low symbolic ranch fences (~0.42m posts + single low rail at y=0.25) so coops stay open & airy
    const buildRanchFenceX = (xStart: number, xEnd: number, zPos: number) => {
      const len = Math.abs(xEnd - xStart);
      const midX = (xStart + xEnd) / 2;
      const railLow = new THREE.Mesh(new RoundedBoxGeometry(len, 0.07, 0.07, 2, 0.02), ranchRailMat);
      railLow.position.set(midX, 0.25, zPos);
      group.add(railLow);
      const count = Math.max(2, Math.round(len / 1.75) + 1);
      for (let i = 0; i < count; i++) {
        const px = xStart + (i / (count - 1)) * (xEnd - xStart);
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), ranchPostMat);
        post.position.set(px, 0.21, zPos);
        group.add(post);
      }
      colliders.push({type: 'box', x: midX, z: zPos, hw: len / 2 + 0.06, hd: 0.14});
    };

    const buildRanchFenceZ = (xPos: number, zStart: number, zEnd: number) => {
      const len = Math.abs(zEnd - zStart);
      const midZ = (zStart + zEnd) / 2;
      const railLow = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.07, len, 2, 0.02), ranchRailMat);
      railLow.position.set(xPos, 0.25, midZ);
      group.add(railLow);
      const count = Math.max(2, Math.round(len / 1.75) + 1);
      for (let i = 0; i < count; i++) {
        const pz = zStart + (i / (count - 1)) * (zEnd - zStart);
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), ranchPostMat);
        post.position.set(xPos, 0.21, pz);
        group.add(post);
      }
      colliders.push({type: 'box', x: xPos, z: midZ, hw: 0.14, hd: len / 2 + 0.06});
    };

    // === 1. BẾP NÔNG TRẠI CÓ MÁI CHE DỄ THƯƠNG (Back Center: X = 0, Z = -8.8) ===
    const kitchenCottage = new THREE.Group();
    kitchenCottage.position.set(0, 0, -8.8);

    const kDeck = new THREE.Mesh(
      new RoundedBoxGeometry(4.8, 0.18, 3.6, 2, 0.05),
      clayMat('#D9C3A3', 0.8),
    );
    kDeck.position.y = 0.09;
    const kStep = new THREE.Mesh(
      new RoundedBoxGeometry(2.2, 0.12, 0.55, 2, 0.04),
      clayMat('#C7B293', 0.82),
    );
    kStep.position.set(0, 0.06, 2.02);

    // 4 Timber Posts + Back Half-Wall
    const timberMat = clayMat('#9E673D', 0.68);
    [
      [-2.1, -1.5],
      [2.1, -1.5],
      [-2.1, 1.5],
      [2.1, 1.5],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new RoundedBoxGeometry(0.22, 2.45, 0.22, 2, 0.04), timberMat);
      post.position.set(px, 1.32, pz);
      kitchenCottage.add(post);
    });

    const backWall = new THREE.Mesh(
      new RoundedBoxGeometry(4.25, 1.45, 0.22, 2, 0.04),
      clayMat('#FFF5E4', 0.78),
    );
    backWall.position.set(0, 0.88, -1.52);

    // Cute Pitched Gable Cottage Roof + Brick Chimney
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-2.75, 0);
    roofShape.lineTo(0, 1.55);
    roofShape.lineTo(2.75, 0);
    roofShape.closePath();
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
      depth: 4.15,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 2,
    });
    roofGeo.center();
    const kRoof = new THREE.Mesh(roofGeo, clayMat('#DC745B', 0.62));
    kRoof.position.set(0, 3.15, 0);

    const fasciaFront = new THREE.Mesh(
      new RoundedBoxGeometry(5.1, 0.16, 0.16, 2, 0.04),
      clayMat('#FFF8EC', 0.68),
    );
    fasciaFront.position.set(0, 2.46, 1.98);
    const roofSign = new THREE.Mesh(
      new RoundedBoxGeometry(1.5, 0.36, 0.14, 2, 0.04),
      clayMat('#7BAE7F', 0.64),
    );
    roofSign.position.set(0, 2.66, 2.04);

    const kChimney = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 1.35, 0.56, 2, 0.05),
      clayMat('#A95948', 0.76),
    );
    kChimney.position.set(1.45, 3.62, -0.75);
    const kChimneyCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.7, 0.14, 0.7, 2, 0.04),
      clayMat('#C9B8A3', 0.76),
    );
    kChimneyCap.position.set(1.45, 4.32, -0.75);

    // Interior Kitchen Equipment (Wood Counter, Brick Oven Dome, Golden Soup Pot, Warm Lantern)
    const kCounterBase = new THREE.Mesh(
      new RoundedBoxGeometry(3.5, 0.85, 0.95, 2, 0.06),
      clayMat('#DF9369', 0.64),
    );
    kCounterBase.position.set(0, 0.58, -0.72);
    const kCounterTop = new THREE.Mesh(
      new RoundedBoxGeometry(3.66, 0.12, 1.08, 2, 0.04),
      clayMat('#FFF9EF', 0.5),
    );
    kCounterTop.position.set(0, 1.04, -0.72);
    const kOvenDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.52, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56),
      clayMat('#C4634C', 0.66),
    );
    kOvenDome.position.set(-1.05, 1.08, -0.76);
    const kSoupPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.25, 0.3, 12),
      glossyClayMat('#E8B84B', 0.25),
    );
    kSoupPot.position.set(0.15, 1.24, -0.7);
    const kBread = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.14, 0.24, 5, 8),
      clayMat('#E29D54', 0.6),
    );
    kBread.rotation.z = Math.PI / 2;
    kBread.position.set(1.12, 1.2, -0.68);
    const kLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 9, 9),
      new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.45,
        roughness: 0.25,
      }),
    );
    kLantern.position.set(0, 2.24, 0.55);

    kitchenCottage.add(
      kDeck,
      kStep,
      backWall,
      kRoof,
      fasciaFront,
      roofSign,
      kChimney,
      kChimneyCap,
      kCounterBase,
      kCounterTop,
      kOvenDome,
      kSoupPot,
      kBread,
      kLantern,
    );
    addBoxProxy(
      kitchenCottage,
      [4.8, 3.8, 3.7],
      [0, 1.8, 0],
      {kind: 'farm_kitchen', tx: 0, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -8.8, hw: 2.45, hd: 1.85});
    labelAnchors.push({
      id: 'farm_kitchen',
      label: 'Bếp Nông Trại',
      worldPos: new THREE.Vector3(0, 4.25, -8.8),
    });
    group.add(kitchenCottage);

    // === 2. MÁY ÉP & XAY CÓ MÁI CHE (Back Left: X = -6.6, Z = -8.6) ===
    const millShed = new THREE.Group();
    millShed.position.set(-6.6, 0, -8.6);
    const mDeck = new THREE.Mesh(
      new RoundedBoxGeometry(3.2, 0.14, 2.5, 2, 0.04),
      clayMat('#D9C3A3', 0.8),
    );
    mDeck.position.y = 0.07;
    [
      [-1.38, -1.02],
      [1.38, -1.02],
      [-1.38, 1.02],
      [1.38, 1.02],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.1, 0.18, 2, 0.03), timberMat);
      p.position.set(px, 1.12, pz);
      millShed.add(p);
    });
    const mRoof = new THREE.Mesh(
      new RoundedBoxGeometry(3.55, 0.22, 2.85, 2, 0.06),
      clayMat('#669C72', 0.64),
    );
    mRoof.position.set(0, 2.24, 0);
    mRoof.rotation.x = 0.08;
    const millBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.2, 0.84, 1.18, 3, 0.08),
      clayMat('#7EA468', 0.62),
    );
    millBase.position.set(0, 0.54, -0.1);
    const millCounter = new THREE.Mesh(
      new RoundedBoxGeometry(2.34, 0.12, 1.3, 2, 0.04),
      clayMat('#E8C398', 0.56),
    );
    millCounter.position.set(0, 0.98, -0.1);
    const rollerFrame = new THREE.Mesh(
      new RoundedBoxGeometry(0.9, 0.68, 0.72, 2, 0.05),
      clayMat('#526478', 0.42),
    );
    rollerFrame.position.set(-0.45, 1.36, -0.15);
    const hopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.2, 0.5, 10),
      clayMat('#D99B58', 0.52),
    );
    hopper.position.set(0.55, 1.3, -0.15);
    const wheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.06, 8, 16),
      clayMat('#D96D56', 0.45),
    );
    wheel.position.set(-0.45, 1.36, 0.26);
    millShed.add(mDeck, mRoof, millBase, millCounter, rollerFrame, hopper, wheel);
    addBoxProxy(
      millShed,
      [3.3, 2.6, 2.6],
      [0, 1.25, 0],
      {kind: 'farm_mill', tx: -6.6, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: -6.6, z: -8.6, hw: 1.65, hd: 1.3});
    labelAnchors.push({
      id: 'farm_mill',
      label: 'Máy Ép & Xay',
      worldPos: new THREE.Vector3(-6.6, 2.75, -8.6),
    });
    group.add(millShed);

    // === 3. GIẾNG NƯỚC ĐÁ XẾP MÁI NGÓI CỔ TÍCH (Back Far Left: X = -12.6, Z = -8.2) ===
    const well = new THREE.Group();
    well.position.set(-12.6, 0, -8.2);
    const wellApron = new THREE.Mesh(
      new THREE.CylinderGeometry(1.18, 1.24, 0.08, 16),
      clayMat('#D7C7AE', 0.88),
    );
    wellApron.position.y = 0.04;
    const wellCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.74, 0.8, 0.72, 14),
      clayMat('#8D969E', 0.84),
    );
    wellCore.position.y = 0.4;
    // Outer ring of 12 rustic beveled cobble bricks
    const wellBrickColors = ['#A8B1B8', '#98A2AB', '#B7BEC4', '#8A949E'];
    for (let bi = 0; bi < 12; bi++) {
      const ang = (bi / 12) * Math.PI * 2;
      const brick = new THREE.Mesh(
        new RoundedBoxGeometry(0.36, 0.24, 0.22, 2, 0.04),
        clayMat(wellBrickColors[bi % wellBrickColors.length], 0.82),
      );
      brick.position.set(Math.sin(ang) * 0.78, 0.24 + (bi % 2) * 0.24, Math.cos(ang) * 0.78);
      brick.rotation.y = ang;
      well.add(brick);
    }
    const wellCoping = new THREE.Mesh(
      new THREE.TorusGeometry(0.76, 0.12, 8, 18),
      clayMat('#C4B9A5', 0.78),
    );
    wellCoping.rotation.x = Math.PI / 2;
    wellCoping.position.y = 0.76;
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.64, 0.06, 16),
      glossyClayMat('#3AB7E2', 0.1),
    );
    wellWater.position.y = 0.66;

    // Timber uprights, knee braces & crossbeam
    const wellPostL = new THREE.Mesh(new RoundedBoxGeometry(0.14, 1.52, 0.14, 2, 0.03), timberMat);
    wellPostL.position.set(-0.78, 1.48, 0);
    const wellPostR = wellPostL.clone();
    wellPostR.position.x = 0.78;
    const wellBraceL = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.42, 0.1, 2, 0.02), timberMat);
    wellBraceL.position.set(-0.6, 1.88, 0);
    wellBraceL.rotation.z = -0.65;
    const wellBraceR = wellBraceL.clone();
    wellBraceR.position.x = 0.6;
    wellBraceR.rotation.z = 0.65;

    // Pitched shingle gable roof + cream pediment
    const wellRoofShape = new THREE.Shape();
    wellRoofShape.moveTo(-1.12, 0);
    wellRoofShape.lineTo(0, 0.74);
    wellRoofShape.lineTo(1.12, 0);
    wellRoofShape.closePath();
    const wellRoofGeo = new THREE.ExtrudeGeometry(wellRoofShape, {
      depth: 1.54,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    wellRoofGeo.center();
    const wellRoof = new THREE.Mesh(wellRoofGeo, clayMat('#C96A4F', 0.66));
    wellRoof.rotation.y = Math.PI / 2;
    wellRoof.position.y = 2.36;
    const wellRidge = new THREE.Mesh(
      new RoundedBoxGeometry(1.68, 0.12, 0.14, 2, 0.03),
      clayMat('#9F4A36', 0.62),
    );
    wellRidge.position.y = 2.74;

    // Windlass roller + crank + hanging wooden rope bucket
    const windlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.56, 10),
      clayMat('#9E6B40', 0.72),
    );
    windlass.rotation.z = Math.PI / 2;
    windlass.position.y = 1.66;
    const crankArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.06, 0.24, 0.06, 2, 0.02),
      clayMat('#4F5861', 0.48),
    );
    crankArm.position.set(0.92, 1.58, 0.06);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.54, 6),
      clayMat('#E2C892', 0.85),
    );
    rope.position.set(0, 1.38, 0);
    const hangBucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10),
      clayMat('#AA7041', 0.72),
    );
    hangBucket.position.set(0, 1.04, 0);
    const bucketRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.02, 6, 12),
      clayMat('#5E6873', 0.42),
    );
    bucketRim.rotation.x = Math.PI / 2;
    bucketRim.position.set(0, 1.14, 0);
    const groundBucket = hangBucket.clone();
    groundBucket.position.set(0.76, 0.2, 0.68);
    groundBucket.scale.setScalar(0.9);

    well.add(
      wellApron,
      wellCore,
      wellCoping,
      wellWater,
      wellPostL,
      wellPostR,
      wellBraceL,
      wellBraceR,
      wellRoof,
      wellRidge,
      windlass,
      crankArm,
      rope,
      hangBucket,
      bucketRim,
      groundBucket,
    );
    addBoxProxy(well, [2.1, 2.6, 2.1], [0, 1.2, 0], {kind: 'well', tx: -11.0, tz: -5.6}, clickTargets);
    colliders.push({type: 'circle', x: -12.6, z: -8.2, r: 1.05});
    labelAnchors.push({id: 'well', label: 'Giếng Nước', worldPos: new THREE.Vector3(-12.6, 2.95, -8.2)});
    group.add(well);

    // === 4A. BẢNG ĐƠN HÀNG (Back Right: X = 5.2, Z = -8.4) ===
    const board = new THREE.Group();
    board.position.set(5.2, 0, -8.4);
    const postL = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.0, 0.18, 2, 0.03), clayMat('#8C5D38'));
    postL.position.set(-0.95, 1.0, 0);
    const postR = postL.clone();
    postR.position.set(0.95, 1.0, 0);
    const boardPanel = new THREE.Mesh(
      new RoundedBoxGeometry(2.25, 1.32, 0.16, 2, 0.04),
      clayMat('#C9925D', 0.65),
    );
    boardPanel.position.set(0, 1.45, 0);
    const boardCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.55, 0.18, 0.85, 2, 0.04),
      clayMat('#D8725A', 0.64),
    );
    boardCanopy.position.set(0, 2.24, 0.15);
    boardCanopy.rotation.x = 0.16;
    const slip1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.04), clayMat('#FFF8E6'));
    slip1.position.set(-0.6, 1.5, 0.09);
    const slip2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.04), clayMat('#FFE4E8'));
    slip2.position.set(0, 1.46, 0.09);
    const slip3 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.54, 0.04), clayMat('#E5F4EC'));
    slip3.position.set(0.6, 1.52, 0.09);
    const crate = new THREE.Mesh(
      new RoundedBoxGeometry(0.92, 0.5, 0.68, 2, 0.04),
      clayMat('#B57B4C', 0.72),
    );
    crate.position.set(0, 0.25, 0.42);
    board.add(postL, postR, boardPanel, boardCanopy, slip1, slip2, slip3, crate);
    addBoxProxy(
      board,
      [2.5, 2.4, 1.6],
      [0, 1.15, 0.15],
      {kind: 'order_board', tx: 5.2, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 5.2, z: -8.4, hw: 1.3, hd: 0.75});
    labelAnchors.push({
      id: 'order_board',
      label: 'Bảng Đơn Hàng',
      worldPos: new THREE.Vector3(5.2, 2.65, -8.4),
    });
    group.add(board);

    // === 4B. NHÀ KHO BÉ BÊN CẠNH BẢNG ĐƠN HÀNG (X = 9.0, Z = -8.5) ===
    const storageShed = new THREE.Group();
    storageShed.position.set(9.0, 0, -8.5);
    const sDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.45, 0.14, 2.05, 2, 0.04),
      clayMat('#D9C3A3', 0.8),
    );
    sDeck.position.y = 0.07;
    const sWalls = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 1.32, 1.72, 2, 0.05),
      clayMat('#FFF2DD', 0.76),
    );
    sWalls.position.y = 0.78;
    const sRoofShape = new THREE.Shape();
    sRoofShape.moveTo(-1.35, 0);
    sRoofShape.lineTo(0, 0.92);
    sRoofShape.lineTo(1.35, 0);
    sRoofShape.closePath();
    const sRoofGeo = new THREE.ExtrudeGeometry(sRoofShape, {
      depth: 2.08,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
    });
    sRoofGeo.center();
    const sRoof = new THREE.Mesh(sRoofGeo, clayMat('#C66A4E', 0.64));
    sRoof.position.set(0, 1.92, 0);
    const sDoor = new THREE.Mesh(
      new RoundedBoxGeometry(0.95, 1.02, 0.1, 2, 0.03),
      clayMat('#9E673D', 0.74),
    );
    sDoor.position.set(0, 0.62, 0.86);
    const sDoorStrap = new THREE.Mesh(
      new RoundedBoxGeometry(0.98, 0.1, 0.12, 2, 0.02),
      clayMat('#4B5563', 0.5),
    );
    sDoorStrap.position.set(0, 0.85, 0.87);
    const sWindow = new THREE.Mesh(
      new RoundedBoxGeometry(0.38, 0.28, 0.1, 2, 0.02),
      glossyClayMat('#B5E0F5', 0.2),
    );
    sWindow.position.set(0, 1.66, 0.88);
    const sSack = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 9, 8),
      clayMat('#E0BE7D', 0.82),
    );
    sSack.scale.set(1.0, 1.25, 0.9);
    sSack.position.set(0.78, 0.32, 0.94);
    const sCrate = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.36, 0.42, 2, 0.03),
      clayMat('#B8804E', 0.72),
    );
    sCrate.position.set(-0.76, 0.28, 0.94);
    storageShed.add(sDeck, sWalls, sRoof, sDoor, sDoorStrap, sWindow, sSack, sCrate);
    addBoxProxy(
      storageShed,
      [2.6, 2.5, 2.2],
      [0, 1.25, 0.1],
      {kind: 'farm_storage', tx: 9.0, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 9.0, z: -8.5, hw: 1.25, hd: 1.05});
    labelAnchors.push({
      id: 'farm_storage',
      label: 'Nhà Kho',
      worldPos: new THREE.Vector3(9.0, 2.65, -8.5),
    });
    group.add(storageShed);

    // === 4C. XE BUS SHOP NÔNG TRẠI LƯU ĐỘNG (Back Far Right: X = 14.8, Z = -8.4) ===
    const shopBus = new THREE.Group();
    shopBus.position.set(14.8, 0, -8.4);

    // 4 Rubber Tires + Cream Hubcaps
    const tireMat = clayMat('#2E343A', 0.85);
    const hubMat = clayMat('#FFF3DC', 0.55);
    [
      [-1.42, 0.94],
      [1.42, 0.94],
      [-1.42, -0.94],
      [1.42, -0.94],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.26, 14), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(wx, 0.38, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 12), hubMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.38, wz);
      shopBus.add(tire, hub);
    });

    // Lower Mint Skirt & Upper Cream Body
    const busLower = new THREE.Mesh(
      new RoundedBoxGeometry(4.65, 0.92, 1.98, 3, 0.14),
      clayMat('#6EB48C', 0.58),
    );
    busLower.position.set(0, 0.82, 0);
    const busUpper = new THREE.Mesh(
      new RoundedBoxGeometry(4.5, 1.06, 1.9, 3, 0.16),
      clayMat('#FFF6E3', 0.65),
    );
    busUpper.position.set(0.05, 1.68, 0);

    // Cab Front (-X): Panoramic Windshield, Headlights & Bumper
    const windshield = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.68, 1.54, 2, 0.05),
      glossyClayMat('#9BD4EE', 0.16),
    );
    windshield.position.set(-2.22, 1.66, 0);
    const frontBumper = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.22, 2.04, 2, 0.06),
      clayMat('#E8DEC8', 0.6),
    );
    frontBumper.position.set(-2.34, 0.44, 0);
    const headLightL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.1, 10),
      glossyClayMat('#FFE694', 0.18),
    );
    headLightL.rotation.z = Math.PI / 2;
    headLightL.position.set(-2.33, 0.78, -0.62);
    const headLightR = headLightL.clone();
    headLightR.position.z = 0.62;

    // Cut-out Serving Window Hatch on Front-Facing Side (+Z)
    const hatchBack = new THREE.Mesh(
      new RoundedBoxGeometry(2.55, 0.9, 0.14, 2, 0.04),
      clayMat('#5E402D', 0.82),
    );
    hatchBack.position.set(0.38, 1.62, 0.89);

    // Wooden Serving Counter Shelf + Goods
    const counterShelf = new THREE.Mesh(
      new RoundedBoxGeometry(2.72, 0.12, 0.48, 2, 0.04),
      clayMat('#D99A5B', 0.65),
    );
    counterShelf.position.set(0.38, 1.18, 1.12);

    // Little Seed Pouches & Feed Jars on Counter
    [
      [-0.55, '#E7B94B'],
      [-0.22, '#6BA383'],
      [0.12, '#EF8432'],
      [0.45, '#59A6CE'],
      [0.78, '#D95970'],
    ].forEach(([gx, col], gi) => {
      const item = new THREE.Mesh(
        gi >= 3
          ? new THREE.CylinderGeometry(0.11, 0.11, 0.24, 8)
          : new RoundedBoxGeometry(0.22, 0.26, 0.14, 2, 0.03),
        glossyClayMat(col as string, 0.35),
      );
      item.position.set(0.38 + (gx as number), 1.36, 1.14);
      shopBus.add(item);
    });

    // Striped Awning Over Cut-out Window (+Z)
    for (let s = 0; s < 6; s++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.1, 0.86, 2, 0.03),
        clayMat(s % 2 === 0 ? '#E4725B' : '#FFF7E8', 0.6),
      );
      stripe.position.set(0.38 - 1.15 + s * 0.46, 2.06, 1.24);
      stripe.rotation.x = 0.28;
      shopBus.add(stripe);
    }

    // Rooftop Rack & Signboard
    const roofSignBoard = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 0.42, 0.16, 2, 0.05),
      clayMat('#F5C85B', 0.55),
    );
    roofSignBoard.position.set(0.15, 2.42, 0.35);

    shopBus.add(
      busLower,
      busUpper,
      windshield,
      frontBumper,
      headLightL,
      headLightR,
      hatchBack,
      counterShelf,
      roofSignBoard,
    );
    addBoxProxy(
      shopBus,
      [5.0, 2.8, 2.6],
      [0, 1.35, 0.15],
      {kind: 'farm_shop', tx: 14.8, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 14.8, z: -8.4, hw: 2.45, hd: 1.15});
    labelAnchors.push({
      id: 'farm_shop',
      label: 'Xe Bus Shop',
      worldPos: new THREE.Vector3(14.8, 2.95, -8.4),
    });
    group.add(shopBus);

    // === 5. HAI CHUỒNG NUÔI THÚ RỘNG RÃI VỚI ĐẤT CHUỒNG PHỦ ĐẦY & ĐỒ VẬT CÂN ĐỐI ===
    // 5A. CHUỒNG GIA CẦM (GÀ & VỊT: X -21.2..-10.4, Z -4.0..+2.2, cổng tại Z -1.75..+0.35)
    buildRanchFenceZ(-21.2, -4.0, 2.2);
    buildRanchFenceX(-21.2, -10.4, -4.0);
    buildRanchFenceX(-21.2, -10.4, 2.2);
    buildRanchFenceZ(-10.4, -4.0, -1.75);
    buildRanchFenceZ(-10.4, 0.35, 2.2);

    const poultryEarth = new THREE.Mesh(
      new RoundedBoxGeometry(10.35, 0.03, 5.8, 2, 0.02),
      clayMat('#C8B482', 0.9),
    );
    poultryEarth.position.set(-15.8, 0.012, -0.9);
    group.add(poultryEarth);

    const coopHouse = new THREE.Group();
    coopHouse.position.set(-19.25, 0, -2.55);
    const cBody = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.35, 1.7, 2, 0.05), clayMat('#F2D59B', 0.68));
    cBody.position.y = 0.68;
    const cRoof = new THREE.Mesh(new RoundedBoxGeometry(2.55, 0.2, 2.05, 2, 0.05), clayMat('#D97A54', 0.62));
    cRoof.position.y = 1.44;
    cRoof.rotation.x = 0.14;
    const cDoor = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.72, 0.12, 2, 0.03), clayMat('#7D5333'));
    cDoor.position.set(0.35, 0.36, 0.85);
    coopHouse.add(cBody, cRoof, cDoor);
    group.add(coopHouse);
    colliders.push({type: 'box', x: -19.25, z: -2.55, hw: 1.25, hd: 0.98});

    // Cozy nesting straw box along the back fence of the expanded poultry yard
    const nestRack = new THREE.Group();
    nestRack.position.set(-15.2, 0, -3.15);
    const nestBox = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.34, 0.72, 2, 0.04), clayMat('#A97447', 0.78));
    nestBox.position.y = 0.17;
    const nestStraw = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.14, 0.54, 2, 0.04), clayMat('#E8C666', 0.85));
    nestStraw.position.y = 0.34;
    nestRack.add(nestBox, nestStraw);
    group.add(nestRack);
    colliders.push({type: 'box', x: -15.2, z: -3.15, hw: 0.85, hd: 0.45});

    const poultryTroughCount = options.troughs?.poultry ?? 0;
    const poultryTrough = new THREE.Mesh(
      new RoundedBoxGeometry(1.4, 0.34, 0.56, 2, 0.04),
      clayMat('#9E6B40', 0.76),
    );
    poultryTrough.position.set(-12.3, 0.17, 1.18);
    group.add(poultryTrough);
    if (poultryTroughCount > 0) {
      const feedFill = Math.min(1, 0.35 + poultryTroughCount * 0.14);
      const grain = new THREE.Mesh(
        new RoundedBoxGeometry(1.16, 0.14 * feedFill, 0.38, 2, 0.03),
        clayMat('#F3C95B', 0.7),
      );
      grain.position.set(-12.3, 0.33, 1.18);
      group.add(grain);
    }
    colliders.push({type: 'box', x: -12.3, z: 1.18, hw: 0.78, hd: 0.38});

    addBoxProxy(
      group,
      [10.8, 1.5, 6.2],
      [-15.8, 0.75, -0.9],
      {kind: 'pasture_spot', coop: 'poultry' as CoopKind, tx: -9.2, tz: -0.7},
      clickTargets,
    );
    labelAnchors.push({
      id: 'pasture_poultry',
      label: poultryTroughCount > 0 ? 'Chuồng Gia Cầm' : 'Gia Cầm (Hết cám)',
      worldPos: new THREE.Vector3(-15.8, 2.25, -1.8),
    });

    // 5B. CHUỒNG GIA SÚC (LỢN & BÒ SỮA: X -21.2..-10.4, Z +3.2..+10.2, cổng tại Z +5.65..+7.75)
    buildRanchFenceZ(-21.2, 3.2, 10.2);
    buildRanchFenceX(-21.2, -10.4, 3.2);
    buildRanchFenceX(-21.2, -10.4, 10.2);
    buildRanchFenceZ(-10.4, 3.2, 5.65);
    buildRanchFenceZ(-10.4, 7.75, 10.2);

    const cattleEarth = new THREE.Mesh(
      new RoundedBoxGeometry(10.35, 0.03, 6.55, 2, 0.02),
      clayMat('#C4AD79', 0.9),
    );
    cattleEarth.position.set(-15.8, 0.012, 6.7);
    group.add(cattleEarth);

    const barn = new THREE.Group();
    barn.position.set(-19.2, 0, 4.7);
    const barnWallB = new THREE.Mesh(new RoundedBoxGeometry(2.5, 1.55, 0.2, 2, 0.04), clayMat('#D86E58', 0.66));
    barnWallB.position.set(0, 0.78, -0.85);
    const barnWallL = new THREE.Mesh(new RoundedBoxGeometry(0.2, 1.55, 1.8, 2, 0.04), clayMat('#D86E58', 0.66));
    barnWallL.position.set(-1.15, 0.78, 0);
    const barnPostR = new THREE.Mesh(new RoundedBoxGeometry(0.18, 1.55, 0.18, 2, 0.03), timberMat);
    barnPostR.position.set(1.12, 0.78, 0.8);
    const barnRoof = new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.22, 2.25, 2, 0.06), clayMat('#8C5A3C', 0.7));
    barnRoof.position.set(0, 1.66, 0);
    barnRoof.rotation.x = 0.12;
    barn.add(barnWallB, barnWallL, barnPostR, barnRoof);
    group.add(barn);
    colliders.push({type: 'box', x: -19.2, z: 4.7, hw: 1.38, hd: 1.02});

    const hay1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.68, 10), clayMat('#E8C05A', 0.82));
    hay1.rotation.z = Math.PI / 2;
    hay1.position.set(-12.0, 0.4, 4.25);
    const hay2 = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.58, 10), clayMat('#DFB44D', 0.84));
    hay2.rotation.z = Math.PI / 2;
    hay2.rotation.y = 0.35;
    hay2.position.set(-13.05, 0.34, 4.05);
    group.add(hay1, hay2);
    colliders.push({type: 'box', x: -12.5, z: 4.2, hw: 1.05, hd: 0.6});

    // Wooden drinking water tub in front-left corner of the expanded cattle yard
    const waterTub = new THREE.Group();
    waterTub.position.set(-19.1, 0, 9.05);
    const tubWall = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.48, 0.42, 12), clayMat('#8E5D38', 0.78));
    tubWall.position.y = 0.21;
    const tubWater = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.06, 12), glossyClayMat('#55BCE6', 0.12));
    tubWater.position.y = 0.39;
    waterTub.add(tubWall, tubWater);
    group.add(waterTub);
    colliders.push({type: 'circle', x: -19.1, z: 9.05, r: 0.64});

    const cattleTroughCount = options.troughs?.cattle ?? 0;
    const cattleTrough = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 0.4, 0.62, 2, 0.05),
      clayMat('#9E6B40', 0.76),
    );
    cattleTrough.position.set(-12.3, 0.2, 9.05);
    group.add(cattleTrough);
    if (cattleTroughCount > 0) {
      const feedFill = Math.min(1, 0.35 + cattleTroughCount * 0.16);
      const grain = new THREE.Mesh(
        new RoundedBoxGeometry(1.3, 0.16 * feedFill, 0.42, 2, 0.03),
        clayMat('#F3C95B', 0.7),
      );
      grain.position.set(-12.3, 0.39, 9.05);
      group.add(grain);
    }
    colliders.push({type: 'box', x: -12.3, z: 9.05, hw: 0.84, hd: 0.42});

    addBoxProxy(
      group,
      [10.8, 1.6, 7.0],
      [-15.8, 0.8, 6.7],
      {kind: 'pasture_spot', coop: 'cattle' as CoopKind, tx: -9.2, tz: 6.7},
      clickTargets,
    );
    labelAnchors.push({
      id: 'pasture_cattle',
      label: cattleTroughCount > 0 ? 'Chuồng Gia Súc' : 'Gia Súc (Hết cám)',
      worldPos: new THREE.Vector3(-15.8, 2.35, 5.2),
    });

    // === 5C. ĐÀN VẬT NUÔI THẢ TỰ DO (GÀ, VỊT, LỢN, BÒ SỮA) · CON BỊ BỆNH SẼ CHUYỂN MÀU XANH LÁ ===
    interface RoamingAnimalCtrl {
      coop: CoopKind;
      root: THREE.Group;
      body: THREE.Group;
      legs: THREE.Mesh[];
      x: number;
      z: number;
      rotY: number;
      targetX: number;
      targetZ: number;
      pauseTimer: number;
      speed: number;
      phase: number;
    }
    const roamingAnimals: RoamingAnimalCtrl[] = [];
    const pickCoopSpot = (coop: CoopKind, idx: number, seedOffset = 0): [number, number] => {
      const s = ((idx * 37 + seedOffset * 13) % 97) / 97;
      const t = ((idx * 53 + seedOffset * 29) % 89) / 89;
      if (coop === 'poultry') {
        let px = -20.1 + s * 8.9;
        let pz = -3.2 + t * 4.7;
        if (px < -17.3 && pz < -1.1) pz = -0.3;
        if (px > -16.4 && px < -13.9 && pz < -2.3) pz = -1.6;
        if (px > -13.6 && pz > 0.3) px = -14.7;
        return [px, pz];
      }
      let px = -20.1 + s * 8.9;
      let pz = 3.95 + t * 5.5;
      if (px < -17.2 && pz < 6.1) pz = 6.9;
      if (px > -14.0 && pz < 5.1) pz = 5.7;
      if (px < -17.9 && pz > 8.1) pz = 7.7;
      if (px > -13.7 && pz > 8.1) px = -14.9;
      return [px, pz];
    };

    const animalsToSpawn = options.livestock ?? [];
    animalsToSpawn.forEach((ani, idx) => {
      const aRoot = new THREE.Group();
      const aBody = new THREE.Group();
      const legs: THREE.Mesh[] = [];
      const [sx, sz] = pickCoopSpot(ani.coop, idx, 1);
      aRoot.position.set(sx, 0, sz);

      // Sick animals noticeably turn green so players spot them immediately in 3D!
      const sickMain = '#6BBF73';
      const sickShade = '#56A45E';
      const sickDark = '#44854B';

      if (ani.type === 'chicken') {
        const featherMat = clayMat(ani.sick ? sickMain : '#FFF6E3', 0.65);
        const wingMat = clayMat(ani.sick ? sickShade : '#F2E0BD', 0.68);
        const combMat = glossyClayMat(ani.sick ? sickDark : '#DF4F4F', 0.35);
        const beakMat = clayMat('#F29B38', 0.55);

        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), featherMat);
        torso.scale.set(0.95, 0.9, 1.2);
        torso.position.set(0, 0.28, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 9, 8), featherMat);
        head.position.set(0, 0.45, 0.16);
        const comb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 7, 6), combMat);
        comb.scale.set(0.6, 1.2, 1.3);
        comb.position.set(0, 0.57, 0.16);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.11, 6), beakMat);
        beak.rotation.x = Math.PI / 2;
        beak.position.set(0, 0.43, 0.31);
        const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), wingMat);
        wingL.scale.set(0.45, 0.85, 1.15);
        wingL.position.set(-0.2, 0.29, 0);
        const wingR = wingL.clone();
        wingR.position.x = 0.2;
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 6), wingMat);
        tail.rotation.x = -0.65;
        tail.position.set(0, 0.36, -0.24);
        aBody.add(torso, head, comb, beak, wingL, wingR, tail);

        const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6);
        const legL = new THREE.Mesh(legGeo, beakMat);
        legL.position.set(-0.07, 0.08, 0.02);
        const legR = new THREE.Mesh(legGeo, beakMat);
        legR.position.set(0.07, 0.08, 0.02);
        legs.push(legL, legR);
        aBody.add(legL, legR);
      } else if (ani.type === 'duck') {
        const duckMat = clayMat(ani.sick ? sickMain : '#F7FAF7', 0.6);
        const wingMat = clayMat(ani.sick ? sickShade : '#B7D4C5', 0.65);
        const billMat = clayMat('#F28B30', 0.48);

        const torso = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), duckMat);
        torso.scale.set(0.92, 0.84, 1.36);
        torso.position.set(0, 0.25, 0);
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.2, 8), duckMat);
        neck.position.set(0, 0.39, 0.16);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.135, 9, 8), duckMat);
        head.position.set(0, 0.5, 0.19);
        const bill = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.045, 0.16, 2, 0.02), billMat);
        bill.position.set(0, 0.48, 0.33);
        const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), wingMat);
        wingL.scale.set(0.45, 0.78, 1.25);
        wingL.position.set(-0.19, 0.27, -0.02);
        const wingR = wingL.clone();
        wingR.position.x = 0.19;
        const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 6), wingMat);
        tail.rotation.x = -0.8;
        tail.position.set(0, 0.31, -0.28);
        aBody.add(torso, neck, head, bill, wingL, wingR, tail);

        const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6);
        const legL = new THREE.Mesh(legGeo, billMat);
        legL.position.set(-0.07, 0.07, 0.02);
        const legR = new THREE.Mesh(legGeo, billMat);
        legR.position.set(0.07, 0.07, 0.02);
        legs.push(legL, legR);
        aBody.add(legL, legR);
      } else if (ani.type === 'pig') {
        const pigMat = clayMat(ani.sick ? sickMain : '#F7A6B8', 0.58);
        const snoutMat = clayMat(ani.sick ? sickShade : '#ED849C', 0.5);
        const hoofMat = clayMat(ani.sick ? sickDark : '#8F5C66', 0.7);

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.36, 6, 10), pigMat);
        torso.rotation.x = Math.PI / 2;
        torso.position.set(0, 0.42, 0);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 10, 9), pigMat);
        head.position.set(0, 0.48, 0.34);
        const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.1, 10), snoutMat);
        snout.rotation.x = Math.PI / 2;
        snout.position.set(0, 0.44, 0.56);
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), snoutMat);
        earL.scale.set(0.8, 0.5, 1.2);
        earL.position.set(-0.14, 0.65, 0.34);
        const earR = earL.clone();
        earR.position.x = 0.14;
        aBody.add(torso, head, snout, earL, earR);

        const legGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.22, 7);
        [
          [-0.14, 0.11, 0.18],
          [0.14, 0.11, 0.18],
          [-0.14, 0.11, -0.18],
          [0.14, 0.11, -0.18],
        ].forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeo, hoofMat);
          leg.position.set(lx, ly, lz);
          legs.push(leg);
          aBody.add(leg);
        });
      } else {
        // Cow
        const cowMat = clayMat(ani.sick ? sickMain : '#FFF8F0', 0.65);
        const spotMat = clayMat(ani.sick ? sickDark : '#4C3A32', 0.72);
        const muzzleMat = clayMat(ani.sick ? sickShade : '#F2B1BA', 0.58);
        const hornMat = clayMat('#E6D19E', 0.52);

        const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.58, 7, 10), cowMat);
        torso.rotation.x = Math.PI / 2;
        torso.position.set(0, 0.66, 0);
        const patch1 = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), spotMat);
        patch1.scale.set(1.05, 0.75, 1.2);
        patch1.position.set(-0.18, 0.74, -0.05);
        const patch2 = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), spotMat);
        patch2.position.set(0.2, 0.68, 0.16);
        const head = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.36, 0.38, 2, 0.09), cowMat);
        head.position.set(0, 0.84, 0.52);
        const muzzle = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.2, 0.2, 2, 0.06), muzzleMat);
        muzzle.position.set(0, 0.74, 0.7);
        const earL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), spotMat);
        earL.scale.set(1.3, 0.55, 0.7);
        earL.position.set(-0.24, 0.88, 0.46);
        const earR = earL.clone();
        earR.position.x = 0.24;
        const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 6), hornMat);
        hornL.position.set(-0.12, 1.07, 0.48);
        hornL.rotation.z = 0.35;
        const hornR = hornL.clone();
        hornR.position.x = 0.12;
        hornR.rotation.z = -0.35;
        aBody.add(torso, patch1, patch2, head, muzzle, earL, earR, hornL, hornR);

        const legGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.36, 7);
        [
          [-0.18, 0.18, 0.26],
          [0.18, 0.18, 0.26],
          [-0.18, 0.18, -0.26],
          [0.18, 0.18, -0.26],
        ].forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeo, spotMat);
          leg.position.set(lx, ly, lz);
          legs.push(leg);
          aBody.add(leg);
        });
      }

      // Baby scale (0.66x) vs Adult/Retired (1.0x)
      aBody.scale.setScalar(ani.stage === 'baby' ? 0.66 : 1.0);

      if (ani.sick || ani.hasProduce) {
        const badgeY = ani.type === 'cow' ? 1.38 : ani.type === 'pig' ? 1.02 : 0.82;
        const badge = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 8, 8),
          glossyClayMat(ani.sick ? '#3EB35E' : '#FFD166', 0.22),
        );
        badge.position.set(0, badgeY, 0);
        aBody.add(badge);
      }

      aRoot.add(aBody);
      addBoxProxy(
        aRoot,
        [0.9, 1.2, 0.9],
        [0, 0.6, 0],
        {kind: 'pasture_spot', coop: ani.coop, tx: -9.2, tz: ani.coop === 'poultry' ? -0.7 : 6.7},
        clickTargets,
      );
      group.add(aRoot);

      const [tx, tz] = pickCoopSpot(ani.coop, idx, 5);
      roamingAnimals.push({
        coop: ani.coop,
        root: aRoot,
        body: aBody,
        legs,
        x: sx,
        z: sz,
        rotY: Math.atan2(tx - sx, tz - sz),
        targetX: tx,
        targetZ: tz,
        pauseTimer: (idx % 3) * 0.8,
        speed: ani.coop === 'poultry' ? 0.82 : ani.type === 'pig' ? 0.65 : 0.5,
        phase: idx * 1.9,
      });
    });

    // === 6. AO NUÔI CÁ HÌNH CHỮ NHẬT UỐN LƯỢN · BỜ RỖNG · CẦU GỖ CAO HƠN MẶT NƯỚC ===
    const pondCX = 15.6;
    const pondCZ = 3.0;
    const pondSamples = 64;
    const evalPondEdge = (th: number, scale = 1.0): [number, number] => {
      const c = Math.cos(th);
      const s = Math.sin(th);
      // Soft superellipse -> wavy hand-dug rectangular lagoon instead of a circle
      const sqX = Math.sign(c) * Math.pow(Math.abs(c), 0.56);
      const sqZ = Math.sign(s) * Math.pow(Math.abs(s), 0.58);
      const wX = 0.24 * Math.sin(3 * th + 0.4) + 0.14 * Math.cos(5 * th - 0.6);
      const wZ = 0.26 * Math.cos(3 * th - 0.5) + 0.16 * Math.sin(4 * th + 0.7);
      const wx = (sqX * 4.45 + wX) * scale;
      const wz = (sqZ * 5.35 + wZ) * scale;
      return [wx, wz];
    };

    const makeContourPts = (scale: number): THREE.Vector2[] => {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i < pondSamples; i++) {
        const th = (i / pondSamples) * Math.PI * 2;
        const [wx, wz] = evalPondEdge(th, scale);
        // After rotateX(-PI/2), shape.y -> -worldZ, so shape.y = -wz puts point at (wx, wz)
        pts.push(new THREE.Vector2(wx, -wz));
      }
      return pts;
    };

    // Deep basin floor & bright turquoise water at y = 0.055
    const waterShape = new THREE.Shape(makeContourPts(0.99));
    const pondBedGeo = new THREE.ShapeGeometry(waterShape);
    pondBedGeo.rotateX(-Math.PI / 2);
    const pondBed = new THREE.Mesh(pondBedGeo, clayMat('#1A4E61', 0.94));
    pondBed.position.set(pondCX, 0.015, pondCZ);

    const pondWaterGeo = new THREE.ShapeGeometry(waterShape);
    pondWaterGeo.rotateX(-Math.PI / 2);
    const pondWater = new THREE.Mesh(pondWaterGeo, glossyClayMat('#3AB7E2', 0.12));
    pondWater.position.set(pondCX, 0.055, pondCZ);

    // HOLLOW inner sandy-earth shelf (outer = 1.07, hole = 0.94 -> never covers the water!)
    const innerShoreShape = new THREE.Shape(makeContourPts(1.07));
    innerShoreShape.holes.push(new THREE.Path(makeContourPts(0.94).reverse()));
    const innerShoreGeo = new THREE.ExtrudeGeometry(innerShoreShape, {
      depth: 0.075,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.08,
      bevelSegments: 2,
    });
    innerShoreGeo.rotateX(-Math.PI / 2);
    const innerShore = new THREE.Mesh(innerShoreGeo, clayMat('#A78A62', 0.9));
    innerShore.position.set(pondCX, 0.015, pondCZ);

    // HOLLOW outer grassy-mossy berm ring (outer = 1.15, hole = 1.04)
    const outerBermShape = new THREE.Shape(makeContourPts(1.15));
    outerBermShape.holes.push(new THREE.Path(makeContourPts(1.04).reverse()));
    const outerBermGeo = new THREE.ExtrudeGeometry(outerBermShape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.12,
      bevelSegments: 2,
    });
    outerBermGeo.rotateX(-Math.PI / 2);
    const outerBerm = new THREE.Mesh(outerBermGeo, clayMat('#7AA154', 0.88));
    outerBerm.position.set(pondCX, 0.02, pondCZ);

    group.add(pondBed, pondWater, innerShore, outerBerm);

    // Instanced river boulders & pebbles lining the lagoon banks (skip bridge approach X < 11.8 & |Z - 3.0| < 1.35)
    const pondRockList: [number, number, number, number, number][] = [];
    for (let i = 0; i < 48; i++) {
      const th = (i / 48) * Math.PI * 2 + ((i % 3) - 1) * 0.03;
      const [wx, wz] = evalPondEdge(th, 1.02 + (i % 3) * 0.035);
      const bx = pondCX + wx;
      const bz = pondCZ + wz;
      if (bx < 12.1 && Math.abs(bz - 3.0) < 1.35) continue;
      const s = 0.25 + ((i * 17) % 10) * 0.028;
      pondRockList.push([bx, bz, s, i * 1.13, i]);
    }
    const pondRockGeo = new THREE.DodecahedronGeometry(0.62, 1);
    pondRockGeo.scale(1.18, 0.7, 1.0);
    const pondRockMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.82});
    const pondRockIM = new THREE.InstancedMesh(pondRockGeo, pondRockMat, pondRockList.length);
    const rockDummy = new THREE.Object3D();
    const rockCol = new THREE.Color();
    const rockPalette = ['#939CA1', '#A6ADA6', '#7F888F', '#B6B09F', '#8E998E'];
    pondRockList.forEach(([rx, rz, rs, rot, ci], idx) => {
      rockDummy.position.set(rx, 0.1 + rs * 0.16, rz);
      rockDummy.rotation.set(0.12, rot, -0.08);
      rockDummy.scale.set(rs * (1 + (ci % 2) * 0.22), rs * 0.88, rs);
      rockDummy.updateMatrix();
      pondRockIM.setMatrixAt(idx, rockDummy.matrix);
      rockCol.set(rockPalette[ci % rockPalette.length]);
      pondRockIM.setColorAt(idx, rockCol);
    });
    pondRockIM.instanceMatrix.needsUpdate = true;
    if (pondRockIM.instanceColor) pondRockIM.instanceColor.needsUpdate = true;
    pondRockIM.computeBoundingSphere();
    group.add(pondRockIM);

    // Lightweight instanced aquatic grass blades + tiny shore wildflowers along the perimeter
    const shoreBladeSpots: [number, number, number, number][] = [];
    const shoreFlowerSpots: [number, number, number][] = [];
    for (let i = 0; i < 64; i++) {
      const th = (i / 64) * Math.PI * 2;
      const [wx, wz] = evalPondEdge(th, 1.075);
      const sx = pondCX + wx;
      const sz = pondCZ + wz;
      if (sx < 12.0 && Math.abs(sz - 3.0) < 1.45) continue;
      shoreBladeSpots.push([sx, sz, 0.72 + (i % 4) * 0.16, i * 0.9]);
      if (i % 2 === 0) {
        const [fx, fz] = evalPondEdge(th + 0.04, 1.11);
        shoreFlowerSpots.push([pondCX + fx, pondCZ + fz, i]);
      }
    }
    const bladeGeo = new THREE.ConeGeometry(0.065, 0.36, 5);
    bladeGeo.translate(0, 0.18, 0);
    const bladeMat = new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.75});
    const pondGrassIM = new THREE.InstancedMesh(bladeGeo, bladeMat, shoreBladeSpots.length * 2);
    const bladeDummy = new THREE.Object3D();
    const bladeCol = new THREE.Color();
    const bladePalette = ['#5BA452', '#6FB85F', '#4E9448', '#83C76A'];
    shoreBladeSpots.forEach(([sx, sz, sc, rot], idx) => {
      for (let b = 0; b < 2; b++) {
        const ii = idx * 2 + b;
        bladeDummy.position.set(sx + (b === 0 ? -0.05 : 0.05), 0.11, sz + (b === 0 ? 0.03 : -0.03));
        bladeDummy.rotation.set(b === 0 ? 0.14 : -0.1, rot + b, b === 0 ? -0.12 : 0.14);
        bladeDummy.scale.setScalar(sc * (b === 0 ? 1 : 0.82));
        bladeDummy.updateMatrix();
        pondGrassIM.setMatrixAt(ii, bladeDummy.matrix);
        bladeCol.set(bladePalette[ii % bladePalette.length]);
        pondGrassIM.setColorAt(ii, bladeCol);
      }
    });
    pondGrassIM.instanceMatrix.needsUpdate = true;
    if (pondGrassIM.instanceColor) pondGrassIM.instanceColor.needsUpdate = true;
    pondGrassIM.computeBoundingSphere();
    group.add(pondGrassIM);

    const flowerBaseGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.16, 5);
    const flowerHeadGeo = new THREE.SphereGeometry(0.065, 7, 6);
    const flowerStemIM = new THREE.InstancedMesh(
      flowerBaseGeo,
      clayMat('#529A49', 0.78),
      shoreFlowerSpots.length,
    );
    const flowerTopIM = new THREE.InstancedMesh(
      flowerHeadGeo,
      new THREE.MeshStandardMaterial({color: '#FFFFFF', roughness: 0.45}),
      shoreFlowerSpots.length,
    );
    const flDummy = new THREE.Object3D();
    const flCol = new THREE.Color();
    const flPalette = ['#FFB6C9', '#FFF6D6', '#FCD34D', '#D8B4FE', '#FFFFFF'];
    shoreFlowerSpots.forEach(([fx, fz, ci], idx) => {
      flDummy.position.set(fx, 0.19, fz);
      flDummy.rotation.set(0, 0, 0);
      flDummy.scale.setScalar(1);
      flDummy.updateMatrix();
      flowerStemIM.setMatrixAt(idx, flDummy.matrix);
      flDummy.position.set(fx, 0.27, fz);
      flDummy.scale.set(1.15, 0.72, 1.15);
      flDummy.updateMatrix();
      flowerTopIM.setMatrixAt(idx, flDummy.matrix);
      flCol.set(flPalette[ci % flPalette.length]);
      flowerTopIM.setColorAt(idx, flCol);
    });
    flowerStemIM.instanceMatrix.needsUpdate = true;
    flowerTopIM.instanceMatrix.needsUpdate = true;
    if (flowerTopIM.instanceColor) flowerTopIM.instanceColor.needsUpdate = true;
    group.add(flowerStemIM, flowerTopIM);

    // Tall cattail pond reed clusters at wavy lagoon corners
    const reedMat = clayMat('#5E9D53', 0.72);
    const cattailMat = clayMat('#7D5233', 0.78);
    [
      [11.7, -1.7],
      [19.7, -0.9],
      [19.6, 6.8],
      [11.8, 7.6],
      [16.2, -2.5],
      [15.6, 8.5],
    ].forEach(([rx, rz], ci) => {
      const clump = new THREE.Group();
      clump.position.set(rx, 0.06, rz);
      for (let k = 0; k < 4; k++) {
        const stalk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.036, 0.68 + (k % 2) * 0.18, 5),
          reedMat,
        );
        const ox = (k - 1.5) * 0.08;
        const oz = (k % 2 === 0 ? 1 : -1) * 0.06;
        stalk.position.set(ox, 0.34, oz);
        stalk.rotation.z = (k - 1.5) * 0.08;
        clump.add(stalk);
        if (k === 1 || k === 2) {
          const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.14, 4, 6), cattailMat);
          tip.position.set(ox, 0.62 + (k % 2) * 0.12, oz);
          clump.add(tip);
        }
      }
      clump.rotation.y = ci * 0.8;
      group.add(clump);
    });

    // Floating lilypads & lotus blossoms resting cleanly on water surface y = 0.055
    const lilyMat = clayMat('#5BB563', 0.62);
    const lotusMat = glossyClayMat('#F8A4BA', 0.35);
    [
      [12.7, -0.8, true],
      [18.3, -0.5, false],
      [17.4, 1.1, true],
      [12.8, 7.0, false],
      [18.1, 6.9, true],
    ].forEach(([lx, lz, hasBloom]) => {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.03, 12), lilyMat);
      pad.position.set(lx as number, 0.062, lz as number);
      group.add(pad);
      if (hasBloom) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lotusMat);
        lotus.scale.set(1.2, 0.72, 1.2);
        lotus.position.set((lx as number) + 0.06, 0.1, lz as number);
        group.add(lotus);
      }
    });

    // Elevated Wooden Bridge/Pier clearly arching above the water (top y = 0.36 >> water y = 0.055!)
    const pierDeck = new THREE.Mesh(
      new RoundedBoxGeometry(6.3, 0.14, 1.84, 2, 0.04),
      clayMat('#C58F5B', 0.72),
    );
    pierDeck.position.set(12.65, 0.29, 3.0);
    const pierStep = new THREE.Mesh(
      new RoundedBoxGeometry(0.45, 0.14, 1.84, 2, 0.04),
      clayMat('#B87F4B', 0.74),
    );
    pierStep.position.set(9.45, 0.14, 3.0);
    const curbMat = clayMat('#A87040', 0.74);
    const curbN = new THREE.Mesh(new RoundedBoxGeometry(6.2, 0.06, 0.1, 2, 0.02), curbMat);
    curbN.position.set(12.65, 0.38, 2.13);
    const curbS = curbN.clone();
    curbS.position.z = 3.87;
    group.add(pierDeck, pierStep, curbN, curbS);
    [
      [10.6, 2.18],
      [10.6, 3.82],
      [13.0, 2.18],
      [13.0, 3.82],
      [15.4, 2.18],
      [15.4, 3.82],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.095, 0.78, 8), timberMat);
      post.position.set(px, 0.36, pz);
      group.add(post);
    });

    // Water colliders leave the bridge corridor (X: 9.4..15.6, Z: 2.15..3.85) completely walkable!
    colliders.push({type: 'box', x: 15.6, z: -0.45, hw: 5.1, hd: 2.6});
    colliders.push({type: 'box', x: 15.6, z: 6.45, hw: 5.1, hd: 2.6});
    colliders.push({type: 'box', x: 18.2, z: 3.0, hw: 2.45, hd: 1.0});

    // Swimming 3D Creatures inside the Enlarged Pond (1 full-size adult state per species!)
    interface SwimmingFishCtrl {
      group: THREE.Group;
      tail: THREE.Object3D;
      cx: number;
      cz: number;
      x: number;
      z: number;
      rotY: number;
      rx: number;
      rz: number;
      speed: number;
      phase: number;
      isSurface: boolean;
      sick: boolean;
    }
    const swimmingFish: SwimmingFishCtrl[] = [];
    const fishListToSpawn = options.pondFish ?? [];
    fishListToSpawn.forEach((fish, idx) => {
      const spec = POND_FISH_SPECIES[fish.species] ?? POND_FISH_SPECIES.fish_12h;
      const fGroup = new THREE.Group();
      const bodyMat = glossyClayMat(fish.sick ? '#9DB2A6' : spec.bodyColor, 0.24);
      const finMat = glossyClayMat(fish.sick ? '#C1D1C8' : spec.accentColor, 0.28);
      let animPart: THREE.Object3D;
      let isSurface = false;

      if (fish.species === 'duck_24h') {
        isSurface = true;
        // Cute Golden Yellow Duck swimming on surface
        const duckBody = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), bodyMat);
        duckBody.scale.set(0.95, 0.78, 1.32);
        const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.145, 9, 8), bodyMat);
        duckHead.position.set(0, 0.2, 0.16);
        const bill = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.045, 0.15, 2, 0.02), finMat);
        bill.position.set(0, 0.18, 0.3);
        const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), bodyMat);
        wingL.scale.set(0.45, 0.75, 1.2);
        wingL.position.set(-0.18, 0.04, -0.02);
        const wingR = wingL.clone();
        wingR.position.x = 0.18;
        const duckTail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 6), bodyMat);
        duckTail.rotation.x = -0.85;
        duckTail.position.set(0, 0.1, -0.26);
        const eyeMat = clayMat('#2B2623', 0.4);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
        eyeL.position.set(-0.08, 0.24, 0.26);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.08;
        fGroup.add(duckBody, duckHead, bill, wingL, wingR, duckTail, eyeL, eyeR);
        animPart = duckTail;
      } else if (fish.species === 'turtle_48h') {
        isSurface = true;
        // Cute Green Pond Turtle
        const shellMat = glossyClayMat(fish.sick ? '#8FA89B' : '#3B7244', 0.28);
        const rimMat = clayMat(fish.sick ? '#A7BDB2' : '#73A65E', 0.45);
        const skinMat = clayMat(fish.sick ? '#B5C9BF' : '#85BD78', 0.48);

        const shell = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
          shellMat,
        );
        shell.scale.set(0.96, 0.78, 1.18);
        shell.position.y = -0.02;
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.07, 12), rimMat);
        rim.scale.set(0.98, 1, 1.2);
        rim.position.y = -0.02;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), skinMat);
        head.position.set(0, 0.04, 0.29);
        const flipperGroup = new THREE.Group();
        [
          [-0.22, -0.02, 0.12],
          [0.22, -0.02, 0.12],
          [-0.19, -0.02, -0.16],
          [0.19, -0.02, -0.16],
        ].forEach(([fx, fy, fz]) => {
          const fl = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 6), skinMat);
          fl.scale.set(1.3, 0.36, 0.8);
          fl.position.set(fx, fy, fz);
          flipperGroup.add(fl);
        });
        fGroup.add(shell, rim, head, flipperGroup);
        animPart = flipperGroup;
      } else {
        // Swimming Koi / Carp Fish
        const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8), bodyMat);
        fBody.scale.set(0.74, 0.72, 1.55);
        const fTail = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.26, 5), finMat);
        fTail.rotation.x = Math.PI / 2;
        fTail.position.z = -0.29;
        const dorsal = new THREE.Mesh(new RoundedBoxGeometry(0.04, 0.12, 0.18, 2, 0.02), finMat);
        dorsal.position.set(0, 0.14, -0.04);
        fGroup.add(fBody, fTail, dorsal);
        animPart = fTail;
      }

      if (fish.sick || fish.stage === 'ready') {
        const indicator = new THREE.Mesh(
          new THREE.SphereGeometry(0.085, 7, 7),
          glossyClayMat(fish.sick ? '#E84A5F' : '#FFD166', 0.2),
        );
        indicator.position.y = isSurface ? 0.36 : 0.28;
        fGroup.add(indicator);
      }

      const inNorthHalf = idx % 2 === 0;
      const cx = 15.5 + ((idx % 3) - 1) * 0.9;
      const cz = inNorthHalf ? -0.25 : 6.25;
      fGroup.position.set(cx, isSurface ? 0.082 : 0.052, cz);
      group.add(fGroup);

      swimmingFish.push({
        group: fGroup,
        tail: animPart,
        cx,
        cz,
        x: cx,
        z: cz,
        rotY: 0,
        rx: 1.85 + (idx % 2) * 0.55,
        rz: 1.15 + (idx % 3) * 0.28,
        speed: fish.sick ? 0.32 : 0.68 + (idx % 3) * 0.14,
        phase: idx * 1.7,
        isSurface,
        sick: fish.sick,
      });
    });

    // Pond Scattered Feed Pellets Pool (animated when player feeds near pond!)
    interface PondPelletCtrl {
      mesh: THREE.Mesh;
      active: boolean;
      eaten: boolean;
      startX: number;
      startZ: number;
      targetX: number;
      targetZ: number;
      flight: number;
    }
    const pelletMat = glossyClayMat('#E8B145', 0.28);
    const pelletGeo = new THREE.SphereGeometry(0.06, 7, 6);
    const pondPellets: PondPelletCtrl[] = Array.from({length: 16}, () => {
      const mesh = new THREE.Mesh(pelletGeo, pelletMat);
      mesh.visible = false;
      group.add(mesh);
      return {
        mesh,
        active: false,
        eaten: false,
        startX: 14.2,
        startZ: 3.0,
        targetX: 15.5,
        targetZ: 0,
        flight: 0,
      };
    });
    let pondFeedTimer = 0;

    triggerPondFeedFn = () => {
      pondFeedTimer = 4.2;
      pondPellets.forEach((p, idx) => {
        const north = idx % 2 === 0;
        p.active = true;
        p.eaten = false;
        p.flight = 0;
        p.startX = 14.2;
        p.startZ = 3.0;
        p.targetX = 12.2 + ((idx * 37) % 100) / 100 * 6.4;
        p.targetZ = north
          ? -1.35 + ((idx * 53) % 100) / 100 * 2.7
          : 4.65 + ((idx * 41) % 100) / 100 * 2.7;
        p.mesh.visible = true;
        p.mesh.scale.setScalar(1);
        p.mesh.position.set(p.startX, 0.85, p.startZ);
      });
    };

    addBoxProxy(
      group,
      [10.0, 1.4, 11.8],
      [15.5, 0.55, 3.0],
      {kind: 'pond_spot', tx: 14.5, tz: 3.0},
      clickTargets,
    );
    const readyPondCount = fishListToSpawn.filter((f) => f.stage === 'ready').length;
    labelAnchors.push({
      id: 'pond_spot',
      label: readyPondCount > 0 ? `Hồ Thủy Sinh (${readyPondCount} sẵn sàng!)` : 'Hồ Thủy Sinh',
      worldPos: new THREE.Vector3(15.5, 1.35, 3.0),
    });

    // === 7. 20 Ô ĐẤT TRỒNG TRỌT (10 Ô MỖI BÊN, MÀU ĐỒNG BỘ MỌI CẤP) ===
    buildPicketRunX(-6.5, -1.9, 7.95);
    buildPicketRunX(1.9, 6.5, 7.95);

    const colXs = [-5.4, -3.1, 3.1, 5.4];
    const rowZs = [-1.8, 0.3, 2.4, 4.5, 6.6];

    options.plots.forEach((plot, idx) => {
      const isRight = idx >= 10;
      const localIdx = idx % 10;
      const col = localIdx % 2;
      const row = Math.floor(localIdx / 2);
      const px = colXs[(isRight ? 2 : 0) + col];
      const pz = rowZs[row];

      const plotGroup = new THREE.Group();
      plotGroup.position.set(px, 0, pz);

      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(1.42, 0.22, 1.32, 2, 0.045),
        clayMat('#8D6240', 0.72),
      );
      frame.position.y = 0.11;
      const dirt = new THREE.Mesh(
        new RoundedBoxGeometry(1.2, 0.24, 1.12, 2, 0.03),
        clayMat(plot.watered ? '#492C18' : '#734B2D', 0.92),
      );
      dirt.position.y = 0.13;
      plotGroup.add(frame, dirt);

      plotGroup.add(buildPlotBotanicalDecor(plot, disposables));

      const approachX = px < 0 ? px + 1.05 : px - 1.05;
      addBoxProxy(
        plotGroup,
        [1.48, 1.2, 1.38],
        [0, 0.52, 0],
        {kind: 'plot', plotId: plot.id, tx: approachX, tz: pz, px, pz},
        clickTargets,
      );
      colliders.push({type: 'box', x: px, z: pz, hw: 0.71, hd: 0.66});

      if (plot.hasPest && plot.stage !== 'empty') {
        labelAnchors.push({
          id: `plot_${plot.id}`,
          label: 'Sâu! Xịt thuốc',
          worldPos: new THREE.Vector3(px, 1.15, pz),
        });
      } else if (plot.stage === 'ready') {
        labelAnchors.push({
          id: `plot_${plot.id}`,
          label: 'Thu Hoạch!',
          worldPos: new THREE.Vector3(px, 1.15, pz),
        });
      }
      group.add(plotGroup);
    });

    group.add(createExitDoorway('Cổng Thị Trấn', [0, 0, 12.6], '#6EA85C', clickTargets, labelAnchors));

    let prevFarmElapsed = 0;
    let wanderSeed = 11;
    updateFn = (elapsed) => {
      const dt = prevFarmElapsed > 0 ? Math.min(0.08, elapsed - prevFarmElapsed) : 0.016;
      prevFarmElapsed = elapsed;

      // Animate free-roaming chickens, ducks, pigs & cows inside their respective coops
      for (const a of roamingAnimals) {
        if (a.pauseTimer > 0) {
          a.pauseTimer -= dt;
          a.body.position.y = Math.sin(elapsed * 3.2 + a.phase) * 0.012;
          for (const leg of a.legs) leg.rotation.x = 0;
        } else {
          const dx = a.targetX - a.x;
          const dz = a.targetZ - a.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.18) {
            a.pauseTimer = 1.1 + ((wanderSeed * 17) % 19) * 0.1;
            wanderSeed += 1;
            const [nx, nz] = pickCoopSpot(a.coop, wanderSeed, Math.round(a.phase * 10));
            a.targetX = nx;
            a.targetZ = nz;
          } else {
            const step = Math.min(dist, a.speed * dt);
            a.x += (dx / dist) * step;
            a.z += (dz / dist) * step;
            const desiredRot = Math.atan2(dx, dz);
            let diff = desiredRot - a.rotY;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            a.rotY += diff * Math.min(1, dt * 6);
            a.root.position.set(a.x, 0, a.z);
            a.root.rotation.y = a.rotY;
            a.body.position.y = Math.abs(Math.sin(elapsed * 8.5 + a.phase)) * 0.04;
            a.legs.forEach((leg, li) => {
              leg.rotation.x = Math.sin(elapsed * 9.5 + a.phase + li * Math.PI) * 0.42;
            });
          }
        }
      }

      // Animate scattered feed pellets & swimming creatures inside rectangular pond
      if (pondFeedTimer > 0) {
        pondFeedTimer = Math.max(0, pondFeedTimer - dt);
        for (const p of pondPellets) {
          if (!p.active) continue;
          if (p.flight < 1) {
            p.flight = Math.min(1, p.flight + dt * 2.4);
            const u = p.flight;
            const px = THREE.MathUtils.lerp(p.startX, p.targetX, u);
            const pz = THREE.MathUtils.lerp(p.startZ, p.targetZ, u);
            const py = THREE.MathUtils.lerp(0.85, 0.065, u) + Math.sin(u * Math.PI) * 0.72;
            p.mesh.position.set(px, py, pz);
          } else if (!p.eaten) {
            p.mesh.position.y = 0.062 + Math.sin(elapsed * 5 + p.targetX) * 0.012;
          }
        }
        if (pondFeedTimer <= 0) {
          for (const p of pondPellets) {
            p.active = false;
            p.mesh.visible = false;
          }
        }
      }

      for (const f of swimmingFish) {
        const baseY = f.isSurface ? 0.082 : 0.052;
        // Look for nearest landed, uneaten pellet if feeding is active
        let nearestPellet: PondPelletCtrl | null = null;
        let bestDist = Infinity;
        if (pondFeedTimer > 0 && !f.sick) {
          for (const p of pondPellets) {
            if (!p.active || p.eaten || p.flight < 1) continue;
            const d = Math.hypot(p.targetX - f.x, p.targetZ - f.z);
            if (d < bestDist) {
              bestDist = d;
              nearestPellet = p;
            }
          }
        }

        if (nearestPellet) {
          const dx = nearestPellet.targetX - f.x;
          const dz = nearestPellet.targetZ - f.z;
          const step = Math.min(bestDist, 1.55 * dt);
          if (bestDist < 0.36) {
            nearestPellet.eaten = true;
            nearestPellet.mesh.visible = false;
          } else {
            f.x += (dx / bestDist) * step;
            f.z += (dz / bestDist) * step;
            const desiredRot = Math.atan2(dx, dz);
            let diff = desiredRot - f.rotY;
            while (diff > Math.PI) diff -= Math.PI * 2;
            while (diff < -Math.PI) diff += Math.PI * 2;
            f.rotY += diff * Math.min(1, dt * 8);
          }
          f.group.position.set(f.x, baseY + Math.sin(elapsed * 5 + f.phase) * 0.02, f.z);
          f.group.rotation.y = f.rotY;
          f.tail.rotation.y = Math.sin(elapsed * 14 + f.phase) * 0.42;
        } else {
          const t = elapsed * f.speed + f.phase;
          const nx = f.cx + Math.cos(t) * f.rx;
          const nz = f.cz + Math.sin(t) * f.rz;
          const vx = nx - f.x;
          const vz = nz - f.z;
          f.x += vx * Math.min(1, dt * 4);
          f.z += vz * Math.min(1, dt * 4);
          f.rotY = Math.atan2(-Math.sin(t) * f.rx * f.speed, Math.cos(t) * f.rz * f.speed);
          f.group.position.set(f.x, baseY + Math.sin(elapsed * 3 + f.phase) * 0.015, f.z);
          f.group.rotation.y = f.rotY;
          f.tail.rotation.y = Math.sin(elapsed * 10 + f.phase) * 0.35;
        }
      }
    };
  } else if (zone === 'fishing') {
    const bank = new THREE.Mesh(
      new RoundedBoxGeometry(9.0, 0.5, 5.8, 2, 0.1),
      clayMat('#93CE74', 0.85),
    );
    bank.position.set(0, -0.25, 2.5);
    bank.userData = {kind: 'ground'};
    groundMesh = bank;
    group.add(bank);

    const water = new THREE.Mesh(
      new RoundedBoxGeometry(10.5, 0.3, 6.8, 2, 0.05),
      glossyClayMat('#4AB3DA', 0.12),
    );
    water.position.set(0, -0.32, -2.5);
    group.add(water);

    const pier = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 0.24, 4.2, 2, 0.05),
      clayMat('#C59160', 0.72),
    );
    pier.position.set(0, 0.06, -0.3);
    group.add(pier);
    colliders.push({type: 'box', x: -2.9, z: -2.1, hw: 1.8, hd: 1.85});
    colliders.push({type: 'box', x: 2.9, z: -2.1, hw: 1.8, hd: 1.85});
    colliders.push({type: 'box', x: 0, z: -3.2, hw: 1.6, hd: 0.8});

    const bobber = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
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
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    const wall = new THREE.Mesh(
      new RoundedBoxGeometry(8.4, 1.35, 0.32, 2, 0.06),
      clayMat('#382E57', 0.68),
    );
    wall.position.set(0, 0.68, -5.18);
    group.add(wall);

    const cab = new THREE.Group();
    cab.position.set(-1.95, 0, -2.8);
    const cabBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.7, 2.6, 1.35, 3, 0.1),
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
    addBoxProxy(cab, [1.9, 2.7, 1.6], [0, 1.3, 0], {kind: 'arcade_star', tx: -1.95, tz: -1.35}, clickTargets);
    colliders.push({type: 'box', x: -1.95, z: -2.8, hw: 0.9, hd: 0.72});
    labelAnchors.push({id: 'arcade_star', label: 'Máy Bắt Sao', worldPos: new THREE.Vector3(-1.95, 2.85, -2.8)});
    group.add(cab);

    const claw = new THREE.Group();
    claw.position.set(1.95, 0, -2.8);
    const clawBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.7, 1.15, 1.35, 3, 0.08),
      clayMat('#6DB2E6', 0.48),
    );
    clawBase.position.y = 0.58;
    const clawGlass = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 1.3, 1.2, 2, 0.06),
      new THREE.MeshPhysicalMaterial({
        color: '#DDF3FF',
        transparent: true,
        opacity: 0.52,
        roughness: 0.1,
        depthWrite: false,
      }),
    );
    clawGlass.position.y = 1.75;
    const plush = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), clayMat('#F4A261', 0.72));
    plush.position.set(-0.25, 1.35, 0);
    const plush2 = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), clayMat('#F7A8B8', 0.72));
    plush2.position.set(0.3, 1.32, 0.15);
    claw.add(clawBase, clawGlass, plush, plush2);
    addBoxProxy(claw, [1.9, 2.7, 1.6], [0, 1.3, 0], {kind: 'arcade_claw', tx: 1.95, tz: -1.35}, clickTargets);
    colliders.push({type: 'box', x: 1.95, z: -2.8, hw: 0.9, hd: 0.72});
    labelAnchors.push({id: 'arcade_claw', label: 'Gắp Thú Bông', worldPos: new THREE.Vector3(1.95, 2.85, -2.8)});
    group.add(claw);

    group.add(createExitDoorway('Ra Thị Trấn', [0, 0, 4.45], '#E86F74', clickTargets, labelAnchors));
  } else if (zone === 'boutique') {
    // Expanded boutique floor (12.8 x 11.6) housing Tina (Thời Trang) & Bob (Nội Thất)
    const floor = new THREE.Mesh(
      new RoundedBoxGeometry(12.8, 0.4, 11.6, 2, 0.08),
      clayMat('#EBD6CB', 0.72),
    );
    floor.position.y = -0.2;
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    const wall = new THREE.Mesh(
      new RoundedBoxGeometry(12.8, 1.55, 0.32, 2, 0.06),
      clayMat('#FCEEEF', 0.75),
    );
    wall.position.set(0, 0.76, -5.68);
    group.add(wall);

    // Subtle left/right wing rugs under Tina & Bob zones
    const rugTina = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.2, 0.05, 24),
      clayMat('#F5C6CE', 0.88),
    );
    rugTina.scale.set(1.12, 1, 0.85);
    rugTina.position.set(-2.7, 0.025, 0.25);
    group.add(rugTina);

    const rugBob = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.2, 0.05, 24),
      clayMat('#CBE3D5', 0.88),
    );
    rugBob.scale.set(1.12, 1, 0.85);
    rugBob.position.set(2.7, 0.025, 0.25);
    group.add(rugBob);

    // === LEFT COUNTER: TINA (FASHION) ===
    const tinaCounter = new THREE.Group();
    tinaCounter.position.set(-2.7, 0, -2.0);
    const tinaDesk = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, 0.96, 0.95, 3, 0.08),
      clayMat('#D9788A', 0.58),
    );
    tinaDesk.position.y = 0.48;
    const tinaDeskTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.98, 0.14, 1.1, 2, 0.05),
      clayMat('#FFF9F2', 0.5),
    );
    tinaDeskTop.position.y = 0.98;
    const registerBase = new THREE.Mesh(
      new RoundedBoxGeometry(0.55, 0.24, 0.42, 2, 0.04),
      clayMat('#F7D7A8', 0.55),
    );
    registerBase.position.set(0.75, 1.16, 0);
    const catalogBook = new THREE.Mesh(
      new RoundedBoxGeometry(0.65, 0.1, 0.46, 2, 0.03),
      glossyClayMat('#FFD166', 0.25),
    );
    catalogBook.position.set(-0.55, 1.1, 0.1);
    tinaCounter.add(tinaDesk, tinaDeskTop, registerBase, catalogBook);
    addBoxProxy(
      tinaCounter,
      [3.0, 1.5, 1.35],
      [0, 0.75, 0],
      {kind: 'open_shop', tx: -2.7, tz: -0.55},
      clickTargets,
    );
    colliders.push({type: 'box', x: -2.7, z: -2.0, hw: 1.52, hd: 0.62});
    group.add(tinaCounter);

    const tinaRig = buildAvatarRig(TINA_AVATAR);
    tinaRig.root.position.set(-2.7, 0, -2.95);
    tinaRig.root.rotation.y = 0;
    updateAvatarRigAnimation(tinaRig, 'idle', 0, false);
    group.add(tinaRig.root);
    addBoxProxy(
      group,
      [1.2, 2.0, 1.2],
      [-2.7, 1.0, -2.95],
      {kind: 'open_shop', tx: -2.7, tz: -0.55},
      clickTargets,
    );
    colliders.push({type: 'circle', x: -2.7, z: -2.95, r: 0.45});
    labelAnchors.push({
      id: 'tina_npc',
      label: 'Tina',
      worldPos: new THREE.Vector3(-2.7, 2.15, -2.95),
    });

    // === RIGHT COUNTER: BOB (FURNITURE) ===
    const bobCounter = new THREE.Group();
    bobCounter.position.set(2.7, 0, -2.0);
    const bobDesk = new THREE.Mesh(
      new RoundedBoxGeometry(2.8, 0.96, 0.95, 3, 0.08),
      clayMat('#769E84', 0.6),
    );
    bobDesk.position.y = 0.48;
    const bobDeskTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.98, 0.14, 1.1, 2, 0.05),
      clayMat('#E8C398', 0.54),
    );
    bobDeskTop.position.y = 0.98;
    // Mini furniture catalog + desk lamp accent
    const furnCatalog = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.1, 0.48, 2, 0.03),
      glossyClayMat('#74BFA9', 0.28),
    );
    furnCatalog.position.set(-0.55, 1.1, 0.1);
    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.28, 10),
      clayMat('#9C683D', 0.55),
    );
    lampStem.position.set(0.8, 1.18, -0.05);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.2, 0.18, 12),
      clayMat('#FFE6A7', 0.45),
    );
    lampShade.position.set(0.8, 1.38, -0.05);
    bobCounter.add(bobDesk, bobDeskTop, furnCatalog, lampStem, lampShade);
    addBoxProxy(
      bobCounter,
      [3.0, 1.5, 1.35],
      [0, 0.75, 0],
      {kind: 'open_furniture_shop', tx: 2.7, tz: -0.55},
      clickTargets,
    );
    colliders.push({type: 'box', x: 2.7, z: -2.0, hw: 1.52, hd: 0.62});
    group.add(bobCounter);

    const bobRig = buildAvatarRig(BOB_AVATAR);
    bobRig.root.position.set(2.7, 0, -2.95);
    bobRig.root.rotation.y = 0;
    updateAvatarRigAnimation(bobRig, 'idle', 0, false);
    group.add(bobRig.root);
    addBoxProxy(
      group,
      [1.2, 2.0, 1.2],
      [2.7, 1.0, -2.95],
      {kind: 'open_furniture_shop', tx: 2.7, tz: -0.55},
      clickTargets,
    );
    colliders.push({type: 'circle', x: 2.7, z: -2.95, r: 0.45});
    labelAnchors.push({
      id: 'bob_npc',
      label: 'Bob',
      worldPos: new THREE.Vector3(2.7, 2.15, -2.95),
    });

    group.add(createExitDoorway('Cửa Ra Phố', [0, 0, 4.95], '#E58E9A', clickTargets, labelAnchors));
  }

  return {
    group,
    groundMesh,
    clickTargets,
    labelAnchors,
    colliders,
    doors,
    wallSurfaces,
    triggerPondFeed: triggerPondFeedFn,
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
