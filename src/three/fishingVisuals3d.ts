import * as THREE from 'three';
import {ROD_BOBBER_SPECS} from '../data/fishingCatalog';
import {ToolId} from '../types/game';
import {glossyClayMat} from './materials';

export interface FishingVisualFrame {
  active: boolean;
  bobberVisible: boolean;
  bobberX: number;
  bobberY: number;
  bobberZ: number;
  bobberTiltX: number;
  bobberTiltZ: number;
  rippleVisible: boolean;
  rippleX: number;
  rippleZ: number;
  rippleScale: number;
  rippleOpacity: number;
  burstVisible: boolean;
  burstX: number;
  burstZ: number;
  burstScale: number;
  burstOpacity: number;
  shadowVisible: boolean;
  shadowX: number;
  shadowZ: number;
  shadowRotY: number;
  shadowScale: number;
  shadowOpacity: number;
  shadowTailSpeed: number;
}

export interface FishingSpotVisuals {
  group: THREE.Group;
  applyFrame: (frame: FishingVisualFrame, elapsed: number) => void;
  setLegacyState: (state: 'idle' | 'waiting' | 'bite') => void;
  updateLegacy: (elapsed: number) => void;
  dispose: () => void;
}

export function createFishingSpotVisuals(options: {
  waterY: number;
  defaultPos: [number, number, number];
  toolId?: ToolId;
}): FishingSpotVisuals {
  const {waterY, defaultPos, toolId = 'wooden_rod'} = options;
  const spec = ROD_BOBBER_SPECS[toolId] ?? ROD_BOBBER_SPECS.wooden_rod;

  const group = new THREE.Group();

  // 1. Round Brown Bobber for Wooden Rod (phao câu nâu tròn)
  const bobberGroup = new THREE.Group();
  bobberGroup.position.set(defaultPos[0], waterY, defaultPos[2]);
  bobberGroup.visible = false;

  const bobberBodyMat = glossyClayMat(spec.primaryColor, 0.24);
  const bobberBandMat = glossyClayMat(spec.bandColor, 0.34);
  const bobberPinMat = glossyClayMat(spec.metalColor, 0.2);

  const bobberSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 14, 12),
    bobberBodyMat,
  );
  const bobberBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.156, 0.022, 8, 18),
    bobberBandMat,
  );
  bobberBand.rotation.x = Math.PI / 2;
  bobberBand.position.y = -0.02;

  const bobberPin = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.09, 8),
    bobberPinMat,
  );
  bobberPin.position.y = 0.16;

  bobberGroup.add(bobberSphere, bobberBand, bobberPin);
  group.add(bobberGroup);

  // 2. Primary Expanding Water Ripple Ring
  const rippleGeo = new THREE.RingGeometry(0.22, 0.36, 26);
  rippleGeo.rotateX(-Math.PI / 2);
  const rippleMat = new THREE.MeshBasicMaterial({
    color: '#ECF9FF',
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
  rippleMesh.position.set(defaultPos[0], waterY + 0.018, defaultPos[2]);
  rippleMesh.visible = false;
  group.add(rippleMesh);

  // 3. Secondary Energetic Splash Ring (on landing, nibbles & fierce bite!)
  const burstGeo = new THREE.RingGeometry(0.18, 0.31, 24);
  burstGeo.rotateX(-Math.PI / 2);
  const burstMat = new THREE.MeshBasicMaterial({
    color: '#FFFFFF',
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const burstMesh = new THREE.Mesh(burstGeo, burstMat);
  burstMesh.position.set(defaultPos[0], waterY + 0.024, defaultPos[2]);
  burstMesh.visible = false;
  group.add(burstMesh);

  // 4. Flat Underwater Fish Shadow Silhouette (Vệt bóng hình cá dẹt dưới mặt nước)
  const shadowGroup = new THREE.Group();
  shadowGroup.position.set(defaultPos[0], waterY + 0.008, defaultPos[2] - 1.4);
  shadowGroup.visible = false;

  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#072230',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  // Streamlined top-down fish silhouette oriented along +Y in 2D -> rotateX(+PI/2) maps +Y to +Z forward!
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(0, 0.42);
  bodyShape.bezierCurveTo(0.11, 0.4, 0.16, 0.25, 0.145, 0.1);
  // Right pectoral fin silhouette
  bodyShape.quadraticCurveTo(0.24, 0.05, 0.22, -0.02);
  bodyShape.quadraticCurveTo(0.16, -0.01, 0.115, -0.05);
  // Tapering body to tail peduncle
  bodyShape.quadraticCurveTo(0.085, -0.16, 0.046, -0.26);
  bodyShape.lineTo(-0.046, -0.26);
  // Left taper & pectoral fin silhouette
  bodyShape.quadraticCurveTo(-0.085, -0.16, -0.115, -0.05);
  bodyShape.quadraticCurveTo(-0.16, -0.01, -0.22, -0.02);
  bodyShape.quadraticCurveTo(-0.24, 0.05, -0.145, 0.1);
  bodyShape.bezierCurveTo(-0.16, 0.25, -0.11, 0.4, 0, 0.42);

  const shadowBodyGeo = new THREE.ShapeGeometry(bodyShape, 12);
  shadowBodyGeo.rotateX(Math.PI / 2);
  const shadowBody = new THREE.Mesh(shadowBodyGeo, shadowMat);
  shadowBody.renderOrder = 2;

  // Flat forked caudal tail fin on pivot behind body (-Z)
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0, -0.25);
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0.042, 0.01);
  tailShape.quadraticCurveTo(0.13, -0.11, 0.175, -0.27);
  tailShape.quadraticCurveTo(0.08, -0.21, 0, -0.16);
  tailShape.quadraticCurveTo(-0.08, -0.21, -0.175, -0.27);
  tailShape.quadraticCurveTo(-0.13, -0.11, -0.042, 0.01);
  tailShape.closePath();

  const tailGeo = new THREE.ShapeGeometry(tailShape, 8);
  tailGeo.rotateX(Math.PI / 2);
  const tailMesh = new THREE.Mesh(tailGeo, shadowMat);
  tailMesh.renderOrder = 2;
  tailPivot.add(tailMesh);

  shadowGroup.add(shadowBody, tailPivot);
  group.add(shadowGroup);

  let legacyState: 'idle' | 'waiting' | 'bite' = 'idle';

  const applyFrame = (frame: FishingVisualFrame, elapsed: number) => {
    bobberGroup.visible = frame.bobberVisible;
    if (frame.bobberVisible) {
      bobberGroup.position.set(frame.bobberX, frame.bobberY, frame.bobberZ);
      bobberGroup.rotation.set(frame.bobberTiltX, 0, frame.bobberTiltZ);
    }

    rippleMesh.visible = frame.rippleVisible;
    if (frame.rippleVisible) {
      rippleMesh.position.set(frame.rippleX, waterY + 0.018, frame.rippleZ);
      rippleMesh.scale.set(frame.rippleScale, frame.rippleScale, 1);
      rippleMat.opacity = frame.rippleOpacity;
    }

    burstMesh.visible = frame.burstVisible;
    if (frame.burstVisible) {
      burstMesh.position.set(frame.burstX, waterY + 0.024, frame.burstZ);
      burstMesh.scale.set(frame.burstScale, frame.burstScale, 1);
      burstMat.opacity = frame.burstOpacity;
    }

    shadowGroup.visible = frame.shadowVisible;
    if (frame.shadowVisible) {
      shadowGroup.position.set(frame.shadowX, waterY + 0.008, frame.shadowZ);
      shadowGroup.rotation.y = frame.shadowRotY;
      shadowGroup.scale.set(frame.shadowScale, 1, frame.shadowScale);
      shadowMat.opacity = frame.shadowOpacity;
      tailPivot.rotation.y = Math.sin(elapsed * frame.shadowTailSpeed) * 0.34;
    }
  };

  const setLegacyState = (state: 'idle' | 'waiting' | 'bite') => {
    legacyState = state;
    bobberGroup.visible = state !== 'idle';
    rippleMesh.visible = state !== 'idle';
    if (state === 'idle') {
      burstMesh.visible = false;
      shadowGroup.visible = false;
    }
  };

  const updateLegacy = (elapsed: number) => {
    if (!bobberGroup.visible) return;
    bobberGroup.position.set(
      defaultPos[0],
      legacyState === 'bite'
        ? waterY - 0.1 + Math.sin(elapsed * 22) * 0.1
        : waterY + Math.sin(elapsed * 3.2) * 0.03,
      defaultPos[2],
    );
    const rt = (elapsed * (legacyState === 'bite' ? 1.9 : 0.75)) % 1;
    const sc = 0.65 + rt * 1.55;
    rippleMesh.position.set(defaultPos[0], waterY + 0.018, defaultPos[2]);
    rippleMesh.scale.set(sc, sc, 1);
    rippleMat.opacity = (1 - rt) * 0.68;
  };

  const dispose = () => {
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material.dispose();
      }
    });
  };

  return {
    group,
    applyFrame,
    setLegacyState,
    updateLegacy,
    dispose,
  };
}
