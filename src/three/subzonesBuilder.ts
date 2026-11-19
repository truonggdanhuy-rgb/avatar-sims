import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BOB_AVATAR, TINA_AVATAR} from '../data/avatarCatalog';
import {FURNITURE_BY_ID} from '../data/furnitureCatalog';
import {GardenPlotState, PlacedFurniture, TimeOfDay, ZoneId} from '../types/game';
import {buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {buildFurnitureMesh} from './furniture3d';
import {
  clayMat,
  createCheckerFloorTexture,
  createWoodPlankTexture,
  glossyClayMat,
} from './materials';
import {TownAnchor, WorldCollider} from './townBuilder';

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
  },
): SubzoneWorld {
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];
  let doors: HouseDoorHandle[] | undefined;
  let wallSurfaces: HouseWallSurface[] | undefined;
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
    const grassFloor = new THREE.Mesh(
      new RoundedBoxGeometry(8.8, 0.4, 11.2, 3, 0.1),
      clayMat('#8ECC72', 0.85),
    );
    grassFloor.position.y = -0.21;
    grassFloor.userData = {kind: 'ground'};
    groundMesh = grassFloor;
    group.add(grassFloor);

    for (let i = -4; i <= 4; i++) {
      const picket = new THREE.Mesh(
        new RoundedBoxGeometry(0.45, 1.15, 0.16, 2, 0.04),
        clayMat('#FFF8EB', 0.72),
      );
      picket.position.set(i * 0.95, 0.58, -4.9);
      group.add(picket);
    }

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
    const ghGlass = new THREE.Mesh(new THREE.BoxGeometry(2.65, 1.35, 1.85), ghGlassMat);
    ghGlass.position.y = 1.12;
    const ghRoof = new THREE.Mesh(new THREE.ConeGeometry(1.85, 0.95, 4), ghGlassMat);
    ghRoof.rotation.y = Math.PI / 4;
    ghRoof.scale.set(1.15, 1, 0.82);
    ghRoof.position.y = 2.25;
    const ghBeam = new THREE.Mesh(new RoundedBoxGeometry(2.74, 0.09, 1.94, 2, 0.02), ghFrameMat);
    ghBeam.position.y = 1.8;
    gh.add(ghBase, ghGlass, ghRoof, ghBeam);
    group.add(gh);
    colliders.push({type: 'box', x: -2.15, z: -3.35, hw: 1.45, hd: 1.05});

    const well = new THREE.Group();
    well.position.set(2.55, 0, -3.1);
    const wellWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.82, 0.75, 14),
      clayMat('#9EA8B3', 0.78),
    );
    wellWall.position.y = 0.38;
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.08, 14),
      glossyClayMat('#63C1E8', 0.12),
    );
    wellWater.position.y = 0.74;
    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.65, 4), clayMat('#C9735B', 0.68));
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.position.y = 1.65;
    well.add(wellWall, wellWater, wellRoof);
    addBoxProxy(well, [1.8, 2.0, 1.8], [0, 1.0, 0], {kind: 'well', tx: 1.6, tz: -2.2}, clickTargets);
    colliders.push({type: 'circle', x: 2.55, z: -3.1, r: 0.9});
    labelAnchors.push({id: 'well', label: 'Giếng Nước', worldPos: new THREE.Vector3(2.55, 2.15, -3.1)});
    group.add(well);

    options.plots.forEach((plot, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const px = -2.2 + col * 2.2;
      const pz = -0.5 + row * 2.1;

      const plotGroup = new THREE.Group();
      plotGroup.position.set(px, 0, pz);

      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(1.65, 0.24, 1.55, 2, 0.05),
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
          new THREE.SphereGeometry(0.22, 9, 9),
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
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 7), clayMat('#4E9450'));
        stem.position.y = 0.42;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), glossyClayMat(fruitCol, 0.35));
        head.position.y = 0.68;
        plotGroup.add(stem, head);
      }

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
