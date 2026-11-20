import React, {useEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {buildAvatarRig, updateAvatarRigAnimation} from '../three/avatar3d';
import {clayMat} from '../three/materials';
import {AvatarConfig} from '../types/game';

interface AvatarPreview3DProps {
  avatar: AvatarConfig;
  className?: string;
  showInspectorControls?: boolean;
  portraitFraming?: boolean;
}

type AngleKey = 'front' | 'angle45' | 'side90' | 'back';

const ANGLE_VALUES: Record<AngleKey, {label: string; rotY: number}> = {
  front: {label: 'Chính diện', rotY: 0},
  angle45: {label: '45°', rotY: Math.PI * 0.25},
  side90: {label: '90°', rotY: Math.PI * 0.5},
  back: {label: 'Sau', rotY: Math.PI},
};

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({
  avatar,
  className = '',
  showInspectorControls = true,
  portraitFraming = false,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<AvatarConfig>(avatar);
  const rebuildFnRef = useRef<((cfg: AvatarConfig) => void) | null>(null);
  const rotYRef = useRef(portraitFraming ? 0.14 : 0.25);
  const targetRotYRef = useRef<number | null>(null);
  const autoSpinRef = useRef(!portraitFraming);
  const headZoomRef = useRef(portraitFraming);

  const [activeAngle, setActiveAngle] = useState<AngleKey | null>(null);
  const [headZoom, setHeadZoom] = useState(false);

  useEffect(() => {
    avatarRef.current = avatar;
    rebuildFnRef.current?.(avatar);
  }, [avatar]);

  const handleSelectAngle = (key: AngleKey) => {
    autoSpinRef.current = false;
    const base = ANGLE_VALUES[key].rotY;
    const twoPi = Math.PI * 2;
    targetRotYRef.current =
      base + Math.round((rotYRef.current - base) / twoPi) * twoPi;
    setActiveAngle(key);
  };

  const handleToggleZoom = () => {
    const next = !headZoom;
    headZoomRef.current = next;
    setHeadZoom(next);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = false;

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 190;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    scene.environment = envTex;
    scene.environmentIntensity = 0.42;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);
    camera.position.set(0, 1.25, 4.25);
    camera.lookAt(0, 0.96, 0);

    const hemi = new THREE.HemisphereLight('#FFF8EE', '#B89578', 0.6);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF1D6', 1.22);
    key.position.set(2.5, 4.5, 3.5);
    key.castShadow = false;
    scene.add(key);

    const rim = new THREE.DirectionalLight('#B8DCFF', 0.48);
    rim.position.set(-2.5, 2.5, -2.5);
    scene.add(rim);

    // Pedestal rug
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.88, 0.95, 0.1, 28),
      clayMat('#E8B5A6', 0.72),
    );
    pedestal.position.y = -0.05;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    let currentRig = buildAvatarRig(avatarRef.current);
    scene.add(currentRig.root);

    rebuildFnRef.current = (cfg: AvatarConfig) => {
      scene.remove(currentRig.root);
      currentRig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      currentRig = buildAvatarRig(cfg);
      currentRig.root.rotation.y = rotYRef.current;
      scene.add(currentRig.root);
    };

    // Drag to rotate preview
    let dragging = false;
    let lastX = 0;
    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      autoSpinRef.current = false;
      targetRotYRef.current = null;
      setActiveAngle(null);
      lastX = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      rotYRef.current += dx * 0.015;
    };
    const onPointerUp = () => {
      dragging = false;
    };
    const dom = renderer.domElement;
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 260;
      const h = container.clientHeight || 190;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let lastNow = performance.now();
    let camY = headZoomRef.current ? 1.36 : 1.25;
    let camZ = headZoomRef.current ? 2.18 : 4.25;
    let lookY = headZoomRef.current ? 1.28 : 0.96;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const delta = Math.min((now - lastNow) / 1000, 0.1);
      lastNow = now;
      const elapsed = clock.getElapsedTime();

      if (!dragging) {
        if (targetRotYRef.current !== null) {
          rotYRef.current = THREE.MathUtils.damp(
            rotYRef.current,
            targetRotYRef.current,
            10,
            delta,
          );
        } else if (autoSpinRef.current) {
          rotYRef.current += 0.004;
        }
      }

      const wantCamY = headZoomRef.current ? 1.36 : 1.25;
      const wantCamZ = headZoomRef.current ? 2.18 : 4.25;
      const wantLookY = headZoomRef.current ? 1.28 : 0.96;
      camY = THREE.MathUtils.damp(camY, wantCamY, 8, delta);
      camZ = THREE.MathUtils.damp(camZ, wantCamZ, 8, delta);
      lookY = THREE.MathUtils.damp(lookY, wantLookY, 8, delta);
      camera.position.set(0, camY, camZ);
      camera.lookAt(0, lookY, 0);

      currentRig.root.rotation.y = rotYRef.current;
      updateAvatarRigAnimation(
        currentRig,
        'idle',
        elapsed,
        avatarRef.current.eyeStyle === 'cozy',
      );
      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    if (!isSoftwareGl) renderer.compile(scene, camera);
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserver.disconnect();
      envTex.dispose();
      renderer.dispose();
      if (dom.parentNode === container) container.removeChild(dom);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mountRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      {showInspectorControls && (
        <div className="pointer-events-auto absolute inset-x-1.5 top-1.5 flex flex-wrap items-center justify-between gap-1 sm:inset-x-2 sm:top-2">
          <div className="flex items-center gap-0.5 rounded-xl border border-[#DFC7A5] bg-[#FFF8EB]/95 p-0.5 shadow-xs sm:gap-1">
            {(Object.keys(ANGLE_VALUES) as AngleKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectAngle(key)}
                className={`rounded-lg px-1.5 py-0.5 text-[9.5px] font-bold whitespace-nowrap transition-colors sm:px-2 sm:py-1 sm:text-[10px] ${
                  activeAngle === key
                    ? 'bg-[#6F4E37] text-amber-50'
                    : 'text-[#6F4E37] hover:bg-[#EFE0C9]'
                }`}
              >
                {ANGLE_VALUES[key].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleToggleZoom}
            className={`rounded-xl border px-1.5 py-0.5 text-[9.5px] font-bold whitespace-nowrap shadow-xs transition-colors sm:px-2 sm:py-1 sm:text-[10px] ${
              headZoom
                ? 'border-[#6F4E37] bg-[#6F4E37] text-amber-50'
                : 'border-[#DFC7A5] bg-[#FFF8EB]/95 text-[#6F4E37] hover:bg-[#EFE0C9]'
            }`}
          >
            {headZoom ? 'Toàn thân' : 'Soi tóc'}
          </button>
        </div>
      )}
    </div>
  );
};
