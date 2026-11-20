import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BOB_AVATAR, TINA_AVATAR} from '../data/avatarCatalog';
import {POND_FISH_SPECIES} from '../data/farmCatalog';
import {FURNITURE_BY_ID, getHouseRoomAt, HouseRoomId} from '../data/furnitureCatalog';
import {
  CoopKind,
  CoopTroughs,
  GardenPlotState,
  LivestockAnimalState,
  PaintStyleSpec,
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
  createPaintPatternTexture,
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
    editFurnitureMode?: boolean;
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
    const WALL_H = 3.25;
    const BASE_H = 0.34;
    const UPPER_H = WALL_H - BASE_H; // 2.91m
    const DOOR_H = 2.45;
    const HEADER_H = WALL_H - DOOR_H; // 0.80m

    const placedList = options.placedFurniture || [];
    const roomFloorPaint: Partial<Record<HouseRoomId, PaintStyleSpec>> = {};
    const roomWallPaint: Partial<Record<HouseRoomId, PaintStyleSpec>> = {};
    for (const pf of placedList) {
      const cat = FURNITURE_BY_ID[pf.catalogId];
      if (!cat?.paintSpec) continue;
      const room = getHouseRoomAt(pf.x, pf.z);
      if (cat.paintSpec.target === 'floor') {
        roomFloorPaint[room] = cat.paintSpec;
      } else {
        roomWallPaint[room] = cat.paintSpec;
      }
    }

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

    const makeRoomFloorMat = (room: HouseRoomId, w: number, d: number): THREE.MeshStandardMaterial => {
      const spec = roomFloorPaint[room];
      if (spec) {
        const tex = createPaintPatternTexture(
          spec.pattern,
          spec.primary,
          spec.secondary,
          Math.max(2, Math.round(w / 1.9)),
          Math.max(2, Math.round(d / 1.9)),
        );
        disposables.push(tex);
        return new THREE.MeshStandardMaterial({map: tex, roughness: spec.roughness ?? 0.65});
      }
      if (room === 'kitchen') {
        const kitchenTex = createCheckerFloorTexture('#F7F1E5', '#EAE0CC');
        kitchenTex.repeat.set(4, 5);
        disposables.push(kitchenTex);
        return new THREE.MeshStandardMaterial({map: kitchenTex, roughness: 0.58});
      }
      if (room === 'bath') {
        const bathTex = createCheckerFloorTexture('#E4F4FB', '#CEE9F7');
        bathTex.repeat.set(4, 5);
        disposables.push(bathTex);
        return new THREE.MeshStandardMaterial({map: bathTex, roughness: 0.52});
      }
      const defTex = createWoodPlankTexture();
      defTex.repeat.set(Math.max(2, Math.round(w / 2.2)), Math.max(2, Math.round(d / 2.2)));
      disposables.push(defTex);
      return new THREE.MeshStandardMaterial({map: defTex, roughness: 0.76});
    };

    const roomFloors: {id: HouseRoomId; x: number; z: number; w: number; d: number}[] = [
      {id: 'living', x: -4.75, z: 3.5, w: 17.48, d: 7.98},
      {id: 'bedroom', x: -9.125, z: -5.0, w: 8.73, d: 8.98},
      {id: 'backroom', x: -0.375, z: -5.0, w: 8.73, d: 8.98},
      {id: 'kitchen', x: 7.25, z: 3.5, w: 6.45, d: 7.95},
      {id: 'bath', x: 7.25, z: -5.0, w: 6.45, d: 8.95},
    ];
    for (const rf of roomFloors) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(rf.w, rf.d),
        makeRoomFloorMat(rf.id, rf.w, rf.d),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(rf.x, 0.008, rf.z);
      group.add(mesh);
    }

    const outerWallMat = clayMat('#F5E8D2', 0.78);
    const innerWallMat = clayMat('#EFE0C7', 0.78);
    const baseboardMat = clayMat('#DFCEB4', 0.76);
    const trimWoodMat = clayMat('#9D6D44', 0.7);
    const doorWoodMat = clayMat('#B87B49', 0.65);
    const handleGoldMat = glossyClayMat('#F4C95D', 0.25);

    const getPaintedWallMat = (room: HouseRoomId | undefined, fallback: THREE.Material, spanLen: number): THREE.Material => {
      if (!room) return fallback;
      const spec = roomWallPaint[room];
      if (!spec) return fallback;
      const tex = createPaintPatternTexture(
        spec.pattern,
        spec.primary,
        spec.secondary,
        Math.max(1, Math.round(spanLen / 2.2)),
        1,
      );
      disposables.push(tex);
      return new THREE.MeshStandardMaterial({map: tex, roughness: spec.roughness ?? 0.78});
    };

    interface FaceRooms {
      posX?: HouseRoomId;
      negX?: HouseRoomId;
      posZ?: HouseRoomId;
      negZ?: HouseRoomId;
    }

    const buildWallMaterials = (
      fallback: THREE.Material,
      w: number,
      d: number,
      faceRooms?: FaceRooms,
    ): THREE.Material | THREE.Material[] => {
      if (!faceRooms) return fallback;
      const hasAnyPaint =
        (faceRooms.posX && roomWallPaint[faceRooms.posX]) ||
        (faceRooms.negX && roomWallPaint[faceRooms.negX]) ||
        (faceRooms.posZ && roomWallPaint[faceRooms.posZ]) ||
        (faceRooms.negZ && roomWallPaint[faceRooms.negZ]);
      if (!hasAnyPaint) return fallback;
      return [
        getPaintedWallMat(faceRooms.posX, fallback, d), // +x
        getPaintedWallMat(faceRooms.negX, fallback, d), // -x
        fallback, // +y
        fallback, // -y
        getPaintedWallMat(faceRooms.posZ, fallback, w), // +z
        getPaintedWallMat(faceRooms.negZ, fallback, w), // -z
      ];
    };

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
      faceRooms?: FaceRooms,
    ) => {
      const baseMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, BASE_H, d),
        baseboardMat,
      );
      baseMesh.position.set(x, BASE_H / 2, z);
      group.add(baseMesh);

      const upperMesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, UPPER_H, d),
        buildWallMaterials(mat, w, d, faceRooms),
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
      faceRooms?: FaceRooms,
    ) => {
      const upperWall = new THREE.Mesh(
        new THREE.BoxGeometry(w, HEADER_H, d),
        buildWallMaterials(mat, w, d, faceRooms),
      );
      upperWall.position.set(x, DOOR_H - BASE_H + HEADER_H / 2, z);
      sw.upperGroup.add(upperWall);

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

    // ---------- 1. OUTER PERIMETER WALLS (Split per room so wall paint stays strictly within each room!) ----------
    const wallBack = createSmartWallGroup({
      id: 'wall_back',
      axis: 'z',
      pos: -9.5,
      minSpan: -13.5,
      maxSpan: 10.5,
      outerSide: -1,
    });
    addWallSegment(wallBack, -9.195, -9.5, 8.89, 0.28, outerWallMat, 'wall_back_bed', true, [[-12.6, -5.5]], {
      posZ: 'bedroom',
    });
    addWallSegment(wallBack, -0.375, -9.5, 8.75, 0.28, outerWallMat, 'wall_back_mid', true, [[-4.0, 3.3]], {
      posZ: 'backroom',
    });
    addWallSegment(wallBack, 7.32, -9.5, 6.64, 0.28, outerWallMat, 'wall_back_bath', true, [[4.7, 9.7]], {
      posZ: 'bath',
    });

    const wallLeft = createSmartWallGroup({
      id: 'wall_left',
      axis: 'x',
      pos: -13.5,
      minSpan: -9.5,
      maxSpan: 7.5,
      outerSide: -1,
    });
    addWallSegment(wallLeft, -13.5, -4.93, 0.28, 8.86, outerWallMat, 'wall_left_bed', true, [[-8.7, -1.2]], {
      posX: 'bedroom',
    });
    addWallSegment(wallLeft, -13.5, 3.43, 0.28, 7.86, outerWallMat, 'wall_left_liv', true, [[0.3, 6.7]], {
      posX: 'living',
    });

    const wallRight = createSmartWallGroup({
      id: 'wall_right',
      axis: 'x',
      pos: 10.5,
      minSpan: -9.5,
      maxSpan: 7.5,
      outerSide: 1,
    });
    addWallSegment(wallRight, 10.5, -4.93, 0.28, 8.86, outerWallMat, 'wall_right_bath', true, [[-8.7, -1.2]], {
      negX: 'bath',
    });
    addWallSegment(wallRight, 10.5, 3.43, 0.28, 7.86, outerWallMat, 'wall_right_kit', true, [[4.9, 6.8]], {
      negX: 'kitchen',
    });

    const wallFront = createSmartWallGroup({
      id: 'wall_front',
      axis: 'z',
      pos: 7.5,
      minSpan: -13.5,
      maxSpan: 10.5,
      outerSide: 1,
      initHidden: true,
    });
    addWallSegment(wallFront, -8.27, 7.5, 10.74, 0.28, outerWallMat, 'wall_front_l', true, [[-12.6, -3.4]], {
      negZ: 'living',
    });
    addWallSegment(wallFront, 1.65, 7.5, 4.7, 0.28, outerWallMat, 'wall_front_r1', true, [[-0.2, 3.4]], {
      negZ: 'living',
    });
    addWallSegment(wallFront, 7.32, 7.5, 6.64, 0.28, outerWallMat, 'wall_front_r2', true, [[4.7, 9.7]], {
      negZ: 'kitchen',
    });
    addHeaderAboveOpening(wallFront, -1.8, 7.5, 2.2, 0.28, outerWallMat, {negZ: 'living'});

    // ---------- 2. INTERIOR PARTITION WALLS (Per-room inside faces!) ----------
    const partBedroomFront = createSmartWallGroup({
      id: 'part_bed_front',
      axis: 'z',
      pos: -0.5,
      minSpan: -13.5,
      maxSpan: -4.75,
    });
    addWallSegment(partBedroomFront, -11.35, -0.5, 4.02, 0.24, innerWallMat, 'part_bed_1', true, undefined, {
      posZ: 'living',
      negZ: 'bedroom',
    });
    addWallSegment(partBedroomFront, -6.105, -0.5, 2.71, 0.24, innerWallMat, 'part_bed_2', true, undefined, {
      posZ: 'living',
      negZ: 'bedroom',
    });
    addHeaderAboveOpening(partBedroomFront, -8.4, -0.5, 1.88, 0.24, innerWallMat, {
      posZ: 'living',
      negZ: 'bedroom',
    });

    const partBackFront = createSmartWallGroup({
      id: 'part_back_front',
      axis: 'z',
      pos: -0.5,
      minSpan: -4.75,
      maxSpan: 4.0,
    });
    addWallSegment(partBackFront, -3.045, -0.5, 3.41, 0.24, innerWallMat, 'part_back_1', true, undefined, {
      posZ: 'living',
      negZ: 'backroom',
    });
    addWallSegment(partBackFront, 2.27, -0.5, 3.46, 0.24, innerWallMat, 'part_back_2', true, undefined, {
      posZ: 'living',
      negZ: 'backroom',
    });
    addHeaderAboveOpening(partBackFront, -0.4, -0.5, 1.88, 0.24, innerWallMat, {
      posZ: 'living',
      negZ: 'backroom',
    });

    const partBackMid = createSmartWallGroup({
      id: 'part_back_mid',
      axis: 'x',
      pos: -4.75,
      minSpan: -9.5,
      maxSpan: -0.5,
    });
    addWallSegment(partBackMid, -4.75, -4.99, 0.24, 8.74, innerWallMat, 'part_back_mid', true, undefined, {
      posX: 'backroom',
      negX: 'bedroom',
    });

    const partKitchen = createSmartWallGroup({
      id: 'part_kitchen',
      axis: 'x',
      pos: 4.0,
      minSpan: -0.5,
      maxSpan: 7.5,
    });
    addWallSegment(partKitchen, 4.0, 0.66, 0.24, 2.08, innerWallMat, 'part_kit_1', true, undefined, {
      posX: 'kitchen',
      negX: 'living',
    });
    addWallSegment(partKitchen, 4.0, 6.03, 0.24, 2.66, innerWallMat, 'part_kit_2', true, undefined, {
      posX: 'kitchen',
      negX: 'living',
    });
    addHeaderAboveOpening(partKitchen, 4.0, 3.2, 0.24, 3.0, innerWallMat, {
      posX: 'kitchen',
      negX: 'living',
    });
    [1.7, 4.7].forEach((az) => {
      const pillar = new THREE.Mesh(
        new RoundedBoxGeometry(0.3, DOOR_H - BASE_H, 0.16, 2, 0.03),
        trimWoodMat,
      );
      pillar.position.set(4.0, (DOOR_H - BASE_H) / 2, az);
      partKitchen.upperGroup.add(pillar);
    });

    const partBathFront = createSmartWallGroup({
      id: 'part_bath_front',
      axis: 'z',
      pos: -0.5,
      minSpan: 4.0,
      maxSpan: 10.5,
    });
    addWallSegment(partBathFront, 4.335, -0.5, 0.43, 0.24, innerWallMat, 'part_bath_1', false, undefined, {
      posZ: 'kitchen',
      negZ: 'bath',
    });
    addWallSegment(partBathFront, 8.355, -0.5, 4.01, 0.24, innerWallMat, 'part_bath_2', true, undefined, {
      posZ: 'kitchen',
      negZ: 'bath',
    });
    addHeaderAboveOpening(partBathFront, 5.45, -0.5, 1.8, 0.24, innerWallMat, {
      posZ: 'kitchen',
      negZ: 'bath',
    });

    const partBackBath = createSmartWallGroup({
      id: 'part_back_bath',
      axis: 'x',
      pos: 4.0,
      minSpan: -9.5,
      maxSpan: -0.5,
    });
    addWallSegment(partBackBath, 4.0, -4.99, 0.24, 8.74, innerWallMat, 'part_back_bath', true, undefined, {
      posX: 'bath',
      negX: 'backroom',
    });

    wallSurfaces = wallSnapList;

    // ========== 3 INTERACTIVE HINGED INTERIOR DOORS ==========
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

      const leafH = DOOR_H - 0.04;
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

    // ========== DYNAMIC PLACED FURNITURE ITEMS (FLOOR + STACKED + WALL MOUNT + PAINTS) ==========
    placedList.forEach((pf) => {
      const cat = FURNITURE_BY_ID[pf.catalogId];
      if (!cat) return;

      const isPaintBucket = cat.kind === 'floor_paint' || cat.kind === 'wall_paint';
      if (isPaintBucket && !options.editFurnitureMode) {
        return;
      }

      const posY = pf.y ?? 0;
      const meshGroup = buildFurnitureMesh(cat);
      meshGroup.position.set(pf.x, posY, pf.z);
      meshGroup.rotation.y = pf.rotY;
      group.add(meshGroup);

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
          seatY: posY + 0.58,
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
          seatY: posY + 0.65,
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

      if (cat.kind === 'kitchen_l_counter') {
        const backCenter = toWorld(-0.03, -1.69);
        const rightCenter = toWorld(1.27, 0.95);
        addBoxProxy(meshGroup, [3.6, 1.1, 1.08], [-0.03, 0.55, -1.69], proxyData, clickTargets);
        addBoxProxy(meshGroup, [1.08, 1.1, 4.35], [1.27, 0.55, 0.95], proxyData, clickTargets);
        if (posY < 0.25) {
          colliders.push({
            type: 'box',
            id: `${pf.instanceId}_back`,
            x: backCenter.wx,
            z: backCenter.wz,
            hw: 1.82,
            hd: 0.56,
            rotY: pf.rotY,
          });
          colliders.push({
            type: 'box',
            id: `${pf.instanceId}_right`,
            x: rightCenter.wx,
            z: rightCenter.wz,
            hw: 0.56,
            hd: 2.22,
            rotY: pf.rotY,
          });
        }
      } else {
        const proxyCenterY = cat.wallMount ? (cat.mountHeight ?? 1.8) : 0.65;
        const proxyH = cat.surfaceHeight ? Math.max(0.55, cat.surfaceHeight) : 1.3;
        addBoxProxy(
          meshGroup,
          [Math.max(0.7, cat.halfW * 2), proxyH, Math.max(0.45, cat.halfD * 2)],
          [0, cat.wallMount ? proxyCenterY : proxyH / 2, 0],
          proxyData,
          clickTargets,
        );

        if (!cat.walkable && posY < 0.25) {
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
      }
    });

    // Clear open front exit doormat (no signboard blocking doorway & no floating "Ra Thị Trấn" text)
    const doormat = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 0.03, 0.92, 2, 0.015),
      clayMat('#C9735B', 0.8),
    );
    doormat.position.set(-1.8, 0.022, 6.95);
    const matTrim = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 0.036, 0.68, 2, 0.012),
      clayMat('#F4DEC8', 0.82),
    );
    matTrim.position.set(-1.8, 0.024, 6.95);
    group.add(doormat, matTrim);
    addBoxProxy(
      group,
      [2.1, 1.3, 1.1],
      [-1.8, 0.65, 7.15],
      {kind: 'exit', tx: -1.8, tz: 6.95},
      clickTargets,
    );

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

    // Sculpting helpers for rich Cozy Farm architecture
    const makeFarmSignTex = (
      title: string,
      subtitle: string,
      bg: string,
      border: string,
      textColor: string,
    ) => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 160;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.roundRect(6, 6, 500, 148, 22);
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.font = 'bold 48px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, 256, subtitle ? 64 : 82);
      if (subtitle) {
        ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.globalAlpha = 0.82;
        ctx.fillText(subtitle, 256, 114);
        ctx.globalAlpha = 1;
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(tex);
      return tex;
    };

    const buildShingleGableRoof = (
      spanW: number,
      peakH: number,
      depthD: number,
      roofCol: string,
      bargeCol: string,
      ridgeCol: string,
      courses = 4,
    ) => {
      const rg = new THREE.Group();
      const shape = new THREE.Shape();
      shape.moveTo(-spanW / 2, 0);
      shape.lineTo(0, peakH);
      shape.lineTo(spanW / 2, 0);
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: depthD,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
        bevelSegments: 2,
      });
      geo.center();
      const roofCore = new THREE.Mesh(geo, clayMat(roofCol, 0.66));
      rg.add(roofCore);

      // Overlapping shingle drip courses along both left & right slopes
      const slopeLen = Math.hypot(spanW / 2, peakH);
      const slopeAngle = Math.atan2(peakH, spanW / 2);
      const shingleMat = clayMat(roofCol, 0.62);
      const stepAlong = slopeLen / courses;
      for (let i = 0; i < courses; i++) {
        const distUp = (i + 0.45) * stepAlong;
        const frac = distUp / slopeLen;
        const yOff = -peakH / 2 + frac * peakH + 0.05;
        const xOff = spanW / 2 - frac * (spanW / 2);
        [-1, 1].forEach((side) => {
          const strip = new THREE.Mesh(
            new RoundedBoxGeometry(stepAlong * 1.06, 0.075, depthD + 0.12, 2, 0.02),
            shingleMat,
          );
          strip.position.set(side * xOff, yOff, 0);
          strip.rotation.z = side * -slopeAngle;
          rg.add(strip);
        });
      }

      // Carved gable bargeboards on front & back faces
      [-1, 1].forEach((zSide) => {
        [-1, 1].forEach((xSide) => {
          const board = new THREE.Mesh(
            new RoundedBoxGeometry(slopeLen + 0.12, 0.11, 0.09, 2, 0.025),
            clayMat(bargeCol, 0.7),
          );
          board.position.set(xSide * (spanW / 4), 0.04, zSide * (depthD / 2 + 0.04));
          board.rotation.z = xSide * -slopeAngle;
          rg.add(board);
        });
      });

      const ridge = new THREE.Mesh(
        new RoundedBoxGeometry(0.2, 0.16, depthD + 0.22, 2, 0.04),
        clayMat(ridgeCol, 0.64),
      );
      ridge.position.y = peakH / 2 + 0.05;
      rg.add(ridge);
      return rg;
    };

    const timberMat = clayMat('#8F5C36', 0.7);
    const warmStoneMat = clayMat('#B9AE9C', 0.84);
    const creamPlasterMat = clayMat('#FFF5E5', 0.78);
    const ironDarkMat = clayMat('#47515C', 0.46);
    let animatedMillWheel: THREE.Group | null = null;

    // === 1. BẾP NÔNG TRẠI ẤM CÚNG (Back Center: X = 0, Z = -8.8) ===
    const kitchenCottage = new THREE.Group();
    kitchenCottage.position.set(0, 0, -8.8);

    // Layered stone masonry porch foundation + 2 carved steps
    const kStoneBase = new THREE.Mesh(
      new RoundedBoxGeometry(5.15, 0.24, 3.85, 2, 0.06),
      warmStoneMat,
    );
    kStoneBase.position.y = 0.12;
    const kStep1 = new THREE.Mesh(
      new RoundedBoxGeometry(2.5, 0.12, 0.66, 2, 0.04),
      clayMat('#CEC1AC', 0.82),
    );
    kStep1.position.set(0, 0.06, 2.08);
    const kStep2 = new THREE.Mesh(
      new RoundedBoxGeometry(2.2, 0.12, 0.36, 2, 0.04),
      clayMat('#DCD0BC', 0.8),
    );
    kStep2.position.set(0, 0.18, 1.9);

    // Herb pots flanking entrance steps
    [-1.45, 1.45].forEach((hx) => {
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.15, 0.26, 9),
        clayMat('#C96C50', 0.7),
      );
      pot.position.set(hx, 0.24, 2.04);
      const bush = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 8, 7),
        clayMat('#5E9E62', 0.72),
      );
      bush.position.set(hx, 0.44, 2.04);
      kitchenCottage.add(pot, bush);
    });

    // Timber posts + angled knee braces
    [
      [-2.24, -1.62],
      [2.24, -1.62],
      [-2.24, 1.62],
      [2.24, 1.62],
      [-2.24, 0],
      [2.24, 0],
    ].forEach(([px, pz]) => {
      const post = new THREE.Mesh(
        new RoundedBoxGeometry(0.2, 2.38, 0.2, 2, 0.04),
        timberMat,
      );
      post.position.set(px, 1.42, pz);
      kitchenCottage.add(post);
    });
    [-2.24, 2.24].forEach((px) => {
      const brace = new THREE.Mesh(
        new RoundedBoxGeometry(0.11, 0.48, 0.11, 2, 0.02),
        timberMat,
      );
      brace.position.set(px > 0 ? px - 0.18 : px + 0.18, 2.24, 1.62);
      brace.rotation.z = px > 0 ? -0.7 : 0.7;
      kitchenCottage.add(brace);
    });

    // Back cottage wall with river-stone wainscot, cream plaster upper & wooden window + shutters
    const kWainscot = new THREE.Mesh(
      new RoundedBoxGeometry(4.52, 0.72, 0.26, 2, 0.04),
      warmStoneMat,
    );
    kWainscot.position.set(0, 0.6, -1.62);
    const kBackUpper = new THREE.Mesh(
      new RoundedBoxGeometry(4.46, 1.2, 0.2, 2, 0.04),
      creamPlasterMat,
    );
    kBackUpper.position.set(0, 1.54, -1.62);

    // Side half-walls for cozy sheltered look (keeping front completely open!)
    [-2.24, 2.24].forEach((sx) => {
      const sideStone = new THREE.Mesh(
        new RoundedBoxGeometry(0.2, 0.68, 3.24, 2, 0.04),
        warmStoneMat,
      );
      sideStone.position.set(sx, 0.58, 0);
      kitchenCottage.add(sideStone);
    });

    // Front lintel beam + hanging copper cookware rail
    const kFrontBeam = new THREE.Mesh(
      new RoundedBoxGeometry(4.65, 0.2, 0.22, 2, 0.04),
      timberMat,
    );
    kFrontBeam.position.set(0, 2.52, 1.62);

    // Cottage pitched layered terracotta shingle roof
    const kRoof = buildShingleGableRoof(5.6, 1.62, 4.25, '#D46B53', '#FFF5E0', '#A84B39', 4);
    kRoof.position.set(0, 3.36, 0);

    // Gable louver medallion + crisp wooden signboard `"BẾP NÔNG TRẠI"`
    const kSignTex = makeFarmSignTex('BẾP NÔNG TRẠI', 'Nấu ăn & làm bánh', '#FFF3DA', '#8A5632', '#4F321D');
    const kSignBoard = new THREE.Mesh(
      new RoundedBoxGeometry(2.05, 0.56, 0.1, 2, 0.03),
      [
        timberMat,
        timberMat,
        timberMat,
        timberMat,
        new THREE.MeshStandardMaterial({map: kSignTex, roughness: 0.6}),
        timberMat,
      ],
    );
    kSignBoard.position.set(0, 2.74, 2.18);

    // Stepped stone-and-brick hearth chimney + stone pot cap
    const kChimneyBody = new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 1.5, 0.62, 2, 0.05),
      clayMat('#AF5A47', 0.78),
    );
    kChimneyBody.position.set(1.55, 3.74, -0.78);
    const kChimneyCollar = new THREE.Mesh(
      new RoundedBoxGeometry(0.76, 0.16, 0.76, 2, 0.04),
      warmStoneMat,
    );
    kChimneyCollar.position.set(1.55, 4.48, -0.78);
    const kChimneyPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.2, 0.26, 8),
      clayMat('#9A4A3A', 0.74),
    );
    kChimneyPot.position.set(1.55, 4.66, -0.78);

    // Interior Artisanal Kitchen: Brick Arch Oven, Copper Soup Kettle, Butcher-Block Counter, Bread Basket
    const kCounter = new THREE.Mesh(
      new RoundedBoxGeometry(3.65, 0.84, 0.96, 2, 0.05),
      clayMat('#D8915E', 0.66),
    );
    kCounter.position.set(0, 0.66, -0.78);
    const kCounterSlab = new THREE.Mesh(
      new RoundedBoxGeometry(3.8, 0.12, 1.08, 2, 0.04),
      clayMat('#FFF9EF', 0.52),
    );
    kCounterSlab.position.set(0, 1.12, -0.78);

    const kOvenHearth = new THREE.Mesh(
      new RoundedBoxGeometry(1.12, 0.88, 0.9, 2, 0.06),
      clayMat('#B95A45', 0.72),
    );
    kOvenHearth.position.set(-1.18, 1.54, -0.92);
    const kOvenMouth = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.44, 0.14, 2, 0.04),
      ironDarkMat,
    );
    kOvenMouth.position.set(-1.18, 1.44, -0.45);
    const kOvenGlow = new THREE.Mesh(
      new RoundedBoxGeometry(0.32, 0.24, 0.06, 2, 0.02),
      new THREE.MeshStandardMaterial({
        color: '#FFB44C',
        emissive: '#FF7E29',
        emissiveIntensity: 0.7,
        roughness: 0.3,
      }),
    );
    kOvenGlow.position.set(-1.18, 1.38, -0.39);

    const kSoupPot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.26, 0.34, 12),
      glossyClayMat('#E7A63B', 0.28),
    );
    kSoupPot.position.set(0.18, 1.34, -0.74);
    const kPotRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.03, 6, 14),
      clayMat('#C97E2C', 0.35),
    );
    kPotRim.rotation.x = Math.PI / 2;
    kPotRim.position.set(0.18, 1.5, -0.74);

    const kBasket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.22, 0.2, 10),
      clayMat('#C58F52', 0.78),
    );
    kBasket.position.set(1.25, 1.26, -0.72);
    const kLoaf1 = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.1, 0.22, 5, 8),
      clayMat('#E6A355', 0.6),
    );
    kLoaf1.rotation.z = Math.PI / 2;
    kLoaf1.position.set(1.22, 1.39, -0.72);

    const kLanternMat = new THREE.MeshStandardMaterial({
      color: '#FFF4C2',
      emissive: '#FFCC66',
      emissiveIntensity: 0.5,
      roughness: 0.25,
    });
    const kLantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 9, 9), kLanternMat);
    kLantern.position.set(0, 2.24, 0.65);

    kitchenCottage.add(
      kStoneBase,
      kStep1,
      kStep2,
      kWainscot,
      kBackUpper,
      kFrontBeam,
      kRoof,
      kSignBoard,
      kChimneyBody,
      kChimneyCollar,
      kChimneyPot,
      kCounter,
      kCounterSlab,
      kOvenHearth,
      kOvenMouth,
      kOvenGlow,
      kSoupPot,
      kPotRim,
      kBasket,
      kLoaf1,
      kLantern,
    );
    addBoxProxy(
      kitchenCottage,
      [5.2, 4.2, 4.1],
      [0, 2.0, 0],
      {kind: 'farm_kitchen', tx: 0, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -8.8, hw: 2.58, hd: 1.92});
    group.add(kitchenCottage);

    // === 2. XƯỞNG ÉP & XAY CỐI ĐÁ (Back Left: X = -6.6, Z = -8.6) ===
    const millShed = new THREE.Group();
    millShed.position.set(-6.6, 0, -8.6);

    const mDeck = new THREE.Mesh(
      new RoundedBoxGeometry(3.45, 0.2, 2.75, 2, 0.05),
      warmStoneMat,
    );
    mDeck.position.y = 0.1;

    [
      [-1.46, -1.14],
      [1.46, -1.14],
      [-1.46, 1.14],
      [1.46, 1.14],
    ].forEach(([px, pz]) => {
      const p = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.15, 0.18, 2, 0.04), timberMat);
      p.position.set(px, 1.24, pz);
      millShed.add(p);
    });

    // Rear low slatted timber half-wall + angled roof canopy with copper vent cupola
    const mBackHalf = new THREE.Mesh(
      new RoundedBoxGeometry(2.85, 0.85, 0.16, 2, 0.03),
      clayMat('#B88454', 0.74),
    );
    mBackHalf.position.set(0, 0.62, -1.14);

    const mRoof = buildShingleGableRoof(3.85, 1.08, 3.05, '#5E986D', '#F7EDDA', '#437350', 3);
    mRoof.position.set(0, 2.76, 0);

    const mCupola = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.36, 0.56, 2, 0.04),
      creamPlasterMat,
    );
    mCupola.position.set(0, 3.44, 0);
    const mCupolaCap = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 0.32, 4),
      clayMat('#C97A4B', 0.55),
    );
    mCupolaCap.rotation.y = Math.PI / 4;
    mCupolaCap.position.set(0, 3.76, 0);

    // Granite Stone Mill Bench + Brass Hopper + Cider Press Oak Barrel + Animated 8-Spoked Mill Wheel!
    const millBench = new THREE.Mesh(
      new RoundedBoxGeometry(2.36, 0.78, 1.16, 2, 0.06),
      clayMat('#769E67', 0.64),
    );
    millBench.position.set(0, 0.58, -0.14);
    const millTop = new THREE.Mesh(
      new RoundedBoxGeometry(2.5, 0.12, 1.28, 2, 0.04),
      clayMat('#E8C597', 0.56),
    );
    millTop.position.set(0, 1.01, -0.14);

    const stoneFrame = new THREE.Mesh(
      new RoundedBoxGeometry(0.82, 0.62, 0.64, 2, 0.05),
      clayMat('#667687', 0.55),
    );
    stoneFrame.position.set(-0.55, 1.38, -0.14);

    const brassHopper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.16, 0.48, 12),
      glossyClayMat('#D89848', 0.36),
    );
    brassHopper.position.set(-0.55, 1.88, -0.14);

    // Oak cider/oil press barrel on right side of bench
    const pressBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.3, 0.58, 12),
      clayMat('#A87042', 0.7),
    );
    pressBarrel.position.set(0.58, 1.35, -0.14);
    const barrelHoop1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.025, 6, 14),
      ironDarkMat,
    );
    barrelHoop1.rotation.x = Math.PI / 2;
    barrelHoop1.position.set(0.58, 1.5, -0.14);
    const barrelHoop2 = barrelHoop1.clone();
    barrelHoop2.position.y = 1.2;

    // 8-spoked wooden watermill wheel mounted at front of millstone (rotates smoothly in updateFn!)
    const millWheelGroup = new THREE.Group();
    millWheelGroup.position.set(-0.55, 1.38, 0.25);
    const wheelRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.055, 8, 18),
      clayMat('#C9644C', 0.52),
    );
    const wheelHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.14, 10),
      ironDarkMat,
    );
    wheelHub.rotation.x = Math.PI / 2;
    millWheelGroup.add(wheelRim, wheelHub);
    for (let s = 0; s < 4; s++) {
      const spoke = new THREE.Mesh(
        new RoundedBoxGeometry(0.7, 0.05, 0.05, 2, 0.015),
        timberMat,
      );
      spoke.rotation.z = (s * Math.PI) / 4;
      millWheelGroup.add(spoke);
    }
    animatedMillWheel = millWheelGroup;

    // Burlap flour sack beside mill bench
    const mSack = new THREE.Mesh(new THREE.SphereGeometry(0.24, 9, 8), clayMat('#DEC084', 0.84));
    mSack.scale.set(1.0, 1.3, 0.9);
    mSack.position.set(1.05, 0.44, 0.64);

    millShed.add(
      mDeck,
      mBackHalf,
      mRoof,
      mCupola,
      mCupolaCap,
      millBench,
      millTop,
      stoneFrame,
      brassHopper,
      pressBarrel,
      barrelHoop1,
      barrelHoop2,
      millWheelGroup,
      mSack,
    );
    addBoxProxy(
      millShed,
      [3.6, 3.6, 2.8],
      [0, 1.7, 0],
      {kind: 'farm_mill', tx: -6.6, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: -6.6, z: -8.6, hw: 1.72, hd: 1.35});
    group.add(millShed);

    // === 3. GIẾNG NƯỚC ĐÁ XẾP MÁI NGÓI CỔ TÍCH (Back Far Left: X = -12.6, Z = -8.2) ===
    const well = new THREE.Group();
    well.position.set(-12.6, 0, -8.2);
    const wellApron = new THREE.Mesh(
      new THREE.CylinderGeometry(1.26, 1.34, 0.1, 18),
      clayMat('#D7C7AE', 0.88),
    );
    wellApron.position.y = 0.05;
    const wellCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.82, 0.74, 16),
      clayMat('#8C969E', 0.84),
    );
    wellCore.position.y = 0.42;

    // Two staggered tiers of 14 rounded fieldstones around the well body
    const wellBrickColors = ['#A8B1B8', '#98A2AB', '#B7BEC4', '#8A949E'];
    for (let tier = 0; tier < 2; tier++) {
      for (let bi = 0; bi < 14; bi++) {
        const ang = (bi / 14) * Math.PI * 2 + tier * (Math.PI / 14);
        const brick = new THREE.Mesh(
          new RoundedBoxGeometry(0.32, 0.24, 0.2, 2, 0.05),
          clayMat(wellBrickColors[(bi + tier) % wellBrickColors.length], 0.82),
        );
        brick.position.set(Math.sin(ang) * 0.79, 0.24 + tier * 0.28, Math.cos(ang) * 0.79);
        brick.rotation.y = ang;
        well.add(brick);
      }
    }
    const wellCoping = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.125, 8, 20),
      clayMat('#CBC0AB', 0.78),
    );
    wellCoping.rotation.x = Math.PI / 2;
    wellCoping.position.y = 0.8;
    const wellWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.06, 16),
      glossyClayMat('#38B7E5', 0.1),
    );
    wellWater.position.y = 0.68;

    const wellPostL = new THREE.Mesh(new RoundedBoxGeometry(0.15, 1.56, 0.15, 2, 0.03), timberMat);
    wellPostL.position.set(-0.82, 1.54, 0);
    const wellPostR = wellPostL.clone();
    wellPostR.position.x = 0.82;
    const wellBraceL = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.44, 0.1, 2, 0.02), timberMat);
    wellBraceL.position.set(-0.62, 1.98, 0);
    wellBraceL.rotation.z = -0.68;
    const wellBraceR = wellBraceL.clone();
    wellBraceR.position.x = 0.62;
    wellBraceR.rotation.z = 0.68;

    // Pitched layered shingle gable roof rotated along X axis
    const wellRoof = buildShingleGableRoof(2.2, 0.82, 1.82, '#CB6B51', '#FFF3DF', '#9E4B37', 3);
    wellRoof.rotation.y = Math.PI / 2;
    wellRoof.position.y = 2.66;

    // Brass hanging lantern under ridge
    const wLanternGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.095, 8, 8),
      new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.48,
        roughness: 0.25,
      }),
    );
    wLanternGlow.position.set(0, 2.08, 0.56);

    // Windlass + crank + coiled rope + iron-hooped bucket + sage watering can
    const windlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 1.62, 10),
      clayMat('#9E6B40', 0.72),
    );
    windlass.rotation.z = Math.PI / 2;
    windlass.position.y = 1.68;
    const ropeCoil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.36, 10),
      clayMat('#E2C892', 0.86),
    );
    ropeCoil.rotation.z = Math.PI / 2;
    ropeCoil.position.set(0, 1.68, 0);
    const crankArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.06, 0.26, 0.06, 2, 0.02),
      ironDarkMat,
    );
    crankArm.position.set(0.95, 1.6, 0.06);
    const rope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.52, 6),
      clayMat('#E2C892', 0.85),
    );
    rope.position.set(0, 1.4, 0);
    const hangBucket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.26, 10),
      clayMat('#AA7041', 0.72),
    );
    hangBucket.position.set(0, 1.06, 0);
    const bucketRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.02, 6, 12),
      ironDarkMat,
    );
    bucketRim.rotation.x = Math.PI / 2;
    bucketRim.position.set(0, 1.16, 0);

    // Sage watering can on stone apron
    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.18, 0.28, 10),
      glossyClayMat('#58A3B8', 0.36),
    );
    canBody.position.set(0.76, 0.24, 0.68);
    const canSpout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.05, 0.26, 8),
      glossyClayMat('#58A3B8', 0.36),
    );
    canSpout.position.set(0.92, 0.31, 0.68);
    canSpout.rotation.z = -0.8;

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
      wLanternGlow,
      windlass,
      ropeCoil,
      crankArm,
      rope,
      hangBucket,
      bucketRim,
      canBody,
      canSpout,
    );
    addBoxProxy(well, [2.2, 3.0, 2.2], [0, 1.4, 0], {kind: 'well', tx: -11.0, tz: -5.6}, clickTargets);
    colliders.push({type: 'circle', x: -12.6, z: -8.2, r: 1.08});
    group.add(well);

    // === 4A. BẢNG ĐƠN HÀNG MÁI NGÓI (Back Right: X = 5.2, Z = -8.4) ===
    const board = new THREE.Group();
    board.position.set(5.2, 0, -8.4);

    const bFootL = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.14, 0.42, 2, 0.04), warmStoneMat);
    bFootL.position.set(-1.02, 0.07, 0);
    const bFootR = bFootL.clone();
    bFootR.position.x = 1.02;

    const postL = new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.2, 0.18, 2, 0.03), timberMat);
    postL.position.set(-1.02, 1.15, 0);
    const postR = postL.clone();
    postR.position.x = 1.02;

    // Beveled wood outer frame + warm cork bulletin interior
    const boardFrame = new THREE.Mesh(
      new RoundedBoxGeometry(2.42, 1.42, 0.18, 2, 0.04),
      timberMat,
    );
    boardFrame.position.set(0, 1.54, 0);
    const corkMat = new THREE.Mesh(
      new RoundedBoxGeometry(2.14, 1.16, 0.2, 2, 0.02),
      clayMat('#D8A86C', 0.78),
    );
    corkMat.position.set(0, 1.54, 0.01);

    // Pitched shingle canopy over the bulletin board
    const boardRoof = buildShingleGableRoof(2.78, 0.62, 1.02, '#D46D55', '#FFF4DE', '#A84E3B', 2);
    boardRoof.position.set(0, 2.52, 0.06);

    // 4 slightly angled pastel order parchments + pushpin wax seals
    const slipSpecs: [number, number, number, string][] = [
      [-0.72, 1.62, 0.05, '#FFF8E6'],
      [-0.24, 1.48, -0.04, '#FFE6EA'],
      [0.26, 1.6, 0.03, '#E8F6EE'],
      [0.74, 1.49, -0.05, '#FFF1D4'],
    ];
    slipSpecs.forEach(([sx, sy, rot, col]) => {
      const slip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.03), clayMat(col, 0.7));
      slip.position.set(sx, sy, 0.12);
      slip.rotation.z = rot;
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 7), clayMat('#D94E5A', 0.45));
      pin.position.set(sx, sy + 0.18, 0.145);
      board.add(slip, pin);
    });

    // Parcel delivery bench + strapped kraft parcel beneath board
    const bench = new THREE.Mesh(
      new RoundedBoxGeometry(1.45, 0.12, 0.56, 2, 0.03),
      clayMat('#B47B4C', 0.74),
    );
    bench.position.set(0, 0.3, 0.36);
    const bCrate = new THREE.Mesh(
      new RoundedBoxGeometry(0.72, 0.4, 0.48, 2, 0.04),
      clayMat('#D39C62', 0.72),
    );
    bCrate.position.set(-0.22, 0.54, 0.36);
    const parcelBox = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.28, 0.38, 2, 0.03),
      clayMat('#E8D3AD', 0.75),
    );
    parcelBox.position.set(0.38, 0.48, 0.36);

    board.add(bFootL, bFootR, postL, postR, boardFrame, corkMat, boardRoof, bench, bCrate, parcelBox);
    addBoxProxy(
      board,
      [2.65, 2.8, 1.6],
      [0, 1.4, 0.15],
      {kind: 'order_board', tx: 5.2, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 5.2, z: -8.4, hw: 1.32, hd: 0.78});
    group.add(board);

    // === 4B. NHÀ KHO NÔNG TRẠI CÓ TỜI GÁC MÁI (Back Right: X = 9.0, Z = -8.5) ===
    const storageShed = new THREE.Group();
    storageShed.position.set(9.0, 0, -8.5);
    const sDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.65, 0.18, 2.2, 2, 0.05),
      warmStoneMat,
    );
    sDeck.position.y = 0.09;
    const sWalls = new THREE.Mesh(
      new RoundedBoxGeometry(2.3, 1.42, 1.84, 2, 0.05),
      creamPlasterMat,
    );
    sWalls.position.y = 0.88;

    // Corner timber pilasters
    [
      [-1.12, 0.88],
      [1.12, 0.88],
      [-1.12, -0.88],
      [1.12, -0.88],
    ].forEach(([px, pz]) => {
      const cp = new THREE.Mesh(new RoundedBoxGeometry(0.14, 1.44, 0.14, 2, 0.03), timberMat);
      cp.position.set(px, 0.88, pz);
      storageShed.add(cp);
    });

    const sRoof = buildShingleGableRoof(2.82, 1.05, 2.32, '#C7654A', '#FFF4DE', '#9B4834', 3);
    sRoof.position.set(0, 2.1, 0);

    // Jutting Hayloft Hoist Beam + Iron Pulley under Front Gable Peak
    const hoistBeam = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.14, 0.56, 2, 0.02),
      timberMat,
    );
    hoistBeam.position.set(0, 2.38, 1.24);
    const hoistPulley = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.07, 10),
      ironDarkMat,
    );
    hoistPulley.rotation.z = Math.PI / 2;
    hoistPulley.position.set(0, 2.26, 1.42);

    // X-Braced Double Barn Doors + Slatted Loft Window + Barn Sconce
    const sDoor = new THREE.Mesh(
      new RoundedBoxGeometry(1.1, 1.12, 0.12, 2, 0.03),
      clayMat('#A87043', 0.72),
    );
    sDoor.position.set(0, 0.72, 0.91);
    const sDoorCenterSplit = new THREE.Mesh(
      new RoundedBoxGeometry(0.05, 1.1, 0.14, 2, 0.01),
      timberMat,
    );
    sDoorCenterSplit.position.set(0, 0.72, 0.92);
    [-1, 1].forEach((side) => {
      const hinge = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, 0.08, 0.14, 2, 0.01),
        ironDarkMat,
      );
      hinge.position.set(side * 0.36, 1.02, 0.92);
      storageShed.add(hinge);
    });
    const sLoftWin = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.34, 0.12, 2, 0.03),
      glossyClayMat('#B5E0F5', 0.2),
    );
    sLoftWin.position.set(0, 1.82, 0.96);

    // Oak barrel, burlap grain sack, and crate on front stone apron
    const sBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.22, 0.48, 10),
      clayMat('#9F6A3E', 0.72),
    );
    sBarrel.position.set(-0.88, 0.4, 0.98);
    const sBarrelHoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.02, 6, 12),
      ironDarkMat,
    );
    sBarrelHoop.rotation.x = Math.PI / 2;
    sBarrelHoop.position.set(-0.88, 0.54, 0.98);
    const sSack = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 9, 8),
      clayMat('#E0BE7D', 0.82),
    );
    sSack.scale.set(1.0, 1.28, 0.9);
    sSack.position.set(0.84, 0.36, 0.98);

    storageShed.add(
      sDeck,
      sWalls,
      sRoof,
      hoistBeam,
      hoistPulley,
      sDoor,
      sDoorCenterSplit,
      sLoftWin,
      sBarrel,
      sBarrelHoop,
      sSack,
    );
    addBoxProxy(
      storageShed,
      [2.8, 2.9, 2.35],
      [0, 1.45, 0.1],
      {kind: 'farm_storage', tx: 9.0, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 9.0, z: -8.5, hw: 1.32, hd: 1.12});
    group.add(storageShed);

    // === 4C. XE BUS SHOP NÔNG TRẠI RETRO (Back Far Right: X = 14.8, Z = -8.4) ===
    const shopBus = new THREE.Group();
    shopBus.position.set(14.8, 0, -8.4);

    // 4 Rubber Tires + Silver Rims + Cream Hubcaps
    const tireMat = clayMat('#2E343A', 0.85);
    const hubMat = clayMat('#FFF3DC', 0.55);
    [
      [-1.46, 0.98],
      [1.46, 0.98],
      [-1.46, -0.98],
      [1.46, -0.98],
    ].forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 16), tireMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(wx, 0.4, wz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.3, 14), hubMat);
      hub.rotation.x = Math.PI / 2;
      hub.position.set(wx, 0.4, wz);
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8), ironDarkMat);
      nut.rotation.x = Math.PI / 2;
      nut.position.set(wx, 0.4, wz);
      shopBus.add(tire, hub, nut);
    });

    // Lower Mint Skirt, Upper Rounded Cream Cabin + Rounded Roof Cap
    const busLower = new THREE.Mesh(
      new RoundedBoxGeometry(4.78, 0.92, 2.04, 3, 0.16),
      clayMat('#66B087', 0.58),
    );
    busLower.position.set(0, 0.86, 0);
    const busBelt = new THREE.Mesh(
      new RoundedBoxGeometry(4.84, 0.12, 2.1, 2, 0.04),
      clayMat('#F5C85B', 0.52),
    );
    busBelt.position.set(0, 1.24, 0);
    const busUpper = new THREE.Mesh(
      new RoundedBoxGeometry(4.62, 1.06, 1.96, 3, 0.18),
      clayMat('#FFF6E3', 0.65),
    );
    busUpper.position.set(0.06, 1.72, 0);
    const busRoofCap = new THREE.Mesh(
      new RoundedBoxGeometry(4.32, 0.22, 1.76, 3, 0.1),
      clayMat('#FAF0DC', 0.66),
    );
    busRoofCap.position.set(0.08, 2.26, 0);

    // Cab Front (-X): Panoramic Split Windshield, Chrome Grille, Wing Mirrors, Headlamps & Bumper
    [-0.4, 0.4].forEach((wz) => {
      const pane = new THREE.Mesh(
        new RoundedBoxGeometry(0.14, 0.64, 0.72, 2, 0.05),
        glossyClayMat('#97D4EF', 0.16),
      );
      pane.position.set(-2.24, 1.72, wz);
      shopBus.add(pane);
    });
    const frontBumper = new THREE.Mesh(
      new RoundedBoxGeometry(0.24, 0.22, 2.12, 2, 0.07),
      clayMat('#EAE0CC', 0.54),
    );
    frontBumper.position.set(-2.4, 0.46, 0);
    const frontGrille = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.34, 0.76, 2, 0.03),
      clayMat('#E8DFCC', 0.5),
    );
    frontGrille.position.set(-2.38, 0.88, 0);
    const headLightL = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12),
      glossyClayMat('#FFE694', 0.18),
    );
    headLightL.rotation.z = Math.PI / 2;
    headLightL.position.set(-2.38, 0.84, -0.66);
    const headLightR = headLightL.clone();
    headLightR.position.z = 0.66;

    [-1.06, 1.06].forEach((mz) => {
      const mirror = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.22, 0.14, 2, 0.03),
        ironDarkMat,
      );
      mirror.position.set(-2.1, 1.62, mz);
      shopBus.add(mirror);
    });

    // Wide Serving Hatch + Lit Wood Shelves Inside + Brass Awning Struts + Oak Serving Shelf
    const hatchBack = new THREE.Mesh(
      new RoundedBoxGeometry(2.68, 0.94, 0.16, 2, 0.04),
      clayMat('#593B28', 0.82),
    );
    hatchBack.position.set(0.38, 1.66, 0.92);
    const counterShelf = new THREE.Mesh(
      new RoundedBoxGeometry(2.84, 0.12, 0.5, 2, 0.04),
      clayMat('#D99A5B', 0.65),
    );
    counterShelf.position.set(0.38, 1.2, 1.15);

    [
      [-0.78, '#E7B94B'],
      [-0.4, '#6BA383'],
      [-0.02, '#EF8432'],
      [0.36, '#59A6CE'],
      [0.74, '#D95970'],
    ].forEach(([gx, col], gi) => {
      const item = new THREE.Mesh(
        gi >= 3
          ? new THREE.CylinderGeometry(0.11, 0.11, 0.24, 9)
          : new RoundedBoxGeometry(0.22, 0.26, 0.14, 2, 0.03),
        glossyClayMat(col as string, 0.34),
      );
      item.position.set(0.38 + (gx as number), 1.39, 1.16);
      shopBus.add(item);
    });

    // Striped Scalloped Awning + Brass Support Arms
    for (let s = 0; s < 6; s++) {
      const stripe = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.11, 0.88, 2, 0.03),
        clayMat(s % 2 === 0 ? '#E4725B' : '#FFF7E8', 0.6),
      );
      stripe.position.set(0.38 - 1.2 + s * 0.48, 2.14, 1.28);
      stripe.rotation.x = 0.28;
      shopBus.add(stripe);
    }

    // Rooftop Rack + Crates + Canvas `"FARM SHOP"` Roof Billboard
    const rackRail = new THREE.Mesh(
      new RoundedBoxGeometry(2.75, 0.08, 1.38, 2, 0.02),
      ironDarkMat,
    );
    rackRail.position.set(0.45, 2.42, 0);
    const busCrate = new THREE.Mesh(
      new RoundedBoxGeometry(0.75, 0.36, 0.68, 2, 0.04),
      clayMat('#B97E49', 0.72),
    );
    busCrate.position.set(-0.35, 2.6, -0.15);

    const busSignTex = makeFarmSignTex('FARM SHOP', 'Hạt giống · Vật tư', '#FFE79B', '#7C512D', '#4A2F19');
    const roofSignBoard = new THREE.Mesh(
      new RoundedBoxGeometry(2.15, 0.56, 0.14, 2, 0.04),
      [
        timberMat,
        timberMat,
        timberMat,
        timberMat,
        new THREE.MeshStandardMaterial({map: busSignTex, roughness: 0.55}),
        timberMat,
      ],
    );
    roofSignBoard.position.set(0.65, 2.74, 0.44);

    // Cute A-Frame Chalkboard Menu Easel beside Front Wheel
    const easel = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.76, 0.12, 2, 0.03),
      clayMat('#3B4B44', 0.78),
    );
    easel.position.set(-1.95, 0.44, 1.36);
    easel.rotation.y = 0.35;
    easel.rotation.x = -0.15;

    shopBus.add(
      busLower,
      busBelt,
      busUpper,
      busRoofCap,
      frontBumper,
      frontGrille,
      headLightL,
      headLightR,
      hatchBack,
      counterShelf,
      rackRail,
      busCrate,
      roofSignBoard,
      easel,
    );
    addBoxProxy(
      shopBus,
      [5.1, 3.1, 2.7],
      [0, 1.5, 0.15],
      {kind: 'farm_shop', tx: 14.8, tz: -5.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 14.8, z: -8.4, hw: 2.5, hd: 1.2});
    group.add(shopBus);

    // === 5. HAI CHUỒNG NUÔI THÚ RỘNG RÃI VỚI ĐẤT CHUỒNG PHỦ ĐẦY & CÔNG TRÌNH TỈ MỈ ===
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

    // Raised Coop Cabin on Timber Legs + Layered Gable Roof + Side Egg Bay + Cleated Walk Ramp
    const cPlatform = new THREE.Mesh(
      new RoundedBoxGeometry(2.36, 0.18, 1.84, 2, 0.04),
      timberMat,
    );
    cPlatform.position.y = 0.24;
    [
      [-1.02, -0.78],
      [1.02, -0.78],
      [-1.02, 0.78],
      [1.02, 0.78],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.24, 0.14, 2, 0.02), timberMat);
      leg.position.set(lx, 0.12, lz);
      coopHouse.add(leg);
    });

    const cBody = new THREE.Mesh(
      new RoundedBoxGeometry(2.15, 1.24, 1.66, 2, 0.05),
      clayMat('#F5DAA2', 0.68),
    );
    cBody.position.y = 0.92;
    const cRoof = buildShingleGableRoof(2.68, 0.84, 2.08, '#D77252', '#FFF4DE', '#A34A33', 3);
    cRoof.position.set(0, 1.94, 0);

    // Side Nesting Bay Box on right side (+X)
    const cNestBay = new THREE.Mesh(
      new RoundedBoxGeometry(0.42, 0.54, 1.05, 2, 0.04),
      clayMat('#E8C587', 0.72),
    );
    cNestBay.position.set(1.22, 0.72, 0);
    const cNestLid = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.1, 1.12, 2, 0.03),
      clayMat('#D77252', 0.64),
    );
    cNestLid.position.set(1.24, 1.02, 0);
    cNestLid.rotation.z = -0.24;

    // Arched Pop-hole Hen Door + Slatted Ramp
    const cDoor = new THREE.Mesh(
      new RoundedBoxGeometry(0.54, 0.64, 0.12, 2, 0.05),
      clayMat('#6B4429', 0.76),
    );
    cDoor.position.set(0.32, 0.64, 0.84);
    const cRamp = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.06, 0.62, 2, 0.02),
      clayMat('#B9824D', 0.74),
    );
    cRamp.position.set(0.32, 0.16, 1.12);
    cRamp.rotation.x = 0.45;
    const cVent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12),
      clayMat('#FFF5E2', 0.65),
    );
    cVent.rotation.x = Math.PI / 2;
    cVent.position.set(0, 1.72, 0.92);

    coopHouse.add(cPlatform, cBody, cRoof, cNestBay, cNestLid, cDoor, cRamp, cVent);
    group.add(coopHouse);
    colliders.push({type: 'box', x: -19.25, z: -2.55, hw: 1.32, hd: 1.02});

    // Compartmentalized Laying Nest Boxes
    const nestRack = new THREE.Group();
    nestRack.position.set(-15.2, 0, -3.15);
    const nestBox = new THREE.Mesh(
      new RoundedBoxGeometry(1.58, 0.36, 0.74, 2, 0.04),
      clayMat('#A97447', 0.78),
    );
    nestBox.position.y = 0.18;
    [-0.48, 0, 0.48].forEach((nx) => {
      const divider = new THREE.Mesh(
        new RoundedBoxGeometry(0.06, 0.3, 0.68, 2, 0.01),
        timberMat,
      );
      divider.position.set(nx + 0.24, 0.24, 0);
      const strawPad = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6),
        clayMat('#ECCB69', 0.85),
      );
      strawPad.scale.set(1.0, 0.45, 0.9);
      strawPad.position.set(nx, 0.34, 0);
      nestRack.add(strawPad, ...(nx < 0.4 ? [divider] : []));
    });
    nestRack.add(nestBox);
    group.add(nestRack);
    colliders.push({type: 'box', x: -15.2, z: -3.15, hw: 0.88, hd: 0.45});

    const poultryTroughCount = options.troughs?.poultry ?? 0;
    const poultryTrough = new THREE.Group();
    poultryTrough.position.set(-12.3, 0, 1.18);
    const ptBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.44, 0.34, 0.56, 2, 0.05),
      clayMat('#9E6B40', 0.76),
    );
    ptBody.position.y = 0.17;
    const ptLip = new THREE.Mesh(
      new RoundedBoxGeometry(1.52, 0.08, 0.64, 2, 0.03),
      timberMat,
    );
    ptLip.position.y = 0.33;
    poultryTrough.add(ptBody, ptLip);
    if (poultryTroughCount > 0) {
      const feedFill = Math.min(1, 0.35 + poultryTroughCount * 0.14);
      const grain = new THREE.Mesh(
        new RoundedBoxGeometry(1.18, 0.14 * feedFill, 0.38, 2, 0.03),
        clayMat('#F3C95B', 0.7),
      );
      grain.position.y = 0.35;
      poultryTrough.add(grain);
    }
    group.add(poultryTrough);
    colliders.push({type: 'box', x: -12.3, z: 1.18, hw: 0.78, hd: 0.38});

    addBoxProxy(
      group,
      [10.8, 1.8, 6.2],
      [-15.8, 0.9, -0.9],
      {kind: 'pasture_spot', coop: 'poultry' as CoopKind, tx: -9.6, tz: -0.7},
      clickTargets,
    );

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

    // Classic Gambrel-Roof Country Red Barn Shelter with Cream X-Bracing & Loft Shutter
    const barn = new THREE.Group();
    barn.position.set(-19.2, 0, 4.7);

    const barnCurb = new THREE.Mesh(
      new RoundedBoxGeometry(2.85, 0.16, 2.25, 2, 0.04),
      warmStoneMat,
    );
    barnCurb.position.y = 0.08;
    const barnWallB = new THREE.Mesh(
      new RoundedBoxGeometry(2.65, 1.68, 0.2, 2, 0.04),
      clayMat('#CE5F4C', 0.68),
    );
    barnWallB.position.set(0, 0.96, -0.92);
    const barnWallL = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 1.68, 1.98, 2, 0.04),
      clayMat('#CE5F4C', 0.68),
    );
    barnWallL.position.set(-1.24, 0.96, 0);
    const barnPostR = new THREE.Mesh(
      new RoundedBoxGeometry(0.2, 1.68, 0.2, 2, 0.03),
      creamPlasterMat,
    );
    barnPostR.position.set(1.22, 0.96, 0.88);
    const barnPostFL = barnPostR.clone();
    barnPostFL.position.set(-1.22, 0.96, 0.88);

    // Crisp cream X-braces on side wall & upper Dutch stall lintel beam
    const barnFrontBeam = new THREE.Mesh(
      new RoundedBoxGeometry(2.65, 0.18, 0.2, 2, 0.03),
      creamPlasterMat,
    );
    barnFrontBeam.position.set(0, 1.72, 0.88);

    const barnRoof = buildShingleGableRoof(3.15, 1.15, 2.52, '#7D4D33', '#FFF5E0', '#5E3824', 3);
    barnRoof.position.set(0, 2.34, 0);

    const barnLoftDoor = new THREE.Mesh(
      new RoundedBoxGeometry(0.56, 0.44, 0.12, 2, 0.03),
      clayMat('#B55240', 0.7),
    );
    barnLoftDoor.position.set(0, 2.12, 1.18);
    const barnLantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 8, 8),
      new THREE.MeshStandardMaterial({
        color: '#FFF4C2',
        emissive: '#FFCC66',
        emissiveIntensity: 0.45,
        roughness: 0.25,
      }),
    );
    barnLantern.position.set(0, 1.62, 1.04);

    barn.add(
      barnCurb,
      barnWallB,
      barnWallL,
      barnPostR,
      barnPostFL,
      barnFrontBeam,
      barnRoof,
      barnLoftDoor,
      barnLantern,
    );
    group.add(barn);
    colliders.push({type: 'box', x: -19.2, z: 4.7, hw: 1.45, hd: 1.1});

    // Sculpted Twine-Tied Hay Bales
    [
      [-12.0, 0.4, 4.25, 0.68, 0.4, 0],
      [-13.05, 0.34, 4.05, 0.58, 0.34, 0.35],
    ].forEach(([hx, hy, hz, hLen, hRad, rotY]) => {
      const bale = new THREE.Group();
      bale.position.set(hx, hy, hz);
      bale.rotation.y = rotY;
      const bodyCyl = new THREE.Mesh(
        new THREE.CylinderGeometry(hRad, hRad, hLen, 12),
        clayMat('#E8C05A', 0.84),
      );
      bodyCyl.rotation.z = Math.PI / 2;
      bale.add(bodyCyl);
      [-hLen * 0.24, hLen * 0.24].forEach((tx) => {
        const twine = new THREE.Mesh(
          new THREE.TorusGeometry(hRad + 0.01, 0.02, 6, 12),
          clayMat('#9C6938', 0.8),
        );
        twine.rotation.y = Math.PI / 2;
        twine.position.x = tx;
        bale.add(twine);
      });
      group.add(bale);
    });
    colliders.push({type: 'box', x: -12.5, z: 4.2, hw: 1.05, hd: 0.6});

    // Iron-Hooped Oak Drinking Water Tub
    const waterTub = new THREE.Group();
    waterTub.position.set(-19.1, 0, 9.05);
    const tubWall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.48, 0.44, 14),
      clayMat('#8E5D38', 0.78),
    );
    tubWall.position.y = 0.22;
    const tubHoopTop = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.024, 6, 16),
      ironDarkMat,
    );
    tubHoopTop.rotation.x = Math.PI / 2;
    tubHoopTop.position.y = 0.36;
    const tubWater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.49, 0.49, 0.06, 14),
      glossyClayMat('#55BCE6', 0.12),
    );
    tubWater.position.y = 0.41;
    waterTub.add(tubWall, tubHoopTop, tubWater);
    group.add(waterTub);
    colliders.push({type: 'circle', x: -19.1, z: 9.05, r: 0.64});

    const cattleTroughCount = options.troughs?.cattle ?? 0;
    const cattleTrough = new THREE.Group();
    cattleTrough.position.set(-12.3, 0, 9.05);
    const ctBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.58, 0.4, 0.64, 2, 0.05),
      clayMat('#9E6B40', 0.76),
    );
    ctBody.position.y = 0.2;
    const ctLip = new THREE.Mesh(
      new RoundedBoxGeometry(1.66, 0.08, 0.72, 2, 0.03),
      timberMat,
    );
    ctLip.position.y = 0.39;
    cattleTrough.add(ctBody, ctLip);
    if (cattleTroughCount > 0) {
      const feedFill = Math.min(1, 0.35 + cattleTroughCount * 0.16);
      const grain = new THREE.Mesh(
        new RoundedBoxGeometry(1.32, 0.16 * feedFill, 0.42, 2, 0.03),
        clayMat('#F3C95B', 0.7),
      );
      grain.position.y = 0.41;
      cattleTrough.add(grain);
    }
    group.add(cattleTrough);
    colliders.push({type: 'box', x: -12.3, z: 9.05, hw: 0.84, hd: 0.42});

    addBoxProxy(
      group,
      [10.8, 1.8, 7.0],
      [-15.8, 0.9, 6.7],
      {kind: 'pasture_spot', coop: 'cattle' as CoopKind, tx: -9.6, tz: 6.7},
      clickTargets,
    );

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
        {kind: 'pasture_spot', coop: ani.coop, tx: -9.6, tz: ani.coop === 'poultry' ? -0.7 : 6.7},
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

    // === 7. 36 Ô ĐẤT TRỒNG TRỌT (18 Ô MỖI BÊN · MÀU ĐẤT NHẠT DỊU MẮT) ===
    buildPicketRunX(-8.6, -2.5, 8.85);
    buildPicketRunX(2.5, 8.6, 8.85);

    const colXs = [-7.8, -5.6, -3.4, 3.4, 5.6, 7.8];
    const rowZs = [-2.3, -0.35, 1.6, 3.55, 5.5, 7.45];
    const halfCount = Math.max(1, Math.ceil(options.plots.length / 2));

    options.plots.forEach((plot, idx) => {
      const isRight = idx >= halfCount;
      const localIdx = idx % halfCount;
      const col = localIdx % 3;
      const row = Math.min(rowZs.length - 1, Math.floor(localIdx / 3));
      const px = colXs[(isRight ? 3 : 0) + col];
      const pz = rowZs[row];

      const plotGroup = new THREE.Group();
      plotGroup.position.set(px, 0, pz);

      const frame = new THREE.Mesh(
        new RoundedBoxGeometry(1.4, 0.22, 1.3, 2, 0.045),
        clayMat('#C8A982', 0.72),
      );
      frame.position.y = 0.11;
      const dirt = new THREE.Mesh(
        new RoundedBoxGeometry(1.18, 0.24, 1.1, 2, 0.03),
        clayMat(plot.watered ? '#7D5A3F' : '#AC8662', 0.92),
      );
      dirt.position.y = 0.13;
      plotGroup.add(frame, dirt);

      plotGroup.add(buildPlotBotanicalDecor(plot, disposables));

      const approachX = px < 0 ? px + 1.05 : px - 1.05;
      addBoxProxy(
        plotGroup,
        [1.46, 1.4, 1.36],
        [0, 0.65, 0],
        {kind: 'plot', plotId: plot.id, tx: approachX, tz: pz, px, pz},
        clickTargets,
      );
      colliders.push({type: 'box', x: px, z: pz, hw: 0.7, hd: 0.65});

      if (plot.hasPest && plot.stage !== 'empty') {
        labelAnchors.push({
          id: `plot_${plot.id}`,
          label: 'Sâu! Xịt thuốc',
          worldPos: new THREE.Vector3(px, 1.58, pz),
        });
      } else if (plot.stage === 'ready') {
        labelAnchors.push({
          id: `plot_${plot.id}`,
          label: 'Thu Hoạch!',
          worldPos: new THREE.Vector3(px, 1.58, pz),
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

      if (animatedMillWheel) {
        animatedMillWheel.rotation.z = -elapsed * 0.9;
      }

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
