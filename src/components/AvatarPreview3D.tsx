import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {buildAvatarRig, updateAvatarRigAnimation} from '../three/avatar3d';
import {clayMat} from '../three/materials';
import {AvatarConfig} from '../types/game';

interface AvatarPreview3DProps {
  avatar: AvatarConfig;
  className?: string;
}

export const AvatarPreview3D: React.FC<AvatarPreview3DProps> = ({
  avatar,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const avatarRef = useRef<AvatarConfig>(avatar);
  const rebuildFnRef = useRef<((cfg: AvatarConfig) => void) | null>(null);
  const rotYRef = useRef(0.2);

  useEffect(() => {
    avatarRef.current = avatar;
    rebuildFnRef.current?.(avatar);
  }, [avatar]);

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
    renderer.toneMappingExposure = 0.96;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 190;
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.42;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 30);
    camera.position.set(0, 1.28, 4.05);
    camera.lookAt(0, 0.94, 0);

    const hemi = new THREE.HemisphereLight('#FFF8EE', '#B89578', 0.58);
    scene.add(hemi);

    const key = new THREE.DirectionalLight('#FFF1D6', 1.2);
    key.position.set(2.5, 4.5, 3.5);
    key.castShadow = false;
    scene.add(key);

    const rim = new THREE.DirectionalLight('#B8DCFF', 0.44);
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
      const elapsed = clock.getElapsedTime();
      if (!dragging) {
        rotYRef.current += 0.004;
      }
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
    <div
      ref={mountRef}
      className={`cursor-grab active:cursor-grabbing ${className}`}
    />
  );
};
