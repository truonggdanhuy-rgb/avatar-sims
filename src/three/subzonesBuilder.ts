import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {BOB_AVATAR, IVAN_AVATAR, TINA_AVATAR} from '../data/avatarCatalog';
import {POND_FISH_SPECIES} from '../data/farmCatalog';
import {FARM_DECOR_BY_ID} from '../data/farmDecorCatalog';
import {FURNITURE_BY_ID, getHouseRoomAt, HouseRoomId} from '../data/furnitureCatalog';
import {
  BoatId,
  CoopKind,
  CoopTroughs,
  GardenPlotState,
  LivestockAnimalState,
  PaintStyleSpec,
  PlacedFarmDecor,
  PlacedFurniture,
  PondFishState,
  TimeOfDay,
  ZoneId,
} from '../types/game';
import {buildAvatarRig, updateAvatarRigAnimation} from './avatar3d';
import {buildPlotBotanicalDecor} from './crops3d';
import {
  DisplayFurnitureController,
  populateDisplayFurnitureItems,
  updateDisplayFurnitureAnimation,
} from './displayFurniture3d';
import {buildFarmDecorMesh} from './farmDecor3d';
import {
  createFishingSpotVisuals,
  FishingSpotVisuals,
  FishingVisualFrame,
} from './fishingVisuals3d';
import {buildFurnitureMesh} from './furniture3d';
import {buildPetModel, updatePetAnimation} from './pets3d';
import {
  applyAtlasRegionToGeometry,
  clayMat,
  createCheckerFloorTexture,
  createGrassTexture,
  createPaintPatternTexture,
  createWoodPlankTexture,
  getSharedSignAtlasMaterial,
  glossyClayMat,
  mergeStaticGroupByMaterial,
} from './materials';
import {buildMallInteriorScene} from './mallBuilder';
import {buildIslandScene} from './islandBuilder';
import type {InsectCatchEvaluation} from './insects3d';
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
  wallGroupId: string;
  axis: 'x' | 'z';
  pos: number;
  minSpan: number;
  maxSpan: number;
  thickness: number;
  outerSide?: 1 | -1;
  isUp: () => boolean;
}

export interface HouseLampInfo {
  id: string;
  name: string;
  x: number;
  z: number;
  isOn: boolean;
}

export interface SubzoneUpdateContext {
  cameraPos?: THREE.Vector3;
  playerPos?: {x: number; z: number};
}

export interface SubzoneWorld {
  group: THREE.Group;
  groundMesh: THREE.Mesh;
  groundMeshes?: THREE.Object3D[];
  clickTargets: THREE.Object3D[];
  labelAnchors: TownAnchor[];
  colliders: WorldCollider[];
  doors?: HouseDoorHandle[];
  wallSurfaces?: HouseWallSurface[];
  setHouseLightsOn?: (on: boolean) => void;
  getHouseLightsOn?: () => boolean;
  setLampOn?: (instanceId: string, on: boolean) => void;
  getHouseLamps?: () => HouseLampInfo[];
  setActiveBathtub?: (instanceId: string | null) => void;
  setActiveBed?: (instanceId: string | null) => void;
  triggerPondFeed?: () => void;
  setFishingState?: (state: 'idle' | 'waiting' | 'bite') => void;
  updateFishingVisuals?: (frame: FishingVisualFrame, elapsed: number) => void;
  setSwimRingPose?: (
    active: boolean,
    x?: number,
    z?: number,
    moving?: boolean,
    elapsed?: number,
  ) => void;
  setIslandBoatPose?: (
    active: boolean,
    x?: number,
    z?: number,
    rotY?: number,
    moving?: boolean,
    elapsed?: number,
    boatId?: BoatId,
  ) => void;
  setTreehouseFocus?: (active: boolean) => void;
  setMallSwingSeated?: (seated: boolean) => void;
  getMallSwingSeatPose?: () => {x: number; y: number; z: number; pitch: number} | null;
  setMallSeesawRider?: (side: -1 | 1 | null) => void;
  getMallSeesawSeatPose?: (
    side: -1 | 1,
  ) => {x: number; y: number; z: number; pitch: number; rotY: number} | null;
  updateInsects?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerSpeed: number,
    isCreeping: boolean,
    elapsed: number,
    delta: number,
    frustum?: THREE.Frustum,
    cameraX?: number,
    cameraZ?: number,
  ) => {escapedByRun: number; startledByRun: number};
  tryCatchInsect?: (
    playerX: number,
    playerY: number,
    playerZ: number,
    playerRotY: number,
  ) => InsectCatchEvaluation;
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
  mergeStaticGroupByMaterial(doorGroup);
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

const _livestockEmojiMatCache = new Map<string, THREE.SpriteMaterial>();
function getLivestockEmojiSpriteMaterial(emoji: string): THREE.SpriteMaterial {
  const cached = _livestockEmojiMatCache.get(emoji);
  if (cached) return cached;
  const w = emoji.length > 2 ? 144 : 96;
  const h = 96;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.font = '64px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, w / 2, h / 2 + 4);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
  });
  _livestockEmojiMatCache.set(emoji, mat);
  return mat;
}

export function buildSubzoneScene(
  zone: Exclude<ZoneId, 'town'>,
  options: {
    plots: GardenPlotState[];
    fishingState: 'idle' | 'waiting' | 'bite';
    placedFurniture?: PlacedFurniture[];
    editFurnitureMode?: boolean;
    placedFarmDecor?: PlacedFarmDecor[];
    editFarmDecorMode?: boolean;
    openDoors?: Record<string, boolean>;
    houseLightsOn?: boolean;
    lampStates?: Record<string, boolean>;
    livestock?: LivestockAnimalState[];
    troughs?: CoopTroughs;
    pondFish?: PondFishState[];
  },
): SubzoneWorld {
  if (zone === 'mall') {
    return buildMallInteriorScene();
  }
  if (zone === 'island') {
    return buildIslandScene({fishingState: options.fishingState});
  }
  const group = new THREE.Group();
  const clickTargets: THREE.Object3D[] = [];
  const labelAnchors: TownAnchor[] = [];
  const colliders: WorldCollider[] = [];
  const disposables: THREE.Texture[] = [];
  let doors: HouseDoorHandle[] | undefined;
  let wallSurfaces: HouseWallSurface[] | undefined;
  let setHouseLightsOnFn: ((on: boolean) => void) | undefined;
  let getHouseLightsOnFn: (() => boolean) | undefined;
  let setLampOnFn: ((instanceId: string, on: boolean) => void) | undefined;
  let getHouseLampsFn: (() => HouseLampInfo[]) | undefined;
  let setActiveBathtubFn: ((instanceId: string | null) => void) | undefined;
  let setActiveBedFn: ((instanceId: string | null) => void) | undefined;
  let triggerPondFeedFn: (() => void) | undefined;
  let currentFishingState: 'idle' | 'waiting' | 'bite' = options.fishingState ?? 'idle';
  let subzoneFishingVisuals: FishingSpotVisuals | null = null;
  let useExternalFishingFrame = false;
  const setFishingStateFn = (state: 'idle' | 'waiting' | 'bite') => {
    currentFishingState = state;
    useExternalFishingFrame = false;
    subzoneFishingVisuals?.setLegacyState(state);
  };
  const updateFishingVisualsFn = (frame: FishingVisualFrame, elapsed: number) => {
    useExternalFishingFrame = true;
    subzoneFishingVisuals?.applyFrame(frame, elapsed);
  };
  let updateFn: (elapsed: number, timeOfDay: TimeOfDay, context?: SubzoneUpdateContext) => void =
    () => {};

  const woodTex = createWoodPlankTexture('#CC965E', '#9E6C3B', zone === 'home' ? 9 : 3, zone === 'home' ? 7 : 3);

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
      baseMesh.userData = {kind: 'house_wall', wallId: sw.id};
      group.add(baseMesh);
      clickTargets.push(baseMesh);

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
              wallGroupId: sw.id,
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
            wallGroupId: sw.id,
            axis: sw.axis,
            pos: sw.pos,
            minSpan: centerSpan - halfSpan + 0.18,
            maxSpan: centerSpan + halfSpan - 0.18,
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
    addWallSegment(wallBack, -9.195, -9.5, 8.89, 0.28, outerWallMat, 'wall_back_bed', true, undefined, {
      posZ: 'bedroom',
    });
    addWallSegment(wallBack, -0.375, -9.5, 8.75, 0.28, outerWallMat, 'wall_back_mid', true, undefined, {
      posZ: 'backroom',
    });
    addWallSegment(wallBack, 7.32, -9.5, 6.64, 0.28, outerWallMat, 'wall_back_bath', true, undefined, {
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
    addWallSegment(wallLeft, -13.5, -4.93, 0.28, 8.86, outerWallMat, 'wall_left_bed', true, undefined, {
      posX: 'bedroom',
    });
    addWallSegment(wallLeft, -13.5, 3.43, 0.28, 7.86, outerWallMat, 'wall_left_liv', true, undefined, {
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
    addWallSegment(wallRight, 10.5, -4.93, 0.28, 8.86, outerWallMat, 'wall_right_bath', true, undefined, {
      negX: 'bath',
    });
    addWallSegment(wallRight, 10.5, 3.43, 0.28, 7.86, outerWallMat, 'wall_right_kit', true, undefined, {
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
    addWallSegment(wallFront, -8.27, 7.5, 10.74, 0.28, outerWallMat, 'wall_front_l', true, undefined, {
      negZ: 'living',
    });
    addWallSegment(wallFront, 1.65, 7.5, 4.7, 0.28, outerWallMat, 'wall_front_r1', true, undefined, {
      negZ: 'living',
    });
    addWallSegment(wallFront, 7.32, 7.5, 6.64, 0.28, outerWallMat, 'wall_front_r2', true, undefined, {
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

    // ========== HOUSE LIGHTS / CLOCKS / BATHTUBS / BEDS ==========
    let houseLightsOn = options.houseLightsOn ?? true;
    let activeBathtubId: string | null = null;
    const clockControllers: {
      hourPivot: THREE.Object3D;
      minPivot: THREE.Object3D;
      secPivot?: THREE.Object3D;
    }[] = [];
    const MAX_HOUSE_LIGHTS = 6;
    const houseLightPool = Array.from({length: MAX_HOUSE_LIGHTS}, () => {
      const pl = new THREE.PointLight('#FFD896', 0, 18, 1.15);
      group.add(pl);
      return pl;
    });
    const lampControllers: {
      id: string;
      name: string;
      x: number;
      z: number;
      lx: number;
      ly: number;
      lz: number;
      isOn: boolean;
      shadeMat?: THREE.MeshStandardMaterial;
      baseColor: string;
    }[] = [];
    const syncHousePointLights = () => {
      let slot = 0;
      for (const lamp of lampControllers) {
        if (lamp.isOn && slot < houseLightPool.length) {
          const pl = houseLightPool[slot++];
          pl.position.set(lamp.lx, lamp.ly, lamp.lz);
          pl.intensity = 18;
        }
      }
      while (slot < houseLightPool.length) {
        houseLightPool[slot++].intensity = 0;
      }
    };
    const bathtubControllers: {
      id: string;
      waterMesh: THREE.Mesh;
      streamMesh: THREE.Mesh;
      rippleMesh: THREE.Mesh;
      levelY: number;
    }[] = [];
    const bedControllers: {
      id: string;
      idleBlanket: THREE.Object3D;
      sleepBlanket: THREE.Object3D;
    }[] = [];
    const twinkleControllers: {
      lampId: string;
      bulbs: Array<{
        mesh: THREE.Mesh;
        mat: THREE.MeshStandardMaterial;
        phase: number;
        baseIntensity: number;
      }>;
    }[] = [];
    const vinylControllers: THREE.Object3D[] = [];
    const displayControllers: DisplayFurnitureController[] = [];

    setHouseLightsOnFn = (on: boolean) => {
      houseLightsOn = on;
    };
    getHouseLightsOnFn = () => houseLightsOn;

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

      if (meshGroup.userData.clockHourPivot && meshGroup.userData.clockMinPivot) {
        clockControllers.push({
          hourPivot: meshGroup.userData.clockHourPivot as THREE.Object3D,
          minPivot: meshGroup.userData.clockMinPivot as THREE.Object3D,
          secPivot: meshGroup.userData.clockSecPivot as THREE.Object3D | undefined,
        });
      }

      if (
        meshGroup.userData.tubWaterMesh &&
        meshGroup.userData.tubStreamMesh &&
        meshGroup.userData.tubRippleMesh
      ) {
        bathtubControllers.push({
          id: pf.instanceId,
          waterMesh: meshGroup.userData.tubWaterMesh as THREE.Mesh,
          streamMesh: meshGroup.userData.tubStreamMesh as THREE.Mesh,
          rippleMesh: meshGroup.userData.tubRippleMesh as THREE.Mesh,
          levelY: 0.28,
        });
      }

      if (meshGroup.userData.bedIdleBlanket && meshGroup.userData.bedSleepBlanket) {
        bedControllers.push({
          id: pf.instanceId,
          idleBlanket: meshGroup.userData.bedIdleBlanket as THREE.Object3D,
          sleepBlanket: meshGroup.userData.bedSleepBlanket as THREE.Object3D,
        });
      }

      if (meshGroup.userData.twinkleBulbs) {
        twinkleControllers.push({
          lampId: pf.instanceId,
          bulbs: meshGroup.userData.twinkleBulbs as Array<{
            mesh: THREE.Mesh;
            mat: THREE.MeshStandardMaterial;
            phase: number;
            baseIntensity: number;
          }>,
        });
      }
      if (meshGroup.userData.vinylDisc) {
        vinylControllers.push(meshGroup.userData.vinylDisc as THREE.Object3D);
      }

      if (
        cat.interactive === 'doll_display' ||
        cat.interactive === 'aquarium_display' ||
        cat.interactive === 'insect_display'
      ) {
        const displayCtrl = populateDisplayFurnitureItems(meshGroup, cat, pf.displayItems);
        if (displayCtrl) {
          displayControllers.push(displayCtrl);
        }
      }

      const isLampItem =
        cat.interactive === 'lamp' || cat.name.toLowerCase().includes('đèn');
      if (isLampItem) {
        const isOn = options.lampStates?.[pf.instanceId] ?? true;
        const localLight = (meshGroup.userData.lampLightLocalPos as [number, number, number]) || [
          0,
          1.4,
          0,
        ];
        const lPos = toWorld(localLight[0], localLight[2]);

        const shadeMat = meshGroup.userData.lampShadeMat as THREE.MeshStandardMaterial | undefined;
        if (shadeMat) {
          shadeMat.emissiveIntensity = isOn ? 0.78 : 0.04;
          if (cat.kind !== 'xmas_tree' && cat.kind !== 'xmas_wreath' && cat.kind !== 'tet_flower_wreath') {
            shadeMat.color.set(isOn ? cat.color : '#B8ADA0');
          }
        }
        lampControllers.push({
          id: pf.instanceId,
          name: cat.name,
          x: pf.x,
          z: pf.z,
          lx: lPos.wx,
          ly: posY + localLight[1],
          lz: lPos.wz,
          isOn,
          shadeMat,
          baseColor: cat.color,
        });
      }

      let proxyData: Record<string, unknown> = {
        kind: 'furniture',
        furnitureId: pf.instanceId,
        catalogId: pf.catalogId,
      };

      if (isLampItem) {
        const stand = toWorld(0, cat.wallMount ? 0.65 : cat.halfD + 0.52);
        proxyData = {
          kind: 'lamp',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          label: cat.name,
          tx: THREE.MathUtils.clamp(stand.wx, -12.7, 9.7),
          tz: THREE.MathUtils.clamp(stand.wz, -8.8, 6.8),
        };
      } else if (cat.interactive === 'sofa') {
        const front = toWorld(0, cat.halfD + 0.45);
        const seatLocalZ =
          cat.kind === 'sofa'
            ? 0.22
            : cat.kind === 'armchair'
              ? 0.21
              : cat.kind === 'beanbag_chair'
                ? 0.12
                : cat.kind === 'terrace_swing_egg'
                  ? 0.1
                  : cat.kind === 'vampire_coffin_sofa'
                    ? 0.08
                    : cat.kind === 'stool_pompompurin'
                      ? 0.04
                      : cat.kind === 'tet_chair'
                        ? 0.08
                        : 0.11;
        const seatPos = toWorld(0, seatLocalZ);
        const seatTopY = posY + (cat.surfaceHeight ?? 0.52);
        proxyData = {
          kind: 'sofa',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: front.wx,
          tz: front.wz,
          seatX: seatPos.wx,
          seatZ: seatPos.wz,
          seatY: seatTopY,
          sitRotY: pf.rotY,
          colliderId: pf.instanceId,
        };
      } else if (cat.interactive === 'bathtub') {
        const side = toWorld(0, cat.halfD + 0.48);
        const tubSeat = toWorld(-0.2, 0);
        proxyData = {
          kind: 'bathtub',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: THREE.MathUtils.clamp(side.wx, -12.7, 9.7),
          tz: THREE.MathUtils.clamp(side.wz, -8.8, 6.8),
          seatX: tubSeat.wx,
          seatZ: tubSeat.wz,
          seatY: posY + 0.245,
          sitRotY: pf.rotY + Math.PI / 2,
          colliderId: pf.instanceId,
        };
      } else if (cat.interactive === 'bed') {
        const side = toWorld(-(cat.halfW + 0.48), 0.35);
        const sleepAnchor = toWorld(0, 0.5);
        proxyData = {
          kind: 'bed',
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: side.wx,
          tz: side.wz,
          seatX: sleepAnchor.wx,
          seatZ: sleepAnchor.wz,
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
      } else if (cat.interactive === 'microwave' || cat.interactive === 'mini_oven') {
        const front = toWorld(0, cat.halfD + 0.56);
        proxyData = {
          kind: cat.interactive,
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: THREE.MathUtils.clamp(front.wx, -12.7, 9.7),
          tz: THREE.MathUtils.clamp(front.wz, -8.8, 6.8),
        };
      } else if (
        cat.interactive === 'doll_display' ||
        cat.interactive === 'aquarium_display' ||
        cat.interactive === 'insect_display'
      ) {
        const front = toWorld(0, cat.halfD + 0.6);
        proxyData = {
          kind: cat.interactive,
          furnitureId: pf.instanceId,
          catalogId: pf.catalogId,
          tx: THREE.MathUtils.clamp(front.wx, -12.7, 9.7),
          tz: THREE.MathUtils.clamp(front.wz, -8.8, 6.8),
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
        const isMiniDecor =
          !cat.wallMount && !cat.surfaceHeight && Math.max(cat.halfW, cat.halfD) <= 0.26;
        const isPcSetup = cat.kind === 'desktop_pc_set';
        const proxyCenterY = cat.wallMount ? (cat.mountHeight ?? 1.8) : 0.65;
        const proxyH = isMiniDecor
          ? 0.42
          : isPcSetup
            ? 0.62
            : cat.surfaceHeight
              ? Math.max(0.55, cat.surfaceHeight)
              : 1.3;
        addBoxProxy(
          meshGroup,
          [
            Math.max(isMiniDecor ? 0.24 : 0.7, cat.halfW * 2),
            proxyH,
            Math.max(isMiniDecor ? 0.24 : 0.45, cat.halfD * 2),
          ],
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

    syncHousePointLights();
    setLampOnFn = (instanceId: string, on: boolean) => {
      const lamp = lampControllers.find((l) => l.id === instanceId);
      if (!lamp) return;
      lamp.isOn = on;
      if (lamp.shadeMat) {
        lamp.shadeMat.emissiveIntensity = on ? 0.78 : 0.04;
        lamp.shadeMat.color.set(on ? lamp.baseColor : '#B8ADA0');
      }
      syncHousePointLights();
    };
    getHouseLampsFn = () =>
      lampControllers.map((l) => ({
        id: l.id,
        name: l.name,
        x: l.x,
        z: l.z,
        isOn: l.isOn,
      }));
    setActiveBathtubFn = (instanceId: string | null) => {
      activeBathtubId = instanceId;
    };
    setActiveBedFn = (instanceId: string | null) => {
      for (const b of bedControllers) {
        const active = b.id === instanceId;
        b.idleBlanket.visible = !active;
        b.sleepBlanket.visible = active;
      }
    };

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

      // 1. Live wall clock hands
      if (clockControllers.length > 0) {
        const now = new Date();
        const sec = now.getSeconds() + now.getMilliseconds() / 1000;
        const min = now.getMinutes() + sec / 60;
        const hr = (now.getHours() % 12) + min / 60;
        const secAng = -(sec / 60) * Math.PI * 2;
        const minAng = -(min / 60) * Math.PI * 2;
        const hrAng = -(hr / 12) * Math.PI * 2;
        for (const ck of clockControllers) {
          ck.hourPivot.rotation.z = hrAng;
          ck.minPivot.rotation.z = minAng;
          if (ck.secPivot) ck.secPivot.rotation.z = secAng;
        }
      }

      // 1b. Festive twinkling fairy lights & spinning retro vinyl platter
      for (const tw of twinkleControllers) {
        const lamp = lampControllers.find((l) => l.id === tw.lampId);
        const lit = lamp ? lamp.isOn : true;
        const seenMats = new Set<THREE.MeshStandardMaterial>();
        for (let b = 0; b < tw.bulbs.length; b++) {
          const bulb = tw.bulbs[b];
          const wave = 0.5 + 0.5 * Math.sin(elapsed * 3.8 + bulb.phase);
          bulb.mesh.scale.setScalar(lit ? 0.9 + wave * 0.28 : 0.85);
          if (!seenMats.has(bulb.mat)) {
            seenMats.add(bulb.mat);
            bulb.mat.emissiveIntensity = lit ? bulb.baseIntensity * (0.78 + wave * 0.42) : 0.05;
          }
        }
      }
      for (const disc of vinylControllers) {
        disc.rotation.y = elapsed * 1.45;
      }
      if (displayControllers.length > 0) {
        updateDisplayFurnitureAnimation(displayControllers, elapsed);
      }

      // 2. Flowing faucet stream & automatic neck-deep soaking water in bathtub
      for (const tb of bathtubControllers) {
        const isBathing = activeBathtubId === tb.id;
        const targetWaterY = isBathing ? 0.645 : 0.28;
        tb.levelY = THREE.MathUtils.damp(tb.levelY, targetWaterY, isBathing ? 4.8 : 3.5, dt);
        tb.waterMesh.position.y = tb.levelY + Math.sin(elapsed * 2.4) * 0.004;

        const waterSurfaceY = tb.waterMesh.position.y + 0.03;
        const streamLen = Math.max(0.08, 1.04 - waterSurfaceY);
        const pulse = 1 + Math.sin(elapsed * 14) * 0.08;
        const thickness = (isBathing ? 1.22 : 0.86) * pulse;
        tb.streamMesh.scale.set(thickness, streamLen / 0.72, thickness);
        tb.streamMesh.position.y = waterSurfaceY + streamLen * 0.5;

        const ripCycle = (elapsed * 1.35) % 1;
        const ripScale = 0.7 + ripCycle * (isBathing ? 3.2 : 2.1);
        tb.rippleMesh.scale.setScalar(ripScale);
        tb.rippleMesh.position.y = waterSurfaceY + 0.008;
        const ripMat = tb.rippleMesh.material as THREE.MeshBasicMaterial;
        ripMat.opacity = (1 - ripCycle) * (isBathing ? 0.85 : 0.62);
      }

      // 3. Smooth door swing animation
      for (const dc of doorControllers) {
        const target = dc.handle.isOpen ? dc.openAngle : dc.closedAngle;
        if (Math.abs(dc.currentAngle - target) > 0.002) {
          dc.currentAngle = THREE.MathUtils.damp(dc.currentAngle, target, 9, dt);
          dc.pivot.rotation.y = dc.currentAngle;
        }
      }

      // 4. Smart Wall Cutaway (Outer camera-facing walls + interior walls occluding the avatar)
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
    // Spacious Expanded Farm Estate (74m x 56m) — extra open meadow & garden plots + Farm Decor Stall
    const farmGrassTex = createGrassTexture(18, 14);

    const grassFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(74.0, 56.0),
      new THREE.MeshStandardMaterial({map: farmGrassTex, roughness: 0.88, metalness: 0}),
    );
    grassFloor.rotation.x = -Math.PI / 2;
    grassFloor.userData = {kind: 'ground'};
    groundMesh = grassFloor;
    group.add(grassFloor);

    const staticGardenGroup = new THREE.Group();

    // Sparse Town-Style Natural Stepping Stones directly on the grass (1 lightweight InstancedMesh draw call)
    const stepStoneSpots: [number, number, number, number][] = [];
    // Main center north-south stepping stones extending down to expanded exit gate (z = 21.8)
    for (let i = 0, pz = -4.2; pz <= 20.6; i++, pz += 1.24) {
      const sx = (i % 2 === 0 ? -0.44 : 0.44) + ((i % 3) - 1) * 0.08;
      const scale = 0.88 + (i % 3) * 0.14;
      stepStoneSpots.push([sx, pz, scale, (i * 0.55) % (Math.PI * 2)]);
    }
    // East-west workshop cross-path stepping stones extending cleanly to Bus Shop & Sạp Trang Trí
    for (let i = 0; i < 29; i++) {
      const px = -12.6 + i * 1.22;
      if (px > 20.6) break;
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

    // Tall broad-canopy trees surrounding the expanded 74x56 Farm Estate perimeter
    const {trunkGeo, lowerCanopyGeo, upperCanopyGeo} = createTreeGeometries();
    const farmTreeList: [number, number, number][] = [
      // Back grove (-Z)
      [-33.0, -24.5, 1.74],
      [-25.8, -24.8, 1.68],
      [-18.6, -24.9, 1.72],
      [-11.4, -25.0, 1.66],
      [-4.2, -25.0, 1.76],
      [3.0, -25.0, 1.68],
      [10.2, -24.9, 1.66],
      [17.4, -24.8, 1.72],
      [24.6, -24.7, 1.66],
      [32.5, -24.4, 1.75],
      // Left forest border (-X)
      [-33.6, -18.0, 1.7],
      [-33.8, -10.4, 1.76],
      [-33.8, -2.6, 1.68],
      [-33.8, 5.2, 1.74],
      [-33.6, 13.0, 1.68],
      [-33.0, 20.6, 1.65],
      // Right forest border (+X)
      [33.4, -18.0, 1.7],
      [33.8, -10.4, 1.76],
      [33.8, -2.6, 1.68],
      [33.8, 5.2, 1.74],
      [33.6, 13.0, 1.66],
      [32.8, 20.6, 1.64],
      // Front corner shade trees flanking the expanded south gate (x = 0, z = 21.8 stays clear)
      [-26.2, 23.6, 1.64],
      [-18.8, 23.8, 1.58],
      [-11.6, 23.8, 1.56],
      [-5.8, 23.8, 1.52],
      [5.8, 23.8, 1.54],
      [11.6, 23.8, 1.56],
      [18.8, 23.8, 1.58],
      [26.2, 23.6, 1.64],
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
      staticGardenGroup.add(rail);
      const count = Math.max(2, Math.round(len / 0.75) + 1);
      for (let i = 0; i < count; i++) {
        const px = xStart + (i / (count - 1)) * (xEnd - xStart);
        const picket = new THREE.Mesh(
          new RoundedBoxGeometry(0.14, 0.56, 0.1, 2, 0.03),
          picketWoodMat,
        );
        picket.position.set(px, 0.28, zPos);
        staticGardenGroup.add(picket);
      }
      colliders.push({type: 'box', x: midX, z: zPos, hw: len / 2 + 0.08, hd: 0.16});
    };

    // Low symbolic ranch fences (~0.42m posts + single low rail at y=0.25) so coops stay open & airy
    const buildRanchFenceX = (xStart: number, xEnd: number, zPos: number) => {
      const len = Math.abs(xEnd - xStart);
      const midX = (xStart + xEnd) / 2;
      const railLow = new THREE.Mesh(new RoundedBoxGeometry(len, 0.07, 0.07, 2, 0.02), ranchRailMat);
      railLow.position.set(midX, 0.25, zPos);
      staticGardenGroup.add(railLow);
      const count = Math.max(2, Math.round(len / 1.75) + 1);
      for (let i = 0; i < count; i++) {
        const px = xStart + (i / (count - 1)) * (xEnd - xStart);
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), ranchPostMat);
        post.position.set(px, 0.21, zPos);
        staticGardenGroup.add(post);
      }
      colliders.push({type: 'box', x: midX, z: zPos, hw: len / 2 + 0.06, hd: 0.14});
    };

    const buildRanchFenceZ = (xPos: number, zStart: number, zEnd: number) => {
      const len = Math.abs(zEnd - zStart);
      const midZ = (zStart + zEnd) / 2;
      const railLow = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.07, len, 2, 0.02), ranchRailMat);
      railLow.position.set(xPos, 0.25, midZ);
      staticGardenGroup.add(railLow);
      const count = Math.max(2, Math.round(len / 1.75) + 1);
      for (let i = 0; i < count; i++) {
        const pz = zStart + (i / (count - 1)) * (zEnd - zStart);
        const post = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.42, 0.13, 2, 0.03), ranchPostMat);
        post.position.set(xPos, 0.21, pz);
        staticGardenGroup.add(post);
      }
      colliders.push({type: 'box', x: xPos, z: midZ, hw: 0.14, hd: len / 2 + 0.06});
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

    // Gable louver medallion + crisp wooden signboard `"BẾP NÔNG TRẠI"` via shared Sign Atlas
    const kSignGeo = applyAtlasRegionToGeometry(
      new RoundedBoxGeometry(2.05, 0.56, 0.1, 2, 0.03),
      'farm_kitchen',
    );
    const kSignBoard = new THREE.Mesh(
      kSignGeo,
      [
        timberMat,
        timberMat,
        timberMat,
        timberMat,
        getSharedSignAtlasMaterial(),
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
    staticGardenGroup.add(kitchenCottage);

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
    staticGardenGroup.add(millShed);

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
    staticGardenGroup.add(well);

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
    staticGardenGroup.add(board);

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
    staticGardenGroup.add(storageShed);

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

    const busSignGeo = applyAtlasRegionToGeometry(
      new RoundedBoxGeometry(2.15, 0.56, 0.14, 2, 0.04),
      'farm_shop',
    );
    const roofSignBoard = new THREE.Mesh(
      busSignGeo,
      [
        timberMat,
        timberMat,
        timberMat,
        timberMat,
        getSharedSignAtlasMaterial(),
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
    staticGardenGroup.add(shopBus);

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
    staticGardenGroup.add(poultryEarth);

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
    staticGardenGroup.add(coopHouse);
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
    staticGardenGroup.add(nestRack);
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
    staticGardenGroup.add(poultryTrough);
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
    staticGardenGroup.add(cattleEarth);

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
    staticGardenGroup.add(barn);
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
      staticGardenGroup.add(bale);
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
    staticGardenGroup.add(waterTub);
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
    staticGardenGroup.add(cattleTrough);
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
      animAccum: number;
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

      const isHungry = ani.hunger < 45;
      if (ani.sick || isHungry) {
        const badgeY = ani.type === 'cow' ? 1.46 : ani.type === 'pig' ? 1.08 : 0.88;
        const emojiText = ani.sick && isHungry ? '🤢 🍽️' : ani.sick ? '🤢' : '🍽️';
        const emojiSprite = new THREE.Sprite(getLivestockEmojiSpriteMaterial(emojiText));
        emojiSprite.scale.set(emojiText.length > 2 ? 0.82 : 0.56, 0.56, 1);
        emojiSprite.position.set(0, badgeY, 0);
        emojiSprite.renderOrder = 12;
        aBody.add(emojiSprite);
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
        animAccum: (idx % 4) * 0.017,
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
    pondBed.renderOrder = 0;

    const pondWaterGeo = new THREE.ShapeGeometry(waterShape);
    pondWaterGeo.rotateX(-Math.PI / 2);
    const pondWater = new THREE.Mesh(
      pondWaterGeo,
      new THREE.MeshStandardMaterial({
        color: '#3AB7E2',
        roughness: 0.1,
        metalness: 0.08,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 0.78,
        depthWrite: false,
      }),
    );
    pondWater.position.set(pondCX, 0.055, pondCZ);
    pondWater.renderOrder = 3;

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

    group.add(pondBed, pondWater);
    staticGardenGroup.add(innerShore, outerBerm);

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
    const bladeGeo = new THREE.ConeGeometry(0.072, 0.54, 5);
    bladeGeo.translate(0, 0.27, 0);
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
      pad.renderOrder = 4;
      staticGardenGroup.add(pad);
      if (hasBloom) {
        const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), lotusMat);
        lotus.scale.set(1.2, 0.72, 1.2);
        lotus.position.set((lx as number) + 0.06, 0.1, lz as number);
        lotus.renderOrder = 4;
        staticGardenGroup.add(lotus);
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
    staticGardenGroup.add(pierDeck, pierStep, curbN, curbS);
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
      staticGardenGroup.add(post);
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
      animAccum: number;
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
      fGroup.position.set(cx, isSurface ? 0.082 : 0.045, cz);
      const fishOrder = isSurface ? 4 : 2;
      fGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.renderOrder = fishOrder;
        }
      });
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
        animAccum: (idx % 4) * 0.017,
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
      mesh.renderOrder = 4;
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

    // Play Together Fishing Visuals for Farm Pond (round brown bobber, underwater fish shadow & splash ripples)
    subzoneFishingVisuals = createFishingSpotVisuals({
      waterY: 0.06,
      defaultPos: [16.85, 0.06, 3.0],
      toolId: 'wooden_rod',
    });
    subzoneFishingVisuals.setLegacyState(currentFishingState);
    group.add(subzoneFishingVisuals.group);

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

    // === 8. 2 GHẾ GỐC CÂY MỘC MẠC TRONG SÂN NÔNG TRẠI (TỈ LỆ CHUẨN GHẾ NGỒI, ZERO CLIPPING) ===
    {
      const stumpBarkMat = clayMat('#8A5A36', 0.84);
      const stumpRingMat = clayMat('#E6C494', 0.72);
      const stumpCoreMat = clayMat('#CE9F68', 0.76);
      const sproutStemMat = clayMat('#5B8E42', 0.75);
      const sproutLeafMat = clayMat('#72BC59', 0.68);
      [
        {
          id: 'garden_stump_left',
          sx: -3.8,
          sz: 10.65,
          sitRotY: Math.PI * 0.5,
          tx: -2.92,
          tz: 10.65,
          sproutSide: -1,
        },
        {
          id: 'garden_stump_right',
          sx: 3.8,
          sz: 10.65,
          sitRotY: -Math.PI * 0.5,
          tx: 2.92,
          tz: 10.65,
          sproutSide: 1,
        },
      ].forEach(({id, sx, sz, sitRotY, tx, tz, sproutSide}) => {
        const stumpGroup = new THREE.Group();
        stumpGroup.position.set(sx, 0, sz);

        // Main carved tree-stump trunk & 4 subtle bark buttress roots
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.34, 0.41, 0.46, 12),
          stumpBarkMat,
        );
        trunk.position.y = 0.23;
        stumpGroup.add(trunk);

        for (let r = 0; r < 4; r++) {
          const ra = (r / 4) * Math.PI * 2 + 0.45;
          const root = new THREE.Mesh(
            new RoundedBoxGeometry(0.14, 0.16, 0.22, 2, 0.04),
            stumpBarkMat,
          );
          root.position.set(Math.sin(ra) * 0.34, 0.08, Math.cos(ra) * 0.34);
          root.rotation.y = ra;
          stumpGroup.add(root);
        }

        // Smooth sawn wood seat face (top at y = 0.49 => hips sit cleanly at y = 0.245)
        const sawnTop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.335, 0.345, 0.04, 14),
          stumpRingMat,
        );
        sawnTop.position.y = 0.47;
        const woodHeart = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.17, 0.044, 12),
          stumpCoreMat,
        );
        woodHeart.position.y = 0.472;
        stumpGroup.add(sawnTop, woodHeart);

        // Tiny botanical sprout on the outer back side (keeps knees clear)
        const twig = new THREE.Mesh(
          new THREE.CylinderGeometry(0.018, 0.024, 0.18, 6),
          sproutStemMat,
        );
        twig.position.set(sproutSide * 0.34, 0.24, -0.08);
        twig.rotation.z = sproutSide * -0.45;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 6), sproutLeafMat);
        leaf.scale.set(1.35, 0.42, 0.85);
        leaf.position.set(sproutSide * 0.41, 0.31, -0.08);
        stumpGroup.add(twig, leaf);

        staticGardenGroup.add(stumpGroup);

        addBoxProxy(
          group,
          [0.95, 0.85, 0.95],
          [sx, 0.42, sz],
          {
            kind: 'bench',
            tx,
            tz,
            seatX: sx,
            seatZ: sz,
            seatY: 0.49,
            sitRotY,
            colliderId: id,
          },
          clickTargets,
        );
        colliders.push({type: 'circle', id, x: sx, z: sz, r: 0.46});
      });
    }

    // === 9. SẠP TRANG TRÍ NÔNG TRẠI (ĐẶT THẲNG HÀNG NGAY CẠNH XE BUS SHOP: 19.8, -8.4) ===
    {
      const stallPos = {x: 19.8, z: -8.4};
      const stall = new THREE.Group();
      stall.position.set(stallPos.x, 0, stallPos.z);
      stall.rotation.y = 0;

      const woodDark = clayMat('#724626', 0.78);
      const woodWarm = clayMat('#C68D56', 0.68);
      const mintMat = clayMat('#52AF80', 0.54);
      const mintDarkMat = clayMat('#3B8D63', 0.58);
      const creamMat = clayMat('#FFF8EA', 0.62);
      const stoneTrimMat = clayMat('#D8CEBC', 0.82);
      const leafGreenMat = clayMat('#5AA85B', 0.68);
      const terraMat = clayMat('#D67B52', 0.72);
      const lanternGlowMat = new THREE.MeshStandardMaterial({
        color: '#FFF1B8',
        emissive: '#FFC95A',
        emissiveIntensity: 0.62,
        roughness: 0.35,
      });

      // Stepped stone plinth & warm timber deck
      const stoneBase = new THREE.Mesh(
        new RoundedBoxGeometry(3.66, 0.12, 2.38, 2, 0.04),
        stoneTrimMat,
      );
      stoneBase.position.y = 0.06;
      const deck = new THREE.Mesh(
        new RoundedBoxGeometry(3.46, 0.1, 2.18, 2, 0.03),
        woodWarm,
      );
      deck.position.y = 0.16;

      // Front boutique counter with slatted apron & cream stone counter top
      const counter = new THREE.Mesh(
        new RoundedBoxGeometry(2.96, 0.86, 0.72, 2, 0.04),
        woodWarm,
      );
      counter.position.set(0, 0.64, 0.44);
      for (let s = -4; s <= 4; s++) {
        const slat = new THREE.Mesh(
          new RoundedBoxGeometry(0.18, 0.66, 0.04, 1, 0.01),
          s % 2 === 0 ? mintMat : creamMat,
        );
        slat.position.set(s * 0.3, 0.62, 0.8);
        stall.add(slat);
      }
      const counterTop = new THREE.Mesh(
        new RoundedBoxGeometry(3.16, 0.1, 0.88, 2, 0.03),
        creamMat,
      );
      counterTop.position.set(0, 1.1, 0.44);

      // Rear boutique display wall & dual wooden shelves
      const backWall = new THREE.Mesh(
        new RoundedBoxGeometry(2.94, 1.56, 0.12, 2, 0.03),
        clayMat('#F5EAD4', 0.74),
      );
      backWall.position.set(0, 1.0, -0.78);
      const shelfTop = new THREE.Mesh(
        new RoundedBoxGeometry(2.62, 0.08, 0.34, 2, 0.02),
        woodWarm,
      );
      shelfTop.position.set(0, 1.62, -0.58);
      const shelfMid = new THREE.Mesh(
        new RoundedBoxGeometry(2.62, 0.08, 0.34, 2, 0.02),
        woodWarm,
      );
      shelfMid.position.set(0, 1.14, -0.58);
      stall.add(stoneBase, deck, counter, counterTop, backWall, shelfTop, shelfMid);

      // 4 carved corner timber posts + decorative diagonal eaves brackets
      [
        [-1.4, -0.78],
        [1.4, -0.78],
        [-1.4, 0.78],
        [1.4, 0.78],
      ].forEach(([px, pz]) => {
        const post = new THREE.Mesh(
          new RoundedBoxGeometry(0.15, 2.48, 0.15, 2, 0.03),
          woodDark,
        );
        post.position.set(px, 1.38, pz);
        const cap = new THREE.Mesh(
          new RoundedBoxGeometry(0.21, 0.12, 0.21, 2, 0.02),
          woodDark,
        );
        cap.position.set(px, 0.26, pz);
        stall.add(post, cap);
      });

      // Striped pitched boutique canopy + scalloped front valance
      const roofGroup = new THREE.Group();
      roofGroup.position.set(0, 2.66, 0.04);
      roofGroup.rotation.x = 0.18;
      for (let i = 0; i < 9; i++) {
        const sw = 3.74 / 9;
        const stripe = new THREE.Mesh(
          new RoundedBoxGeometry(sw - 0.015, 0.12, 2.34, 2, 0.03),
          i % 2 === 0 ? mintMat : creamMat,
        );
        stripe.position.set(-3.74 / 2 + sw * (i + 0.5), 0, 0);
        roofGroup.add(stripe);
      }
      for (let i = 0; i < 9; i++) {
        const sx = -1.66 + i * 0.415;
        const scallop = new THREE.Mesh(
          new THREE.CylinderGeometry(0.21, 0.21, 0.08, 12),
          i % 2 === 0 ? mintDarkMat : creamMat,
        );
        scallop.rotation.x = Math.PI / 2;
        scallop.position.set(sx, 2.38, 1.15);
        stall.add(scallop);
      }
      stall.add(roofGroup);

      // Crisp Canvas-textured "SẠP TRANG TRÍ" wooden roof sign
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 144;
      const sCtx = signCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#FFF7E4';
        sCtx.fillRect(0, 0, 512, 144);
        sCtx.strokeStyle = '#52AF80';
        sCtx.lineWidth = 10;
        sCtx.strokeRect(10, 10, 492, 124);
        sCtx.fillStyle = '#3B6E52';
        sCtx.font = '800 48px "Quicksand", "Nunito", sans-serif';
        sCtx.textAlign = 'center';
        sCtx.textBaseline = 'middle';
        sCtx.fillText('SẠP TRANG TRÍ', 256, 75);
      }
      const signTex = new THREE.CanvasTexture(signCanvas);
      signTex.colorSpace = THREE.SRGBColorSpace;
      signTex.anisotropy = 4;
      signTex.userData = {sharedCache: true};
      const signPlaque = new THREE.Mesh(
        new RoundedBoxGeometry(2.14, 0.52, 0.12, 2, 0.03),
        woodDark,
      );
      signPlaque.position.set(0, 2.98, 0.88);
      const signFace = new THREE.Mesh(
        new THREE.PlaneGeometry(1.94, 0.4),
        new THREE.MeshStandardMaterial({
          map: signTex,
          roughness: 0.48,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        }),
      );
      signFace.position.set(0, 2.98, 0.944);
      stall.add(signPlaque, signFace);

      // Warm glowing fairy bulbs tucked cleanly under the front eaves
      [-1.15, -0.58, 0, 0.58, 1.15].forEach((bx) => {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), lanternGlowMat);
        bulb.position.set(bx, 2.24, 1.05);
        stall.add(bulb);
      });

      // Cute miniature garden decor displays on counter & shelves
      // 1) Counter flower planter + blossoms
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.24, 10), terraMat);
      pot.position.set(-0.98, 1.27, 0.44);
      const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), leafGreenMat);
      leaves.scale.set(1.1, 0.65, 1.1);
      leaves.position.set(-0.98, 1.41, 0.44);
      [
        [-0.98, 1.54, 0.44, '#F7C53B'],
        [-1.08, 1.48, 0.5, '#F48FB1'],
        [-0.88, 1.49, 0.48, '#FFFDF7'],
      ].forEach(([fx, fy, fz, fcol]) => {
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 8, 7),
          glossyClayMat(fcol as string, 0.34),
        );
        flower.position.set(fx as number, fy as number, fz as number);
        stall.add(flower);
      });
      // 2) Counter miniature bench & watering can
      const miniBenchProp = new THREE.Mesh(
        new RoundedBoxGeometry(0.64, 0.22, 0.34, 2, 0.03),
        mintMat,
      );
      miniBenchProp.position.set(0.84, 1.26, 0.44);
      const canBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10),
        glossyClayMat('#7EC8E3', 0.3),
      );
      canBody.position.set(-0.08, 1.26, 0.44);
      const canSpout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.032, 0.2, 8),
        glossyClayMat('#7EC8E3', 0.3),
      );
      canSpout.position.set(0.06, 1.3, 0.44);
      canSpout.rotation.z = -0.75;
      stall.add(pot, leaves, miniBenchProp, canBody, canSpout);

      // 3) Back shelf props (mini wooden birdhouse, windmill model, ceramic vases)
      const birdHouse = new THREE.Mesh(
        new RoundedBoxGeometry(0.34, 0.36, 0.24, 2, 0.03),
        creamMat,
      );
      birdHouse.position.set(-0.82, 1.84, -0.56);
      const birdRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.22, 4),
        clayMat('#E87D64', 0.62),
      );
      birdRoof.rotation.y = Math.PI / 4;
      birdRoof.position.set(-0.82, 2.08, -0.56);
      const vase1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.09, 0.28, 10),
        glossyClayMat('#F7B267', 0.36),
      );
      vase1.position.set(0, 1.8, -0.56);
      const wreath = new THREE.Mesh(
        new THREE.TorusGeometry(0.19, 0.055, 8, 18),
        leafGreenMat,
      );
      wreath.position.set(0.76, 1.84, -0.52);
      const lanternMid = new THREE.Mesh(
        new RoundedBoxGeometry(0.22, 0.3, 0.22, 2, 0.03),
        lanternGlowMat,
      );
      lanternMid.position.set(-0.55, 1.32, -0.56);
      const pottedSucculent = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.1, 0.16, 10),
        terraMat,
      );
      pottedSucculent.position.set(0.55, 1.26, -0.56);
      const succTop = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.13, 0),
        leafGreenMat,
      );
      succTop.position.set(0.55, 1.4, -0.56);
      stall.add(birdHouse, birdRoof, vase1, wreath, lanternMid, pottedSucculent, succTop);

      // Flanking front floral planter boxes
      [-1.56, 1.56].forEach((px, pIdx) => {
        const planterBox = new THREE.Mesh(
          new RoundedBoxGeometry(0.46, 0.36, 0.66, 2, 0.03),
          woodDark,
        );
        planterBox.position.set(px, 0.24, 0.72);
        const bush = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), leafGreenMat);
        bush.scale.set(1.0, 0.75, 1.35);
        bush.position.set(px, 0.45, 0.72);
        stall.add(planterBox, bush);
        [-0.14, 0.14].forEach((fz, fIdx) => {
          const bloom = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 8, 7),
            glossyClayMat((pIdx + fIdx) % 2 === 0 ? '#FF9EB5' : '#FFD166', 0.36),
          );
          bloom.position.set(px, 0.58, 0.72 + fz);
          stall.add(bloom);
        });
      });

      staticGardenGroup.add(stall);
      colliders.push({type: 'box', x: stallPos.x, z: stallPos.z, hw: 1.88, hd: 1.25});
      addBoxProxy(
        group,
        [3.9, 3.1, 2.6],
        [stallPos.x, 1.5, stallPos.z],
        {kind: 'open_farm_decor_shop', tx: 19.8, tz: -5.4},
        clickTargets,
      );
      labelAnchors.push({
        id: 'farm_decor_stall',
        label: 'Sạp Trang Trí',
        worldPos: new THREE.Vector3(stallPos.x, 3.45, stallPos.z),
      });
    }

    const farmDecorWindmills: THREE.Object3D[] = [];
    const farmDecorBees: THREE.Object3D[] = [];
    const farmDecorDucks: THREE.Object3D[] = [];
    const farmDecorLanternMats: THREE.MeshStandardMaterial[] = [];
    const placedFarmDecorList = options.placedFarmDecor ?? [];
    placedFarmDecorList.forEach((pf) => {
      const cat = FARM_DECOR_BY_ID[pf.catalogId];
      if (!cat) return;
      const built = buildFarmDecorMesh(cat, {isNight: false});
      built.group.position.set(pf.x, 0, pf.z);
      built.group.rotation.y = pf.rotY;
      group.add(built.group);

      if (built.windmillBlades) farmDecorWindmills.push(built.windmillBlades);
      if (built.hoverBees) farmDecorBees.push(built.hoverBees);
      if (built.floatingDuck) farmDecorDucks.push(built.floatingDuck);
      if (built.lanternMat) farmDecorLanternMats.push(built.lanternMat);

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

      addBoxProxy(
        built.group,
        [Math.max(0.9, cat.halfW * 2.1), 1.65, Math.max(0.9, cat.halfD * 2.1)],
        [0, 0.82, 0],
        {kind: 'farm_decor', farmDecorId: pf.instanceId, catalogId: pf.catalogId},
        clickTargets,
      );
    });

    if (options.editFarmDecorMode) {
      const guideMat = clayMat('#FFF8D6', 0.45);
      const borderSpecs: [number, number, number, number][] = [
        [0, -21.5, 61.0, 0.14],
        [0, 21.5, 61.0, 0.14],
        [-30.5, 0, 0.14, 43.0],
        [30.5, 0, 0.14, 43.0],
      ];
      borderSpecs.forEach(([bx, bz, bw, bd]) => {
        const line = new THREE.Mesh(new RoundedBoxGeometry(bw, 0.04, bd, 1, 0.01), guideMat);
        line.position.set(bx, 0.025, bz);
        staticGardenGroup.add(line);
      });
    }

    mergeStaticGroupByMaterial(
      staticGardenGroup,
      animatedMillWheel ? new Set([animatedMillWheel]) : undefined,
    );
    group.add(staticGardenGroup);
    group.add(createExitDoorway('Cổng Thị Trấn', [0, 0, 21.8], '#6EA85C', clickTargets, labelAnchors));

    let prevFarmElapsed = 0;
    let wanderSeed = 11;
    let millAnimAccum = 0;
    let lastFarmTod: TimeOfDay | null = null;
    updateFn = (elapsed, tod, context) => {
      const dt = prevFarmElapsed > 0 ? Math.min(0.08, elapsed - prevFarmElapsed) : 0.016;
      prevFarmElapsed = elapsed;
      const camX = context?.cameraPos?.x ?? 0;
      const camZ = context?.cameraPos?.z ?? 6;

      if (tod !== lastFarmTod) {
        lastFarmTod = tod;
        const nightEmissive = tod === 'night' ? 1.85 : 0.22;
        farmDecorLanternMats.forEach((m) => {
          m.emissiveIntensity = nightEmissive;
        });
      }

      farmDecorWindmills.forEach((blades, idx) => {
        blades.rotation.z = -elapsed * 0.72 + idx * 0.5;
      });
      farmDecorBees.forEach((bees, idx) => {
        bees.rotation.y = elapsed * 1.45 + idx * 0.9;
        bees.position.y = 0.88 + Math.sin(elapsed * 3.4 + idx) * 0.04;
      });
      farmDecorDucks.forEach((duck, idx) => {
        duck.position.y = 0.14 + Math.sin(elapsed * 2.5 + idx) * 0.022;
        duck.rotation.y = Math.sin(elapsed * 0.7 + idx) * 0.35;
      });

      if (animatedMillWheel) {
        const millDistSq = (camX + 6.6) * (camX + 6.6) + (camZ + 8.6) * (camZ + 8.6);
        millAnimAccum += dt;
        const stepInterval = millDistSq > 400 ? 0.08 : 0;
        if (millAnimAccum >= stepInterval) {
          millAnimAccum = 0;
          animatedMillWheel.rotation.z = -elapsed * 0.9;
        }
      }

      // Animate free-roaming chickens, ducks, pigs & cows with distance-throttled visual updates
      for (const a of roamingAnimals) {
        const dxCam = a.x - camX;
        const dzCam = a.z - camZ;
        const distSqCam = dxCam * dxCam + dzCam * dzCam;
        const animInterval = distSqCam > 441 ? 0.075 : 0;
        if (a.pauseTimer > 0) {
          a.pauseTimer -= dt;
          a.animAccum += dt;
          if (a.animAccum >= animInterval) {
            a.animAccum = 0;
            a.body.position.y = Math.sin(elapsed * 3.2 + a.phase) * 0.012;
            for (const leg of a.legs) leg.rotation.x = 0;
          }
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
            a.animAccum += dt;
            if (a.animAccum >= animInterval) {
              a.animAccum = 0;
              a.root.position.set(a.x, 0, a.z);
              a.root.rotation.y = a.rotY;
              a.body.position.y = Math.abs(Math.sin(elapsed * 8.5 + a.phase)) * 0.04;
              for (let li = 0; li < a.legs.length; li++) {
                a.legs[li].rotation.x = Math.sin(elapsed * 9.5 + a.phase + li * Math.PI) * 0.42;
              }
            }
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
        const baseY = f.isSurface ? 0.082 : 0.045;
        const dxCam = f.x - camX;
        const dzCam = f.z - camZ;
        const fishInterval = dxCam * dxCam + dzCam * dzCam > 441 ? 0.075 : 0;
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
          f.animAccum += dt;
          if (f.animAccum >= fishInterval) {
            f.animAccum = 0;
            f.group.position.set(f.x, baseY + Math.sin(elapsed * 3 + f.phase) * 0.015, f.z);
            f.group.rotation.y = f.rotY;
            f.tail.rotation.y = Math.sin(elapsed * 10 + f.phase) * 0.35;
          }
        }
      }

      if (subzoneFishingVisuals && !useExternalFishingFrame) {
        subzoneFishingVisuals.updateLegacy(elapsed);
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
      new THREE.MeshStandardMaterial({
        color: '#4AB3DA',
        roughness: 0.1,
        metalness: 0.08,
        envMapIntensity: 0.9,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    water.position.set(0, -0.32, -2.5);
    water.renderOrder = 3;
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

    subzoneFishingVisuals = createFishingSpotVisuals({
      waterY: -0.14,
      defaultPos: [0, -0.14, -3.15],
      toolId: 'wooden_rod',
    });
    subzoneFishingVisuals.setLegacyState(currentFishingState);
    group.add(subzoneFishingVisuals.group);

    addBoxProxy(
      group,
      [3.4, 1.4, 3.2],
      [0, 0.4, -2.6],
      {kind: 'fish_cast', tx: 0, tz: -1.4},
      clickTargets,
    );
    labelAnchors.push({
      id: 'fish_cast',
      label: 'Hồ Câu Cá',
      worldPos: new THREE.Vector3(0, 1.15, -2.8),
    });

    updateFn = (elapsed) => {
      if (subzoneFishingVisuals && !useExternalFishingFrame) {
        subzoneFishingVisuals.updateLegacy(elapsed);
      }
    };

    group.add(createExitDoorway('Lối Về Phố', [0, 0, 4.45], '#E2C9A3', clickTargets, labelAnchors));
  } else if (zone === 'arcade') {
    const makeArcadeCanvasTex = (
      width: number,
      height: number,
      draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    ) => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx, width, height);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      disposables.push(tex);
      return tex;
    };

    const floorTex = makeArcadeCanvasTex(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#12172A';
      ctx.fillRect(0, 0, w, h);
      const cell = 64;
      for (let gx = 0; gx < 8; gx++) {
        for (let gy = 0; gy < 8; gy++) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? '#161D33' : '#12172A';
          ctx.fillRect(gx * cell + 2, gy * cell + 2, cell - 4, cell - 4);
        }
      }
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(w, i * cell);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(167, 139, 250, 0.35)';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 118, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(46, 230, 214, 0.34)';
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    const cyberBannerTex = makeArcadeCanvasTex(512, 128, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(0.5, '#1E1B4B');
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#38BDF8';
      ctx.font = '900 40px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CYBER GAME ARENA', w / 2, h / 2 - 12);
      ctx.fillStyle = '#FDE68A';
      ctx.font = '800 19px system-ui, sans-serif';
      ctx.fillText('PARKOUR · VƯỢT CHƯỚNG NGẠI VẬT · COINGAME', w / 2, h / 2 + 28);
    });

    const blindboxBannerTex = makeArcadeCanvasTex(512, 160, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#311B4E');
      grad.addColorStop(1, '#1A1B3A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#FDE68A';
      ctx.font = '900 44px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HDDOLL BLINDBOX', w / 2, 58);
      ctx.fillStyle = '#6EE7B7';
      ctx.font = '900 26px system-ui, sans-serif';
      ctx.fillText('320 XU / HỘP · MỞ NGAY!', w / 2, 114);
    });

    const pcScreenTex = makeArcadeCanvasTex(256, 144, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0D1B3E');
      grad.addColorStop(0.5, '#1B1142');
      grad.addColorStop(1, '#0F2942');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 34, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#F472B6';
      ctx.beginPath();
      ctx.moveTo(20, h - 24);
      ctx.lineTo(74, 86);
      ctx.lineTo(126, 102);
      ctx.lineTo(188, 42);
      ctx.lineTo(238, 62);
      ctx.stroke();
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(14, 14, 58, 12);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(w - 64, 14, 48, 12);
    });

    const racingScreenTex = makeArcadeCanvasTex(256, 160, (ctx, w, h) => {
      ctx.fillStyle = '#130D2E';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.arc(w / 2, 54, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1B2244';
      ctx.beginPath();
      ctx.moveTo(22, h);
      ctx.lineTo(w / 2 - 22, 68);
      ctx.lineTo(w / 2 + 22, 68);
      ctx.lineTo(w - 22, h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2, 74);
      ctx.lineTo(w / 2, h);
      ctx.stroke();
    });

    const dancePadTex = makeArcadeCanvasTex(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#12162B';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      const pads: [number, number, string][] = [
        [w / 2, 52, '#38BDF8'],
        [w / 2, h - 52, '#F472B6'],
        [52, h / 2, '#A78BFA'],
        [w - 52, h / 2, '#FBBF24'],
      ];
      for (const [px, py, col] of pads) {
        ctx.fillStyle = '#1C2547';
        ctx.fillRect(px - 32, py - 32, 64, 64);
        ctx.strokeStyle = col;
        ctx.lineWidth = 4;
        ctx.strokeRect(px - 30, py - 30, 60, 60);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(px, py, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    const mysteryBallTex = (bg1: string, bg2: string) =>
      makeArcadeCanvasTex(128, 128, (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, bg1);
        g.addColorStop(1, bg2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(0, h * 0.44, w, h * 0.12);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 58px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', w * 0.25, h * 0.52);
        ctx.fillText('?', w * 0.75, h * 0.52);
      });

    const coinShopBannerTex = makeArcadeCanvasTex(512, 160, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#064E3B');
      grad.addColorStop(0.5, '#0F766E');
      grad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#34D399';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#A7F3D0';
      ctx.font = '900 42px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SHOP COINGAME', w / 2, 56);
      ctx.fillStyle = '#FDE68A';
      ctx.font = '900 24px system-ui, sans-serif';
      ctx.fillText('PREMIUM · LÁ SEN · CHỔI BAY', w / 2, 112);
    });

    const whackBannerTex = makeArcadeCanvasTex(384, 128, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#3B0764');
      grad.addColorStop(1, '#701A75');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#FDE047';
      ctx.font = '900 38px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ĐẬP CHUỘT CYBER', w / 2, 50);
      ctx.fillStyle = '#FBCFE8';
      ctx.font = '800 20px system-ui, sans-serif';
      ctx.fillText('THƯỞNG COINGAME', w / 2, 94);
    });

    const parkourBannerTex = makeArcadeCanvasTex(384, 160, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#065F46');
      grad.addColorStop(1, '#0284C7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 36px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PARKOUR PHIÊU LƯU 3D', w / 2, 56);
      ctx.fillStyle = '#FDE047';
      ctx.font = '900 19px system-ui, sans-serif';
      ctx.fillText('1 MAP LỚN · THANG DÂY · ĐU DÂY', w / 2, 114);
    });

    const obstacleBannerTex = makeArcadeCanvasTex(384, 160, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#7C2D12');
      grad.addColorStop(1, '#B91C1C');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#FDBA74';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 32px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VƯỢT CHƯỚNG NGẠI 3D', w / 2, 56);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 20px system-ui, sans-serif';
      ctx.fillText('1000M · BÚA TẠ · ĐÁ LĂN · MƯA', w / 2, 114);
    });

    // Spacious Cyber Game Arena (23.6 x 19.6)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(23.6, 19.6),
      new THREE.MeshStandardMaterial({map: floorTex, roughness: 0.42, metalness: 0.14}),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    const wallMat = clayMat('#1B213C', 0.62);
    const trimMat = clayMat('#2B355B', 0.48);
    const cyanLedMat = new THREE.MeshStandardMaterial({
      color: '#67E8F9',
      emissive: '#22D3EE',
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const emeraldLedMat = new THREE.MeshStandardMaterial({
      color: '#6EE7B7',
      emissive: '#10B981',
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });
    const violetLedMat = new THREE.MeshStandardMaterial({
      color: '#C4B5FD',
      emissive: '#8B5CF6',
      emissiveIntensity: 0.8,
      roughness: 0.25,
    });
    const goldLedMat = new THREE.MeshStandardMaterial({
      color: '#FDE68A',
      emissive: '#F59E0B',
      emissiveIntensity: 0.82,
      roughness: 0.25,
    });
    const pinkLedMat = new THREE.MeshStandardMaterial({
      color: '#FBCFE8',
      emissive: '#EC4899',
      emissiveIntensity: 0.8,
      roughness: 0.25,
    });
    const orangeLedMat = new THREE.MeshStandardMaterial({
      color: '#FED7AA',
      emissive: '#F97316',
      emissiveIntensity: 0.85,
      roughness: 0.25,
    });

    const archGroup = new THREE.Group();
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(23.9, 3.55, 0.36, 2, 0.06), wallMat);
    backWall.position.set(0, 1.775, -9.85);
    const leftWall = new THREE.Mesh(new RoundedBoxGeometry(0.36, 3.3, 19.8, 2, 0.06), wallMat);
    leftWall.position.set(-11.85, 1.65, 0);
    const rightWall = new THREE.Mesh(new RoundedBoxGeometry(0.36, 3.3, 19.8, 2, 0.06), wallMat);
    rightWall.position.set(11.85, 1.65, 0);

    const backTrimTop = new THREE.Mesh(new RoundedBoxGeometry(24.0, 0.22, 0.44, 2, 0.04), trimMat);
    backTrimTop.position.set(0, 3.52, -9.84);
    const backLedStrip = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.1, 0.08), cyanLedMat);
    backLedStrip.position.set(0, 3.22, -9.63);
    const leftLedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 18.4), violetLedMat);
    leftLedStrip.position.set(-11.63, 3.05, 0);
    const rightLedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 18.4), pinkLedMat);
    rightLedStrip.position.set(11.63, 3.05, 0);

    for (let i = -4; i <= 4; i++) {
      if (i === 0) continue;
      const fin = new THREE.Mesh(
        new RoundedBoxGeometry(0.16, 2.75, 0.12, 2, 0.03),
        i % 2 === 0 ? cyanLedMat : violetLedMat,
      );
      fin.position.set(i * 2.45, 1.56, -9.62);
      archGroup.add(fin);
    }

    const mainSignBacking = new THREE.Mesh(
      new RoundedBoxGeometry(6.8, 1.24, 0.22, 2, 0.06),
      trimMat,
    );
    mainSignBacking.position.set(0, 2.9, -9.56);
    const mainSignFace = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.02),
      new THREE.MeshBasicMaterial({map: cyberBannerTex}),
    );
    mainSignFace.position.set(0, 2.9, -9.44);

    const frontCurbL = new THREE.Mesh(new RoundedBoxGeometry(9.2, 0.26, 0.28, 2, 0.05), trimMat);
    frontCurbL.position.set(-7.1, 0.13, 9.65);
    const frontCurbR = frontCurbL.clone();
    frontCurbR.position.x = 7.1;

    archGroup.add(
      backWall,
      leftWall,
      rightWall,
      backTrimTop,
      backLedStrip,
      leftLedStrip,
      rightLedStrip,
      mainSignBacking,
      mainSignFace,
      frontCurbL,
      frontCurbR,
    );
    mergeStaticGroupByMaterial(archGroup);
    group.add(archGroup);

    // 1. Back-Left: HDDOLL Blindbox Showcase Tower
    const blindboxTower = new THREE.Group();
    blindboxTower.position.set(-4.35, 0, -7.65);
    const bbBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.2, 1.05, 1.4, 3, 0.08),
      clayMat('#27224E', 0.42),
    );
    bbBase.position.y = 0.525;
    const bbTrim = new THREE.Mesh(new RoundedBoxGeometry(2.26, 0.1, 1.46, 2, 0.03), goldLedMat);
    bbTrim.position.y = 1.05;
    const bbBack = new THREE.Mesh(
      new RoundedBoxGeometry(2.06, 1.65, 0.2, 2, 0.04),
      clayMat('#1E1B3A', 0.5),
    );
    bbBack.position.set(0, 1.85, -0.56);
    const bbCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.26, 0.65, 1.42, 3, 0.08),
      clayMat('#31255C', 0.42),
    );
    bbCanopy.position.set(0, 2.86, 0);
    const bbBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.98, 0.54),
      new THREE.MeshBasicMaterial({map: blindboxBannerTex}),
    );
    bbBanner.position.set(0, 2.86, 0.72);
    const bbGlass = new THREE.Mesh(
      new RoundedBoxGeometry(2.02, 1.42, 1.2, 2, 0.06),
      new THREE.MeshStandardMaterial({
        color: '#E0F7FF',
        transparent: true,
        opacity: 0.28,
        roughness: 0.1,
        metalness: 0.1,
        depthWrite: false,
      }),
    );
    bbGlass.position.set(0, 1.82, 0.04);
    bbGlass.renderOrder = 6;

    const dollColors = ['#F472B6', '#38BDF8', '#FBBF24'];
    const animatedDolls: THREE.Group[] = [];
    dollColors.forEach((col, idx) => {
      const xOff = (idx - 1) * 0.58;
      const ped = new THREE.Mesh(
        new THREE.CylinderGeometry(0.21, 0.24, 0.14, 14),
        clayMat('#38BDF8', 0.35),
      );
      ped.position.set(xOff, 1.18, 0.05);
      blindboxTower.add(ped);

      const doll = new THREE.Group();
      doll.position.set(xOff, 1.48, 0.05);
      const dBody = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.28, 12), clayMat(col, 0.5));
      dBody.position.y = -0.02;
      const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), clayMat('#FFE8D6', 0.55));
      dHead.position.y = 0.21;
      const dHair = new THREE.Mesh(
        new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
        clayMat(col, 0.45),
      );
      dHair.position.y = 0.23;
      const earL = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), clayMat(col, 0.45));
      earL.position.set(-0.11, 0.35, 0);
      const earR = earL.clone();
      earR.position.x = 0.11;
      doll.add(dBody, dHead, dHair, earL, earR);
      blindboxTower.add(doll);
      animatedDolls.push(doll);
    });

    blindboxTower.add(bbBase, bbTrim, bbBack, bbCanopy, bbBanner, bbGlass);
    mergeStaticGroupByMaterial(blindboxTower, new Set(animatedDolls));
    addBoxProxy(
      blindboxTower,
      [2.35, 3.3, 1.65],
      [0, 1.65, 0],
      {kind: 'arcade_blindbox_hddoll', tx: -4.35, tz: -5.45},
      clickTargets,
    );
    colliders.push({type: 'box', x: -4.35, z: -7.65, hw: 1.18, hd: 0.82});
    labelAnchors.push({
      id: 'arcade_blindbox_hddoll',
      label: 'Blindbox HDDOLL',
      worldPos: new THREE.Vector3(-4.35, 3.45, -7.65),
    });
    group.add(blindboxTower);

    // 1b. Center-Back Hero: Shop CoinGame Premium Showcase
    const coinShopBooth = new THREE.Group();
    coinShopBooth.position.set(0, 0, -7.65);
    const csBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.45, 1.08, 1.46, 3, 0.08),
      clayMat('#0B3B36', 0.38),
    );
    csBase.position.y = 0.54;
    const csTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.52, 0.1, 1.54, 2, 0.03),
      emeraldLedMat,
    );
    csTrim.position.y = 1.08;
    const csBack = new THREE.Mesh(
      new RoundedBoxGeometry(2.3, 1.68, 0.2, 2, 0.04),
      clayMat('#092B2C', 0.45),
    );
    csBack.position.set(0, 1.9, -0.58);
    const csCanopy = new THREE.Mesh(
      new RoundedBoxGeometry(2.54, 0.68, 1.5, 3, 0.08),
      clayMat('#0F4C46', 0.38),
    );
    csCanopy.position.set(0, 2.9, 0);
    const csBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.26, 0.58),
      new THREE.MeshBasicMaterial({map: coinShopBannerTex}),
    );
    csBanner.position.set(0, 2.9, 0.76);
    const csPedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.14, 18),
      emeraldLedMat,
    );
    csPedestal.position.set(0, 1.18, 0.06);
    const csGlass = new THREE.Mesh(
      new RoundedBoxGeometry(2.18, 1.44, 1.24, 2, 0.06),
      new THREE.MeshStandardMaterial({
        color: '#CCFBF1',
        transparent: true,
        opacity: 0.24,
        roughness: 0.1,
        metalness: 0.1,
        depthWrite: false,
      }),
    );
    csGlass.position.set(0, 1.84, 0.04);
    csGlass.renderOrder = 6;

    const miniLotus = new THREE.Group();
    miniLotus.position.set(0, 1.62, 0.06);
    const mStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.02, 0.58, 10),
      clayMat('#1F7A47', 0.45),
    );
    mStem.position.y = -0.1;
    const mLeaf = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.46, 0.12, 16),
      clayMat('#30AE62', 0.45),
    );
    mLeaf.position.y = 0.2;
    const mFrog = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      clayMat('#65DF4A', 0.4),
    );
    mFrog.position.set(0.14, 0.27, 0.1);
    const mCloud = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      clayMat('#E0F2FE', 0.65),
    );
    mCloud.scale.set(1.4, 0.78, 1.0);
    mCloud.position.set(0, 0.54, 0);
    miniLotus.add(mStem, mLeaf, mFrog, mCloud);

    coinShopBooth.add(csBase, csTrim, csBack, csCanopy, csBanner, csPedestal, csGlass, miniLotus);
    mergeStaticGroupByMaterial(coinShopBooth, new Set([miniLotus]));
    addBoxProxy(
      coinShopBooth,
      [2.6, 3.35, 1.72],
      [0, 1.68, 0],
      {kind: 'arcade_coingame_shop', tx: 0, tz: -5.45},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -7.65, hw: 1.32, hd: 0.86});
    labelAnchors.push({
      id: 'arcade_coingame_shop',
      label: 'Shop CoinGame',
      worldPos: new THREE.Vector3(0, 3.5, -7.65),
    });
    group.add(coinShopBooth);

    // 2. Left Wing: 3 Modern RGB Gaming PC Arena Stations
    const pcZs = [-4.2, -0.4, 3.4];
    const pcAccentMats = [cyanLedMat, pinkLedMat, violetLedMat];
    pcZs.forEach((pz, idx) => {
      const rig = new THREE.Group();
      rig.position.set(-9.15, 0, pz);

      const deskTop = new THREE.Mesh(
        new RoundedBoxGeometry(1.38, 0.09, 2.32, 2, 0.03),
        clayMat('#19213D', 0.38),
      );
      deskTop.position.set(0, 0.76, 0);
      const deskLed = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.04, 2.26),
        pcAccentMats[idx % pcAccentMats.length],
      );
      deskLed.position.set(0.69, 0.74, 0);
      const legL = new THREE.Mesh(new RoundedBoxGeometry(1.15, 0.74, 0.1, 2, 0.02), trimMat);
      legL.position.set(0, 0.37, -1.04);
      const legR = legL.clone();
      legR.position.z = 1.04;

      const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.14), trimMat);
      monStand.position.set(-0.28, 0.94, 0);
      const monFrame = new THREE.Mesh(
        new RoundedBoxGeometry(0.08, 0.58, 1.06, 2, 0.02),
        clayMat('#0B1020', 0.35),
      );
      monFrame.position.set(-0.24, 1.24, -0.08);
      const monScreen = new THREE.Mesh(
        new THREE.PlaneGeometry(0.98, 0.5),
        new THREE.MeshBasicMaterial({map: pcScreenTex}),
      );
      monScreen.position.set(-0.19, 1.24, -0.08);
      monScreen.rotation.y = Math.PI / 2;

      const pcCase = new THREE.Mesh(
        new RoundedBoxGeometry(0.46, 0.54, 0.28, 2, 0.03),
        clayMat('#101628', 0.35),
      );
      pcCase.position.set(-0.2, 1.08, 0.76);
      const pcGlowStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.42, 0.22),
        pcAccentMats[idx % pcAccentMats.length],
      );
      pcGlowStrip.position.set(0.04, 1.08, 0.76);

      const deskPad = new THREE.Mesh(
        new RoundedBoxGeometry(0.55, 0.02, 1.15, 1, 0.01),
        clayMat('#232D52', 0.6),
      );
      deskPad.position.set(0.24, 0.815, -0.06);
      const kb = new THREE.Mesh(
        new RoundedBoxGeometry(0.18, 0.03, 0.5, 1, 0.01),
        pcAccentMats[idx % pcAccentMats.length],
      );
      kb.position.set(0.24, 0.84, -0.14);

      const chair = new THREE.Group();
      chair.position.set(1.06, 0, 0);
      const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.08, 10), trimMat);
      cBase.position.y = 0.06;
      const cPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 8), trimMat);
      cPost.position.y = 0.26;
      const cSeat = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.12, 0.58, 2, 0.04),
        clayMat('#202A4B', 0.55),
      );
      cSeat.position.y = 0.46;
      const cBack = new THREE.Mesh(
        new RoundedBoxGeometry(0.13, 0.86, 0.54, 2, 0.04),
        clayMat('#202A4B', 0.55),
      );
      cBack.position.set(0.24, 0.92, 0);
      const cAccent = new THREE.Mesh(
        new RoundedBoxGeometry(0.05, 0.7, 0.18, 2, 0.02),
        pcAccentMats[idx % pcAccentMats.length],
      );
      cAccent.position.set(0.19, 0.94, 0);
      chair.add(cBase, cPost, cSeat, cBack, cAccent);

      rig.add(deskTop, deskLed, legL, legR, monStand, monFrame, monScreen, pcCase, pcGlowStrip, deskPad, kb, chair);
      mergeStaticGroupByMaterial(rig);
      addBoxProxy(
        rig,
        [1.95, 1.85, 2.45],
        [0.2, 0.92, 0],
        {
          kind: 'arcade_pc_station',
          tx: -7.15,
          tz: pz,
          seatX: -8.09,
          seatZ: pz,
          seatY: 0.52,
          sitRotY: -Math.PI / 2,
        },
        clickTargets,
      );
      colliders.push({type: 'box', x: -8.85, z: pz, hw: 1.05, hd: 1.2});
      if (idx === 1) {
        labelAnchors.push({
          id: 'arcade_pc_arena',
          label: 'Dàn PC Esports',
          worldPos: new THREE.Vector3(-9.0, 1.95, pz),
        });
      }
      group.add(rig);
    });

    // 3b. Dedicated 3D Machine #1: Máy Parkour Leo Trèo (Left-Center)
    const parkourCab = new THREE.Group();
    parkourCab.position.set(-4.65, 0, -0.35);
    const pkBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.95, 1.02, 1.48, 3, 0.08),
      clayMat('#064E3B', 0.4),
    );
    pkBase.position.y = 0.51;
    const pkTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.02, 0.09, 1.55, 2, 0.03),
      emeraldLedMat,
    );
    pkTrim.position.y = 1.02;
    const pkBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 1.75, 0.85, 3, 0.06),
      clayMat('#0F2A38', 0.42),
    );
    pkBody.position.set(0, 1.82, -0.25);
    const pkMarquee = new THREE.Mesh(
      new THREE.PlaneGeometry(1.72, 0.72),
      new THREE.MeshBasicMaterial({map: parkourBannerTex}),
    );
    pkMarquee.position.set(0, 2.28, 0.19);
    const pkScreen = new THREE.Mesh(
      new RoundedBoxGeometry(1.52, 0.72, 0.08, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: '#0C4A6E',
        emissive: '#38BDF8',
        emissiveIntensity: 0.65,
      }),
    );
    pkScreen.position.set(0, 1.5, 0.17);
    const pkJoyL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), emeraldLedMat);
    pkJoyL.position.set(-0.42, 1.12, 0.45);
    const pkBtnR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12), goldLedMat);
    pkBtnR.position.set(0.38, 1.07, 0.45);

    // Mini 3D Parkour Tree & Rope Ladder Display on top of the machine
    const pkHolo = new THREE.Group();
    pkHolo.position.set(0, 2.98, 0);
    const pkTreeTrunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.45, 10),
      clayMat('#92400E', 0.55),
    );
    const pkTreeCrown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.24, 1),
      clayMat('#22C55E', 0.5),
    );
    pkTreeCrown.position.y = 0.3;
    const pkLadderBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.36, 0.06),
      goldLedMat,
    );
    pkLadderBar.position.set(0.2, 0.05, 0.1);
    pkHolo.add(pkTreeTrunk, pkTreeCrown, pkLadderBar);

    parkourCab.add(pkBase, pkTrim, pkBody, pkMarquee, pkScreen, pkJoyL, pkBtnR, pkHolo);
    mergeStaticGroupByMaterial(parkourCab, new Set([pkHolo]));
    addBoxProxy(
      parkourCab,
      [2.1, 3.3, 1.7],
      [0, 1.65, 0],
      {kind: 'arcade_parkour', tx: -4.65, tz: 1.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: -4.65, z: -0.35, hw: 1.05, hd: 0.85});
    labelAnchors.push({
      id: 'arcade_parkour',
      label: 'Parkour 3D',
      worldPos: new THREE.Vector3(-4.65, 3.55, -0.35),
    });
    group.add(parkourCab);

    // 3c. Dedicated 3D Machine #2: Máy Vượt Chướng Ngại Vật (Right-Center)
    const obstacleCab = new THREE.Group();
    obstacleCab.position.set(4.65, 0, -0.35);
    const obBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.95, 1.02, 1.48, 3, 0.08),
      clayMat('#7C2D12', 0.4),
    );
    obBase.position.y = 0.51;
    const obTrim = new THREE.Mesh(
      new RoundedBoxGeometry(2.02, 0.09, 1.55, 2, 0.03),
      orangeLedMat,
    );
    obTrim.position.y = 1.02;
    const obBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 1.75, 0.85, 3, 0.06),
      clayMat('#2B1410', 0.42),
    );
    obBody.position.set(0, 1.82, -0.25);
    const obMarquee = new THREE.Mesh(
      new THREE.PlaneGeometry(1.72, 0.72),
      new THREE.MeshBasicMaterial({map: obstacleBannerTex}),
    );
    obMarquee.position.set(0, 2.28, 0.19);
    const obScreen = new THREE.Mesh(
      new RoundedBoxGeometry(1.52, 0.72, 0.08, 2, 0.03),
      new THREE.MeshStandardMaterial({
        color: '#431407',
        emissive: '#F97316',
        emissiveIntensity: 0.65,
      }),
    );
    obScreen.position.set(0, 1.5, 0.17);
    const obJoyL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8), orangeLedMat);
    obJoyL.position.set(-0.42, 1.12, 0.45);
    const obBtnR = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.08, 12), pinkLedMat);
    obBtnR.position.set(0.38, 1.07, 0.45);

    // Spinning 3D Sweeper Bar + Boulder topper
    const obSpinner = new THREE.Group();
    obSpinner.position.set(0, 3.05, 0);
    const obPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.42, 10),
      clayMat('#334155', 0.4),
    );
    const obArm = new THREE.Mesh(
      new RoundedBoxGeometry(0.95, 0.09, 0.09, 2, 0.03),
      new THREE.MeshStandardMaterial({color: '#EF4444', emissive: '#F97316', emissiveIntensity: 0.55}),
    );
    obArm.position.y = 0.18;
    const obBoulder = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.16, 1),
      clayMat('#64748B', 0.65),
    );
    obBoulder.position.set(0.45, 0.18, 0);
    obSpinner.add(obPole, obArm, obBoulder);

    obstacleCab.add(obBase, obTrim, obBody, obMarquee, obScreen, obJoyL, obBtnR, obSpinner);
    mergeStaticGroupByMaterial(obstacleCab, new Set([obSpinner]));
    addBoxProxy(
      obstacleCab,
      [2.1, 3.3, 1.7],
      [0, 1.65, 0],
      {kind: 'arcade_obstacle', tx: 4.65, tz: 1.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 4.65, z: -0.35, hw: 1.05, hd: 0.85});
    labelAnchors.push({
      id: 'arcade_obstacle',
      label: 'Vượt Chướng Ngại 3D',
      worldPos: new THREE.Vector3(4.65, 3.55, -0.35),
    });
    group.add(obstacleCab);

    // 4. Right Wing: Sim Racing Pod + Playable Star Catcher + Mystery ? Claw Machine
    const racingPod = new THREE.Group();
    racingPod.position.set(8.65, 0, -4.4);
    const raceDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.1, 0.16, 2.4, 2, 0.05),
      clayMat('#1A213C', 0.45),
    );
    raceDeck.position.y = 0.08;
    const raceRim = new THREE.Mesh(new RoundedBoxGeometry(2.18, 0.06, 2.48, 2, 0.02), pinkLedMat);
    raceRim.position.y = 0.14;
    const rSeat = new THREE.Mesh(
      new RoundedBoxGeometry(0.68, 0.2, 0.72, 2, 0.05),
      clayMat('#E11D48', 0.55),
    );
    rSeat.position.set(0.25, 0.34, 0.45);
    const rBack = new THREE.Mesh(
      new RoundedBoxGeometry(0.64, 0.92, 0.18, 2, 0.05),
      clayMat('#E11D48', 0.55),
    );
    rBack.position.set(0.25, 0.8, 0.78);
    rBack.rotation.x = -0.18;
    const rWheelPost = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.65, 0.18, 2, 0.03),
      trimMat,
    );
    rWheelPost.position.set(0.25, 0.55, -0.35);
    const rWheel = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.035, 8, 18),
      clayMat('#0F172A', 0.4),
    );
    rWheel.position.set(0.25, 0.88, -0.2);
    rWheel.rotation.x = 0.42;
    const rScreenFrame = new THREE.Mesh(
      new RoundedBoxGeometry(1.55, 0.86, 0.1, 2, 0.03),
      clayMat('#0B1020', 0.35),
    );
    rScreenFrame.position.set(0.15, 1.25, -0.82);
    const rScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(1.42, 0.76),
      new THREE.MeshBasicMaterial({map: racingScreenTex}),
    );
    rScreen.position.set(0.15, 1.25, -0.76);
    racingPod.add(raceDeck, raceRim, rSeat, rBack, rWheelPost, rWheel, rScreenFrame, rScreen);
    mergeStaticGroupByMaterial(racingPod);
    addBoxProxy(
      racingPod,
      [2.2, 2.0, 2.5],
      [0, 1.0, 0],
      {kind: 'arcade_racing_pod', tx: 6.55, tz: -4.0},
      clickTargets,
    );
    colliders.push({type: 'box', x: 8.65, z: -4.4, hw: 1.15, hd: 1.28});
    labelAnchors.push({
      id: 'arcade_racing_pod',
      label: 'Đua Xe (Soon)',
      worldPos: new THREE.Vector3(8.65, 2.1, -4.4),
    });
    group.add(racingPod);

    // Playable Catch Stars Cabinet
    const cab = new THREE.Group();
    cab.position.set(9.15, 0, -0.35);
    cab.rotation.y = -Math.PI / 2;
    const cabBody = new THREE.Mesh(
      new RoundedBoxGeometry(1.68, 2.55, 1.32, 3, 0.09),
      clayMat('#E0566B', 0.42),
    );
    cabBody.position.y = 1.275;
    const cabTrim = new THREE.Mesh(new RoundedBoxGeometry(1.72, 0.08, 1.36, 2, 0.02), goldLedMat);
    cabTrim.position.y = 2.48;
    const screen = new THREE.Mesh(
      new RoundedBoxGeometry(1.26, 0.92, 0.1, 2, 0.04),
      new THREE.MeshStandardMaterial({
        color: '#1E293B',
        emissive: '#38BDF8',
        emissiveIntensity: 0.65,
      }),
    );
    screen.position.set(0, 1.65, 0.64);
    const joyStick = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 8), goldLedMat);
    joyStick.position.set(-0.25, 1.08, 0.72);
    cab.add(cabBody, cabTrim, screen, joyStick);
    mergeStaticGroupByMaterial(cab);
    addBoxProxy(cab, [1.85, 2.7, 1.55], [0, 1.35, 0], {kind: 'arcade_star', tx: 7.35, tz: -0.35}, clickTargets);
    colliders.push({type: 'box', x: 9.15, z: -0.35, hw: 0.85, hd: 0.95});
    labelAnchors.push({id: 'arcade_star', label: 'Hứng Sao', worldPos: new THREE.Vector3(9.15, 2.85, -0.35)});
    group.add(cab);

    // Mystery "?" Ball Claw Cabinet
    const claw = new THREE.Group();
    claw.position.set(9.15, 0, 3.25);
    claw.rotation.y = -Math.PI / 2;
    const clawBase = new THREE.Mesh(
      new RoundedBoxGeometry(1.68, 1.15, 1.32, 3, 0.08),
      clayMat('#3B82F6', 0.42),
    );
    clawBase.position.y = 0.575;
    const clawHeader = new THREE.Mesh(
      new RoundedBoxGeometry(1.7, 0.34, 1.34, 2, 0.06),
      clayMat('#60A5FA', 0.4),
    );
    clawHeader.position.y = 2.52;
    const clawGlass = new THREE.Mesh(
      new RoundedBoxGeometry(1.52, 1.24, 1.16, 2, 0.06),
      new THREE.MeshStandardMaterial({
        color: '#DDF3FF',
        transparent: true,
        opacity: 0.36,
        roughness: 0.1,
        metalness: 0.1,
        depthWrite: false,
      }),
    );
    clawGlass.position.y = 1.76;
    clawGlass.renderOrder = 6;
    const qBallSpecs: [number, number, number, string, string][] = [
      [-0.36, 1.36, 0.16, '#38BDF8', '#0284C7'],
      [0.02, 1.36, -0.14, '#F472B6', '#DB2777'],
      [0.36, 1.36, 0.15, '#FBBF24', '#D97706'],
      [-0.16, 1.62, 0.02, '#A78BFA', '#6D28D9'],
      [0.24, 1.6, -0.05, '#34D399', '#059669'],
    ];
    qBallSpecs.forEach(([bx, by, bz, c1, c2]) => {
      const qBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 14, 12),
        new THREE.MeshStandardMaterial({map: mysteryBallTex(c1, c2), roughness: 0.25}),
      );
      qBall.position.set(bx, by, bz);
      claw.add(qBall);
    });
    const clawArmStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8),
      clayMat('#E2E8F0', 0.25),
    );
    clawArmStem.position.set(0, 2.22, 0);
    claw.add(clawBase, clawHeader, clawGlass, clawArmStem);
    mergeStaticGroupByMaterial(claw);
    addBoxProxy(claw, [1.85, 2.8, 1.55], [0, 1.4, 0], {kind: 'arcade_claw', tx: 7.35, tz: 3.25}, clickTargets);
    colliders.push({type: 'box', x: 9.15, z: 3.25, hw: 0.85, hd: 0.95});
    labelAnchors.push({id: 'arcade_claw', label: 'Gắp Bóng ?', worldPos: new THREE.Vector3(9.15, 2.9, 3.25)});
    group.add(claw);

    // 4b. Playable Whack-a-Mole Cyber Machine (Right-Front)
    const whackGroup = new THREE.Group();
    whackGroup.position.set(5.45, 0, 4.65);
    const wCab = new THREE.Mesh(
      new RoundedBoxGeometry(1.75, 0.96, 1.35, 3, 0.07),
      clayMat('#3B1B54', 0.44),
    );
    wCab.position.y = 0.48;
    const wTrim = new THREE.Mesh(
      new RoundedBoxGeometry(1.82, 0.08, 1.42, 2, 0.03),
      pinkLedMat,
    );
    wTrim.position.y = 0.95;
    const wDeck = new THREE.Mesh(
      new RoundedBoxGeometry(1.56, 0.06, 1.18, 2, 0.02),
      clayMat('#1E1B3A', 0.45),
    );
    wDeck.position.y = 1.0;
    for (let r = -1; r <= 1; r++) {
      for (let c = -1; c <= 1; c++) {
        const hole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.05, 12),
          clayMat('#090D1F', 0.5),
        );
        hole.position.set(c * 0.42, 1.04, r * 0.34);
        whackGroup.add(hole);
        if ((r === 0 && c === 0) || (r === -1 && c === 1)) {
          const mole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.11, 0.18, 12),
            r === 0 ? goldLedMat : cyanLedMat,
          );
          mole.position.set(c * 0.42, 1.14, r * 0.34);
          whackGroup.add(mole);
        }
      }
    }
    const wBack = new THREE.Mesh(
      new RoundedBoxGeometry(1.72, 1.18, 0.16, 2, 0.04),
      clayMat('#271440', 0.46),
    );
    wBack.position.set(0, 1.56, -0.58);
    const wBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(1.52, 0.52),
      new THREE.MeshBasicMaterial({map: whackBannerTex}),
    );
    wBanner.position.set(0, 1.82, -0.49);
    const malletHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.36, 8),
      clayMat('#FDE68A', 0.4),
    );
    malletHandle.rotation.z = Math.PI / 2;
    malletHandle.position.set(-0.56, 1.08, 0.46);
    const malletHead = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.22, 10),
      pinkLedMat,
    );
    malletHead.position.set(-0.36, 1.1, 0.46);
    whackGroup.add(wCab, wTrim, wDeck, wBack, wBanner, malletHandle, malletHead);
    mergeStaticGroupByMaterial(whackGroup);
    addBoxProxy(
      whackGroup,
      [1.9, 2.25, 1.55],
      [0, 1.12, 0],
      {kind: 'arcade_whack_mole', tx: 5.45, tz: 3.05},
      clickTargets,
    );
    colliders.push({type: 'box', x: 5.45, z: 4.65, hw: 0.95, hd: 0.78});
    labelAnchors.push({
      id: 'arcade_whack_mole',
      label: 'Đập Chuột',
      worldPos: new THREE.Vector3(5.45, 2.38, 4.65),
    });
    group.add(whackGroup);

    // 5. Center Rhythm Dance Pad Stage
    const danceStage = new THREE.Group();
    danceStage.position.set(0, 0, -1.55);
    const padDeck = new THREE.Mesh(
      new RoundedBoxGeometry(2.75, 0.08, 2.4, 2, 0.03),
      clayMat('#1A2242', 0.45),
    );
    padDeck.position.y = 0.04;
    const padSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(2.42, 2.1),
      new THREE.MeshBasicMaterial({
        map: dancePadTex,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    padSurface.rotation.x = -Math.PI / 2;
    padSurface.position.y = 0.085;
    const spkL = new THREE.Mesh(new RoundedBoxGeometry(0.38, 1.85, 0.42, 2, 0.04), clayMat('#131932', 0.45));
    spkL.position.set(-1.18, 0.925, -1.32);
    const spkR = spkL.clone();
    spkR.position.x = 1.18;
    const danceBar = new THREE.Mesh(
      new RoundedBoxGeometry(2.72, 0.16, 0.2, 2, 0.04),
      violetLedMat,
    );
    danceBar.position.set(0, 1.85, -1.32);
    const danceMonitor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.66, 0.96),
      new THREE.MeshBasicMaterial({map: pcScreenTex}),
    );
    danceMonitor.position.set(0, 1.24, -1.23);
    danceStage.add(padDeck, padSurface, spkL, spkR, danceBar, danceMonitor);
    mergeStaticGroupByMaterial(danceStage);
    addBoxProxy(
      danceStage,
      [2.8, 1.95, 2.65],
      [0, 0.98, -0.1],
      {kind: 'arcade_dance_pad', tx: 0, tz: -1.4},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -2.88, hw: 1.44, hd: 0.28});
    labelAnchors.push({
      id: 'arcade_dance_pad',
      label: 'Sàn Nhảy',
      worldPos: new THREE.Vector3(0, 2.15, -2.85),
    });
    group.add(danceStage);

    // 6. Sittable Cyber Chill Lounge Sofa & Neon Coffee Table (Clean Walk-to Clearances!)
    const loungeGroup = new THREE.Group();
    loungeGroup.position.set(-4.5, 0, 5.45);
    const sofaBase = new THREE.Mesh(
      new RoundedBoxGeometry(2.45, 0.34, 0.95, 3, 0.06),
      clayMat('#272E58', 0.62),
    );
    sofaBase.position.y = 0.22;
    const sofaBack = new THREE.Mesh(
      new RoundedBoxGeometry(2.45, 0.56, 0.24, 3, 0.06),
      clayMat('#1F254A', 0.62),
    );
    sofaBack.position.set(0, 0.56, 0.36);
    const sofaArmL = new THREE.Mesh(
      new RoundedBoxGeometry(0.22, 0.46, 0.95, 2, 0.05),
      clayMat('#1F254A', 0.62),
    );
    sofaArmL.position.set(-1.14, 0.38, 0);
    const sofaArmR = sofaArmL.clone();
    sofaArmR.position.x = 1.14;
    const neonTable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.46, 0.38, 18),
      clayMat('#151C36', 0.38),
    );
    neonTable.position.set(0, 0.19, -1.8);
    const neonTableRim = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.03, 8, 24), cyanLedMat);
    neonTableRim.rotation.x = Math.PI / 2;
    neonTableRim.position.set(0, 0.39, -1.8);

    loungeGroup.add(sofaBase, sofaBack, sofaArmL, sofaArmR, neonTable, neonTableRim);
    mergeStaticGroupByMaterial(loungeGroup);
    addBoxProxy(
      loungeGroup,
      [2.55, 0.95, 1.1],
      [0, 0.48, 0],
      {
        kind: 'bench',
        sitMessage: 'Thư giãn tại Cyber Lounge Mây! (+Vui vẻ)',
        seatSlots: [
          {seatX: -5.05, seatZ: 5.38, seatY: 0.48, sitRotY: Math.PI, tx: -5.05, tz: 4.55},
          {seatX: -3.95, seatZ: 5.38, seatY: 0.48, sitRotY: Math.PI, tx: -3.95, tz: 4.55},
        ],
      },
      clickTargets,
    );
    colliders.push({type: 'box', x: -4.5, z: 5.45, hw: 1.28, hd: 0.52});
    colliders.push({type: 'circle', x: -4.5, z: 3.65, r: 0.54});
    group.add(loungeGroup);

    // 7. Sittable Cyber Cafe Tables & Neon Gaming Stools (Bàn ghế khu Game ngồi được!)
    const cyberTables: Array<{x: number; z: number; accent: THREE.Material}> = [
      {x: 2.25, z: 4.85, accent: violetLedMat},
      {x: 8.15, z: 6.45, accent: cyanLedMat},
    ];
    cyberTables.forEach((tbl) => {
      const tGroup = new THREE.Group();
      tGroup.position.set(tbl.x, 0, tbl.z);
      const tCol = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.62, 12), trimMat);
      tCol.position.y = 0.31;
      const tFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.08, 14), trimMat);
      tFoot.position.y = 0.04;
      const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.09, 20), clayMat('#18203D', 0.4));
      tTop.position.y = 0.66;
      const tRim = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.025, 8, 24), tbl.accent);
      tRim.rotation.x = Math.PI / 2;
      tRim.position.y = 0.7;
      tGroup.add(tCol, tFoot, tTop, tRim);
      mergeStaticGroupByMaterial(tGroup);
      colliders.push({type: 'circle', x: tbl.x, z: tbl.z, r: 0.62});
      group.add(tGroup);

      // Left & Right Sittable Cyber Stools beside each table
      ([-1, 1] as const).forEach((side) => {
        const sx = tbl.x + side * 1.12;
        const sz = tbl.z;
        const stool = new THREE.Group();
        stool.position.set(sx, 0, sz);
        const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.06, 12), trimMat);
        sBase.position.y = 0.03;
        const sPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 10), trimMat);
        sPost.position.y = 0.23;
        const sSeat = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.28, 0.11, 16), clayMat('#2B3663', 0.5));
        sSeat.position.y = 0.44;
        const sBack = new THREE.Mesh(
          new RoundedBoxGeometry(0.1, 0.44, 0.42, 2, 0.03),
          clayMat('#232C52', 0.5),
        );
        sBack.position.set(side * 0.24, 0.68, 0);
        const sRim = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.02, 8, 18), tbl.accent);
        sRim.rotation.x = Math.PI / 2;
        sRim.position.y = 0.45;
        stool.add(sBase, sPost, sSeat, sBack, sRim);
        mergeStaticGroupByMaterial(stool);
        addBoxProxy(
          stool,
          [0.72, 0.95, 0.72],
          [0, 0.48, 0],
          {
            kind: 'bench',
            sitMessage: 'Ngồi nghỉ tại bàn Cyber Game! (+Vui vẻ)',
            seatX: sx,
            seatZ: sz,
            seatY: 0.49,
            sitRotY: side === -1 ? Math.PI / 2 : -Math.PI / 2,
            tx: sx,
            tz: sz + 0.92,
          },
          clickTargets,
        );
        colliders.push({type: 'circle', x: sx, z: sz, r: 0.34});
        group.add(stool);
      });
    });

    // Corner Planters
    for (const px of [-10.55, 10.55]) {
      const potGroup = new THREE.Group();
      potGroup.position.set(px, 0, 7.85);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.3, 0.58, 12), clayMat('#1E2647', 0.45));
      pot.position.y = 0.29;
      const leaves = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 1), clayMat('#38A169', 0.72));
      leaves.position.y = 0.85;
      potGroup.add(pot, leaves);
      mergeStaticGroupByMaterial(potGroup);
      colliders.push({type: 'circle', x: px, z: 7.85, r: 0.44});
      group.add(potGroup);
    }

    updateFn = (elapsed) => {
      miniLotus.rotation.y = elapsed * 0.95;
      miniLotus.position.y = 1.62 + Math.sin(elapsed * 2.2) * 0.055;
      pkHolo.rotation.y = elapsed * 0.85;
      pkHolo.position.y = 2.98 + Math.sin(elapsed * 2.1) * 0.05;
      obSpinner.rotation.y = elapsed * 2.4;
      animatedDolls.forEach((doll, idx) => {
        doll.position.y = 1.48 + Math.sin(elapsed * 2.3 + idx * 1.1) * 0.045;
        doll.rotation.y = Math.sin(elapsed * 1.1 + idx * 0.9) * 0.35;
      });
    };

    group.add(createExitDoorway('Ra Thị Trấn', [0, 0, 8.95], '#38BDF8', clickTargets, labelAnchors));
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
      isNpc: true,
      maxLabelDist: 3.5,
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
      isNpc: true,
      maxLabelDist: 3.5,
    });

    group.add(createExitDoorway('Cửa Ra Phố', [0, 0, 4.95], '#E58E9A', clickTargets, labelAnchors));
    mergeStaticGroupByMaterial(group, new Set([tinaRig.root, bobRig.root]));
  } else if (zone === 'petshop') {
    // Spacious modern & warm cozy Pet Shop interior (16.8 x 14.0)
    const warmWoodTex = createWoodPlankTexture('#DFBA91', '#BC8F61', 6, 5);
    disposables.push(warmWoodTex);
    const floorMat = new THREE.MeshStandardMaterial({
      map: warmWoodTex,
      roughness: 0.72,
      metalness: 0.02,
    });
    const wallCreamMat = clayMat('#FFF6EA', 0.76);
    const mintTrimMat = clayMat('#8BCBB8', 0.66);
    const sageMat = clayMat('#B9E0D3', 0.7);
    const oakMat = clayMat('#BA8352', 0.66);
    const oakDarkMat = clayMat('#83522F', 0.72);
    const coralMat = clayMat('#E58062', 0.64);
    const mustardMat = clayMat('#F4C364', 0.6);
    const cushionMat = clayMat('#FCEFD9', 0.8);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#DDF4FF',
      roughness: 0.16,
      metalness: 0.08,
      transparent: true,
      opacity: 0.42,
    });
    const warmLightMat = new THREE.MeshStandardMaterial({
      color: '#FFF4D2',
      emissive: '#FFE099',
      emissiveIntensity: 0.75,
      roughness: 0.35,
    });
    const leafMat = clayMat('#6DA668', 0.74);

    // Expanded warm oak floor (16.8 x 14.0)
    const floor = new THREE.Mesh(new RoundedBoxGeometry(16.8, 0.44, 14.0, 2, 0.08), floorMat);
    floor.position.y = -0.22;
    floor.userData = {kind: 'ground'};
    groundMesh = floor;
    group.add(floor);

    // Back & Side Walls with modern sage wainscoting, oak vertical slats & sunlit windows
    const backWall = new THREE.Mesh(new RoundedBoxGeometry(16.8, 2.75, 0.34, 2, 0.06), wallCreamMat);
    backWall.position.set(0, 1.375, -6.86);
    const backWainscot = new THREE.Mesh(new RoundedBoxGeometry(16.84, 0.82, 0.38, 2, 0.04), mintTrimMat);
    backWainscot.position.set(0, 0.41, -6.83);
    const backTrimTop = new THREE.Mesh(new RoundedBoxGeometry(16.86, 0.08, 0.4, 2, 0.02), oakMat);
    backTrimTop.position.set(0, 0.84, -6.82);

    const sideWallL = new THREE.Mesh(new RoundedBoxGeometry(0.32, 2.3, 14.0, 2, 0.06), wallCreamMat);
    sideWallL.position.set(-8.26, 1.15, 0);
    const sideWainL = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.78, 14.02, 2, 0.04), sageMat);
    sideWainL.position.set(-8.24, 0.39, 0);

    const sideWallR = sideWallL.clone();
    sideWallR.position.x = 8.26;
    const sideWainR = sideWainL.clone();
    sideWainR.position.x = 8.24;
    group.add(backWall, backWainscot, backTrimTop, sideWallL, sideWainL, sideWallR, sideWainR);

    // Decorative vertical oak slats framing the center reception backdrop
    [-2.4, -2.1, -1.8, 1.8, 2.1, 2.4].forEach((sx) => {
      const slat = new THREE.Mesh(new RoundedBoxGeometry(0.11, 1.82, 0.08, 2, 0.02), oakMat);
      slat.position.set(sx, 1.78, -6.66);
      group.add(slat);
    });

    // Large modern framed paw emblem + shop sign centered on back wall
    const plaqueFrame = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.28, 0.1, 2, 0.05), oakDarkMat);
    plaqueFrame.position.set(0, 1.92, -6.64);
    const plaqueInner = new THREE.Mesh(new RoundedBoxGeometry(2.08, 1.06, 0.11, 2, 0.04), cushionMat);
    plaqueInner.position.set(0, 1.92, -6.62);
    const padMain = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), coralMat);
    padMain.scale.set(1.22, 1.0, 0.35);
    padMain.position.set(0, 1.78, -6.55);
    group.add(plaqueFrame, plaqueInner, padMain);
    [
      [-0.22, 2.08],
      [-0.08, 2.18],
      [0.08, 2.18],
      [0.22, 2.08],
    ].forEach(([tx, ty]) => {
      const toe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), coralMat);
      toe.scale.set(1, 1.15, 0.45);
      toe.position.set(tx, ty, -6.55);
      group.add(toe);
    });

    // Warm modern wall sconce / pendant lights on back & side walls
    [-5.2, -3.1, 3.1, 5.2].forEach((lx) => {
      const shade = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), warmLightMat);
      shade.position.set(lx, 2.35, -6.48);
      const mount = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.24, 0.14, 2, 0.02), oakDarkMat);
      mount.position.set(lx, 2.48, -6.6);
      group.add(shade, mount);
    });

    // Sunlit modern arched-top windows on side walls
    [-2.4, 2.1].forEach((wz) => {
      [-1, 1].forEach((side) => {
        const wx = side * 8.06;
        const winFrame = new THREE.Mesh(new RoundedBoxGeometry(0.1, 1.35, 2.25, 2, 0.03), oakMat);
        winFrame.position.set(wx, 1.62, wz);
        const winPane = new THREE.Mesh(new RoundedBoxGeometry(0.12, 1.16, 2.04, 2, 0.02), glassMat);
        winPane.position.set(wx, 1.62, wz);
        const mullion = new THREE.Mesh(new RoundedBoxGeometry(0.13, 1.18, 0.08, 2, 0.01), oakMat);
        mullion.position.set(wx, 1.62, wz);
        group.add(winFrame, winPane, mullion);
      });
    });

    // Indoor potted plants along walls for cozy warmth
    [
      [-7.45, -5.85],
      [7.45, -5.85],
      [-7.45, 5.1],
      [7.45, 5.1],
    ].forEach(([px, pz]) => {
      const plant = new THREE.Group();
      plant.position.set(px, 0, pz);
      const pot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.24, 0.44, 14),
        clayMat('#E8D3BD', 0.72),
      );
      pot.position.y = 0.22;
      const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 12), oakDarkMat);
      soil.position.y = 0.42;
      plant.add(pot, soil);
      [
        [0, 0.78, 0, 0.26],
        [-0.14, 0.65, 0.1, 0.2],
        [0.14, 0.68, -0.08, 0.21],
        [0.05, 0.94, 0.06, 0.18],
      ].forEach(([lx, ly, lz, r]) => {
        const foliage = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), leafMat);
        foliage.scale.set(1.05, 0.92, 1.05);
        foliage.position.set(lx, ly, lz);
        plant.add(foliage);
      });
      group.add(plant);
      colliders.push({type: 'circle', x: px, z: pz, r: 0.45});
    });

    // Cozy oval welcome rug in front of reception
    const centerRug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.55, 2.6, 0.045, 32),
      clayMat('#FAD8C0', 0.88),
    );
    centerRug.scale.set(1.22, 1, 0.85);
    centerRug.position.set(0, 0.022, -0.5);
    group.add(centerRug);

    // Modern spacious reception counter + Ivan (sells food, medicine & Test thân mật 1 Xu)
    const petCounter = new THREE.Group();
    petCounter.position.set(0, 0, -3.7);
    const deskBody = new THREE.Mesh(new RoundedBoxGeometry(3.85, 0.98, 1.02, 3, 0.09), mintTrimMat);
    deskBody.position.y = 0.49;
    const deskTop = new THREE.Mesh(new RoundedBoxGeometry(4.06, 0.14, 1.18, 2, 0.05), oakMat);
    deskTop.position.y = 1.01;
    const deskAccentStrip = new THREE.Mesh(
      new RoundedBoxGeometry(3.65, 0.14, 0.06, 2, 0.02),
      warmLightMat,
    );
    deskAccentStrip.position.set(0, 0.82, 0.51);
    const treatJarBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.19, 0.3, 12),
      glossyClayMat('#FFE29A', 0.25),
    );
    treatJarBase.position.set(-1.32, 1.22, 0.1);
    const treatJarLid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.07, 12), coralMat);
    treatJarLid.position.set(-1.32, 1.39, 0.1);
    const posStand = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.36, 0.08, 2, 0.03), clayMat('#35404E', 0.45));
    posStand.position.set(1.05, 1.26, 0.05);
    posStand.rotation.x = -0.25;
    const ledger = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.08, 0.44, 2, 0.02), mustardMat);
    ledger.position.set(0.28, 1.11, 0.16);
    petCounter.add(deskBody, deskTop, deskAccentStrip, treatJarBase, treatJarLid, posStand, ledger);
    mergeStaticGroupByMaterial(petCounter);
    addBoxProxy(
      petCounter,
      [4.0, 1.6, 1.4],
      [0, 0.8, 0],
      {kind: 'ivan_npc', tx: 0, tz: -2.25},
      clickTargets,
    );
    colliders.push({type: 'box', x: 0, z: -3.7, hw: 2.05, hd: 0.66});
    group.add(petCounter);

    // Left Wing: Modern Pet Supply & Food/Medicine Display Racks + Cozy Spa Grooming Tub
    [-5.8, -2.5].forEach((sz, rackIdx) => {
      const shelfGroup = new THREE.Group();
      shelfGroup.position.set(-7.1, 0, sz);
      const shelfBack = new THREE.Mesh(new RoundedBoxGeometry(0.14, 2.2, 2.55, 2, 0.04), oakDarkMat);
      shelfBack.position.set(-0.36, 1.1, 0);
      const shelfSideF = new THREE.Mesh(new RoundedBoxGeometry(0.72, 2.2, 0.12, 2, 0.03), oakDarkMat);
      shelfSideF.position.set(0, 1.1, 1.22);
      const shelfSideB = shelfSideF.clone();
      shelfSideB.position.z = -1.22;
      shelfGroup.add(shelfBack, shelfSideF, shelfSideB);
      [0.14, 0.78, 1.44, 2.1].forEach((sy) => {
        const plank = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.09, 2.48, 2, 0.02), oakMat);
        plank.position.set(0, sy, 0);
        shelfGroup.add(plank);
      });
      // Kibble bags, medicine bottles, bowls & colorful yarn balls
      if (rackIdx === 0) {
        [-0.72, 0, 0.72].forEach((bz, bi) => {
          const bagMat = bi === 1 ? coralMat : bi === 2 ? mintTrimMat : mustardMat;
          const kibbleBag = new THREE.Mesh(new RoundedBoxGeometry(0.32, 0.42, 0.36, 2, 0.06), bagMat);
          kibbleBag.position.set(0.06, 1.04, bz);
          const bottle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.11, 0.28, 10),
            glossyClayMat(bi === 0 ? '#79C7E3' : '#F48FB1', 0.25),
          );
          bottle.position.set(0.06, 1.63, bz);
          shelfGroup.add(kibbleBag, bottle);
        });
      } else {
        [
          [-0.68, 0.98, coralMat],
          [-0.1, 0.98, mustardMat],
          [0.52, 0.98, mintTrimMat],
          [-0.4, 1.64, mustardMat],
          [0.38, 1.64, coralMat],
        ].forEach(([bz, sy, ym]) => {
          const yarn = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), ym as THREE.Material);
          yarn.position.set(0.06, sy as number, bz as number);
          shelfGroup.add(yarn);
        });
      }
      mergeStaticGroupByMaterial(shelfGroup);
      group.add(shelfGroup);
      colliders.push({type: 'box', x: -7.1, z: sz, hw: 0.56, hd: 1.4});
    });

    // Grooming / Spa Wash Corner (back-left)
    const spaGroup = new THREE.Group();
    spaGroup.position.set(-4.85, 0, -5.55);
    const spaTub = new THREE.Mesh(new RoundedBoxGeometry(1.75, 0.76, 1.05, 3, 0.14), clayMat('#F4FAFC', 0.35));
    spaTub.position.y = 0.38;
    const spaWater = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.08, 0.78, 2, 0.04), glassMat);
    spaWater.position.y = 0.71;
    const faucetPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.82, 8), clayMat('#C6CFD6', 0.3));
    faucetPipe.position.set(-0.68, 1.08, -0.35);
    const showerHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), clayMat('#D8E0E6', 0.28));
    showerHead.position.set(-0.56, 1.44, -0.24);
    const towelStack = new THREE.Mesh(new RoundedBoxGeometry(0.45, 0.2, 0.36, 2, 0.04), sageMat);
    towelStack.position.set(0.62, 0.84, -0.34);
    spaGroup.add(spaTub, spaWater, faucetPipe, showerHead, towelStack);
    mergeStaticGroupByMaterial(spaGroup);
    group.add(spaGroup);
    colliders.push({type: 'box', x: -4.85, z: -5.55, hw: 1.0, hd: 0.64});

    // Cozy Customer Lounge Bench (front-left)
    const bench = new THREE.Group();
    bench.position.set(-4.95, 0, 2.35);
    const benchBase = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.36, 0.88, 3, 0.08), oakMat);
    benchBase.position.y = 0.22;
    const benchCushion = new THREE.Mesh(new RoundedBoxGeometry(2.06, 0.16, 0.78, 3, 0.06), cushionMat);
    benchCushion.position.y = 0.44;
    const benchBack = new THREE.Mesh(new RoundedBoxGeometry(2.14, 0.52, 0.18, 3, 0.06), mintTrimMat);
    benchBack.position.set(0, 0.68, -0.34);
    bench.add(benchBase, benchCushion, benchBack);
    mergeStaticGroupByMaterial(bench);
    group.add(bench);
    colliders.push({type: 'box', x: -4.95, z: 2.35, hw: 1.2, hd: 0.56});

    // Right Wing: Spacious Cozy Pet Adoption Playpen Lounge (Puppy + Blue Bird playing together!)
    const playRug = new THREE.Mesh(
      new THREE.CylinderGeometry(2.8, 2.85, 0.05, 32),
      clayMat('#FCEAD2', 0.88),
    );
    playRug.position.set(4.35, 0.025, 0.05);
    group.add(playRug);

    // Low modern oak-and-glass rounded playpen border on back & right sides
    const penBack = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.48, 0.14, 2, 0.04), oakMat);
    penBack.position.set(4.5, 0.24, -2.4);
    const penRight = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.48, 4.4, 2, 0.04), oakMat);
    penRight.position.set(6.55, 0.24, -0.2);
    const penGlassBack = new THREE.Mesh(new RoundedBoxGeometry(3.9, 0.34, 0.06, 2, 0.02), glassMat);
    penGlassBack.position.set(4.5, 0.26, -2.4);
    group.add(penBack, penRight, penGlassBack);
    colliders.push({type: 'box', x: 4.5, z: -2.4, hw: 2.15, hd: 0.22});
    colliders.push({type: 'box', x: 6.55, z: -0.2, hw: 0.22, hd: 2.25});

    // Multi-tier modern cat tree & cozy cubby (back-right corner)
    const catTree = new THREE.Group();
    catTree.position.set(6.4, 0, -4.85);
    const ctBase = new THREE.Mesh(new RoundedBoxGeometry(1.45, 0.14, 1.25, 2, 0.04), oakMat);
    ctBase.position.y = 0.07;
    const ctCubby = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.68, 0.72, 2, 0.08), sageMat);
    ctCubby.position.set(-0.24, 0.48, 0);
    const ctHole = new THREE.Mesh(new THREE.CircleGeometry(0.21, 14), oakDarkMat);
    ctHole.position.set(-0.24, 0.48, 0.37);
    const ctPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.45, 10), clayMat('#D6B17C', 0.82));
    ctPost.position.set(0.36, 0.8, -0.1);
    const ctTopPad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.12, 16), cushionMat);
    ctTopPad.position.set(0.36, 1.56, -0.1);
    catTree.add(ctBase, ctCubby, ctHole, ctPost, ctTopPad);
    mergeStaticGroupByMaterial(catTree);
    group.add(catTree);
    colliders.push({type: 'box', x: 6.4, z: -4.85, hw: 0.85, hd: 0.75});

    // Wooden bird perch stand & plush pet beds in the lounge
    const perchGroup = new THREE.Group();
    perchGroup.position.set(5.65, 0, 1.45);
    const perchBase = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 16), oakMat);
    perchBase.position.y = 0.04;
    const perchPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.15, 10), oakDarkMat);
    perchPole.position.y = 0.62;
    const perchBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.74, 10), oakMat);
    perchBar.rotation.z = Math.PI / 2;
    perchBar.position.y = 1.16;
    perchGroup.add(perchBase, perchPole, perchBar);
    mergeStaticGroupByMaterial(perchGroup);
    group.add(perchGroup);
    colliders.push({type: 'circle', x: 5.65, z: 1.45, r: 0.45});

    [
      [3.55, -1.35, coralMat],
      [5.5, -1.15, mintTrimMat],
    ].forEach(([bx, bz, rimMat]) => {
      const bedGroup = new THREE.Group();
      bedGroup.position.set(bx as number, 0, bz as number);
      const bedRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.14, 10, 20),
        rimMat as THREE.Material,
      );
      bedRim.rotation.x = Math.PI / 2;
      bedRim.position.y = 0.14;
      const bedPad = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.11, 18), cushionMat);
      bedPad.position.y = 0.08;
      bedGroup.add(bedRim, bedPad);
      group.add(bedGroup);
      colliders.push({type: 'circle', x: bx as number, z: bz as number, r: 0.68});
    });

    // Food bowl & cute toy ball in the playpen
    const bowlMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 14), coralMat);
    bowlMesh.position.set(3.2, 0.06, 0.85);
    const toyBall = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), mustardMat);
    toyBall.position.set(4.15, 0.14, 0.65);
    group.add(bowlMesh, toyBall);

    // Animated Pets showcase (Cún Nâu, Chim Xanh, Cún Shiba Bé, Mèo Trung Hoa Trắng, Vẹt Tinh Nghịch)
    const shopPuppyRig = buildPetModel('brown_puppy', {scale: 1.22, withShadow: true});
    shopPuppyRig.root.position.set(3.52, 0, -0.32);
    shopPuppyRig.root.rotation.y = -0.3;
    group.add(shopPuppyRig.root);

    const shopShibaRig = buildPetModel('shiba_puppy', {scale: 1.24, withShadow: true});
    shopShibaRig.root.position.set(4.18, 0, 0.34);
    shopShibaRig.root.rotation.y = -0.58;
    group.add(shopShibaRig.root);

    const shopCatRig = buildPetModel('chinese_cat', {scale: 1.24, withShadow: true});
    shopCatRig.root.position.set(4.82, 0, -0.45);
    shopCatRig.root.rotation.y = -0.78;
    group.add(shopCatRig.root);

    const shopBirdRig = buildPetModel('blue_bird', {scale: 1.26, withShadow: true});
    shopBirdRig.root.position.set(4.65, 0.42, 0.22);
    shopBirdRig.root.rotation.y = -0.82;
    group.add(shopBirdRig.root);

    const shopParrotRig = buildPetModel('mischievous_parrot', {scale: 1.28, withShadow: true});
    shopParrotRig.root.position.set(3.96, 0.48, -0.78);
    shopParrotRig.root.rotation.y = -0.42;
    group.add(shopParrotRig.root);

    colliders.push({type: 'circle', x: 4.15, z: 0.05, r: 0.85});
    addBoxProxy(
      group,
      [2.65, 1.55, 2.35],
      [4.22, 0.75, -0.05],
      {kind: 'open_pet_adopt', tx: 2.35, tz: 1.45},
      clickTargets,
    );

    updateFn = (elapsed) => {
      const hop = Math.max(0, Math.sin(elapsed * 3.8)) * 0.08;
      shopPuppyRig.root.position.y = hop;
      shopPuppyRig.root.rotation.y = -0.3 + Math.sin(elapsed * 1.4) * 0.22;
      updatePetAnimation(shopPuppyRig, 'shop_play', elapsed, {baseScale: 1.22});

      const shibaHop = Math.max(0, Math.sin(elapsed * 4.2 + 1.2)) * 0.09;
      shopShibaRig.root.position.y = shibaHop;
      shopShibaRig.root.rotation.y = -0.58 + Math.sin(elapsed * 1.6 + 1.0) * 0.25;
      updatePetAnimation(shopShibaRig, 'shop_play', elapsed, {baseScale: 1.24});

      shopCatRig.root.rotation.y = -0.78 + Math.sin(elapsed * 1.1 + 0.4) * 0.18;
      updatePetAnimation(shopCatRig, 'idle', elapsed, {baseScale: 1.24});

      shopBirdRig.root.position.x = 4.65 + Math.cos(elapsed * 2.1) * 0.18;
      shopBirdRig.root.position.z = 0.22 + Math.sin(elapsed * 2.1) * 0.16;
      shopBirdRig.root.rotation.y = -0.82 + Math.sin(elapsed * 2.1) * 0.35;
      updatePetAnimation(shopBirdRig, 'shop_play', elapsed, {baseScale: 1.26});

      shopParrotRig.root.position.x = 3.96 + Math.sin(elapsed * 1.85) * 0.18;
      shopParrotRig.root.position.z = -0.78 + Math.cos(elapsed * 1.85) * 0.15;
      shopParrotRig.root.rotation.y = -0.42 + Math.cos(elapsed * 1.85) * 0.38;
      updatePetAnimation(shopParrotRig, 'shop_play', elapsed, {baseScale: 1.28});
    };

    // Handsome NPC Ivan standing behind counter with a STATIC sculpted squirrel on his shoulder
    const ivanRig = buildAvatarRig(IVAN_AVATAR);
    ivanRig.root.position.set(0, 0, -4.85);
    ivanRig.root.rotation.y = 0;
    updateAvatarRigAnimation(ivanRig, 'idle', 0, false);

    // Static sculpted squirrel perched on Ivan's right shoulder
    const squirrel = new THREE.Group();
    squirrel.position.set(0.24, 0.96, 0.02);
    squirrel.rotation.y = -0.18;

    const sqFurMat = clayMat('#C46A34', 0.76);
    const sqDarkFurMat = clayMat('#9A4B22', 0.76);
    const sqBellyMat = clayMat('#F9E4C8', 0.8);
    const sqEyeMat = glossyClayMat('#1E1B18', 0.12);
    const sqEyeShineMat = new THREE.MeshBasicMaterial({color: '#FFFFFF'});
    const sqNoseMat = glossyClayMat('#592B1C', 0.25);
    const sqAcornMat = clayMat('#A97546', 0.72);
    const sqCapMat = clayMat('#643C20', 0.78);

    const sqBody = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), sqFurMat);
    sqBody.scale.set(0.86, 1.18, 0.94);
    sqBody.position.set(0, 0.095, 0);

    const sqBelly = new THREE.Mesh(new THREE.SphereGeometry(0.056, 9, 7), sqBellyMat);
    sqBelly.scale.set(0.82, 1.05, 0.55);
    sqBelly.position.set(0, 0.09, 0.048);

    const sqHead = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 9), sqFurMat);
    sqHead.scale.set(1.02, 0.96, 1.04);
    sqHead.position.set(0, 0.205, 0.024);

    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), sqBellyMat);
      cheek.position.set(side * 0.036, 0.188, 0.064);
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.058, 7), sqDarkFurMat);
      ear.position.set(side * 0.04, 0.272, 0.014);
      ear.rotation.z = -side * 0.22;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 7, 7), sqEyeMat);
      eye.position.set(side * 0.03, 0.214, 0.081);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 5, 5), sqEyeShineMat);
      glint.position.set(side * 0.032, 0.218, 0.091);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.02, 7, 6), sqFurMat);
      paw.position.set(side * 0.036, 0.128, 0.072);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 6), sqFurMat);
      foot.scale.set(0.8, 0.55, 1.35);
      foot.position.set(side * 0.04, 0.015, 0.036);
      squirrel.add(cheek, ear, eye, glint, paw, foot);
    });

    const sqNose = new THREE.Mesh(new THREE.SphereGeometry(0.011, 7, 6), sqNoseMat);
    sqNose.position.set(0, 0.2, 0.094);

    const acornBody = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 7), sqAcornMat);
    acornBody.scale.set(0.88, 1.1, 0.88);
    acornBody.position.set(0, 0.132, 0.088);
    const acornCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55),
      sqCapMat,
    );
    acornCap.position.set(0, 0.146, 0.088);

    const tailLow = new THREE.Mesh(new THREE.SphereGeometry(0.058, 9, 8), sqFurMat);
    tailLow.scale.set(0.82, 1.25, 0.95);
    tailLow.position.set(0, 0.09, -0.085);
    tailLow.rotation.x = 0.55;
    const tailMid = new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 8), sqFurMat);
    tailMid.scale.set(0.86, 1.45, 0.95);
    tailMid.position.set(0, 0.195, -0.118);
    tailMid.rotation.x = -0.18;
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.064, 10, 8), sqDarkFurMat);
    tailTip.scale.set(0.84, 1.28, 0.95);
    tailTip.position.set(0, 0.295, -0.078);
    tailTip.rotation.x = -0.78;

    squirrel.add(sqBody, sqBelly, sqHead, sqNose, acornBody, acornCap, tailLow, tailMid, tailTip);
    mergeStaticGroupByMaterial(squirrel);
    ivanRig.root.add(squirrel);
    group.add(ivanRig.root);

    addBoxProxy(
      group,
      [1.3, 2.0, 1.3],
      [0, 1.0, -4.85],
      {kind: 'ivan_npc', tx: 0, tz: -2.25},
      clickTargets,
    );
    colliders.push({type: 'circle', x: 0, z: -4.85, r: 0.45});
    labelAnchors.push({
      id: 'ivan_npc',
      label: 'Ivan',
      worldPos: new THREE.Vector3(0, 2.22, -4.85),
      isNpc: true,
      maxLabelDist: 3.6,
    });

    group.add(createExitDoorway('Cửa Ra Phố', [0, 0, 6.25], '#E57F5E', clickTargets, labelAnchors));
    mergeStaticGroupByMaterial(
      group,
      new Set([
        ivanRig.root,
        shopPuppyRig.root,
        shopShibaRig.root,
        shopCatRig.root,
        shopBirdRig.root,
        shopParrotRig.root,
      ]),
    );
  }

  return {
    group,
    groundMesh,
    clickTargets,
    labelAnchors,
    colliders,
    doors,
    wallSurfaces,
    setHouseLightsOn: setHouseLightsOnFn,
    getHouseLightsOn: getHouseLightsOnFn,
    setLampOn: setLampOnFn,
    getHouseLamps: getHouseLampsFn,
    setActiveBathtub: setActiveBathtubFn,
    setActiveBed: setActiveBedFn,
    triggerPondFeed: triggerPondFeedFn,
    setFishingState: setFishingStateFn,
    updateFishingVisuals: updateFishingVisualsFn,
    update: updateFn,
    dispose: () => {
      disposables.forEach((t) => {
        if (!t.userData?.sharedCache) t.dispose();
      });
      subzoneFishingVisuals?.dispose();
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => {
              if (!mat.userData?.pooled) mat.dispose();
            });
          } else if (!m.material.userData?.pooled) {
            m.material.dispose();
          }
        }
      });
    },
  };
}
