import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {soundFX} from '../../utils/sound';

let _sharedAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (!soundFX.enabled || typeof window === 'undefined') return null;
  if (!_sharedAudioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext;
    if (AudioCtx) {
      _sharedAudioCtx = new AudioCtx();
    }
  }
  if (_sharedAudioCtx && _sharedAudioCtx.state === 'suspended') {
    _sharedAudioCtx.resume().catch(() => {});
  }
  return _sharedAudioCtx;
}

export type ArcadeSfxType =
  | 'jump'
  | 'double_jump'
  | 'bounce'
  | 'star'
  | 'checkpoint'
  | 'hit'
  | 'break'
  | 'zipline'
  | 'boost'
  | 'win';

export function playArcadeSfx(kind: ArcadeSfxType): void {
  const ctx = getAudioCtx();
  if (!ctx) {
    if (kind === 'star' || kind === 'checkpoint' || kind === 'win') soundFX.sparkle();
    else if (kind === 'jump' || kind === 'bounce') soundFX.tap();
    return;
  }

  const tone = (
    freq: number,
    endFreq: number,
    dur: number,
    type: OscillatorType = 'sine',
    vol = 0.055,
    delay = 0,
  ) => {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), t0 + dur);
    }
    gain.gain.setValueAtTime(0.001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  };

  switch (kind) {
    case 'jump':
      tone(320, 540, 0.11, 'triangle', 0.05);
      break;
    case 'double_jump':
      tone(460, 780, 0.13, 'sine', 0.055);
      break;
    case 'bounce':
      tone(240, 860, 0.18, 'triangle', 0.065);
      break;
    case 'star':
      tone(784, 1046, 0.09, 'sine', 0.055, 0);
      tone(1046, 1318, 0.13, 'sine', 0.05, 0.06);
      break;
    case 'checkpoint':
      tone(523.25, 523.25, 0.08, 'triangle', 0.06, 0);
      tone(659.25, 659.25, 0.09, 'triangle', 0.06, 0.07);
      tone(1046.5, 1046.5, 0.18, 'sine', 0.06, 0.14);
      break;
    case 'hit':
      tone(210, 95, 0.18, 'sawtooth', 0.055);
      break;
    case 'break':
      tone(280, 120, 0.12, 'square', 0.038);
      break;
    case 'zipline':
      tone(420, 620, 0.16, 'sine', 0.04);
      break;
    case 'boost':
      tone(400, 980, 0.16, 'triangle', 0.055);
      break;
    case 'win':
      tone(523.25, 523.25, 0.1, 'triangle', 0.065, 0);
      tone(659.25, 659.25, 0.1, 'triangle', 0.065, 0.09);
      tone(783.99, 783.99, 0.1, 'triangle', 0.065, 0.18);
      tone(1046.5, 1046.5, 0.28, 'sine', 0.07, 0.27);
      break;
  }
}

export function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

export function createStudioRenderer(container: HTMLElement): {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  envTex: THREE.Texture;
  isSoftwareGl: boolean;
} {
  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  if (!isSoftwareGl) {
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const w = Math.max(320, container.clientWidth || 720);
  const h = Math.max(240, container.clientHeight || 420);
  renderer.setSize(w, h);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.36;

  return {renderer, scene, envTex, isSoftwareGl};
}

export function createSkyDomeMesh(
  topColor: string,
  midColor: string,
  bottomColor: string,
  radius = 220,
): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topColor);
  grad.addColorStop(0.55, midColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    new THREE.MeshBasicMaterial({map: tex, side: THREE.BackSide, depthWrite: false, fog: false}),
  );
}

export function makeCanvasTex(
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 4;
  return tex;
}

export function createWoodPlankTexture(base = '#925B34', line = '#5B3419'): THREE.CanvasTexture {
  return makeCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let y = 0; y < h; y += 32) {
      ctx.fillRect(0, y, w, 14);
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = 3;
    for (let y = 0; y <= h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(64, 0);
    ctx.lineTo(64, 32);
    ctx.moveTo(28, 32);
    ctx.lineTo(28, 64);
    ctx.moveTo(96, 64);
    ctx.lineTo(96, 96);
    ctx.moveTo(48, 96);
    ctx.lineTo(48, 128);
    ctx.stroke();
  });
}

export function createStoneTileTexture(base = '#64748B', accent = '#94A3B8'): THREE.CanvasTexture {
  return makeCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(4, 4, 56, 56);
    ctx.fillRect(68, 68, 56, 56);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(15,23,42,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 60, 60);
    ctx.strokeRect(66, 2, 60, 60);
    ctx.strokeRect(2, 66, 60, 60);
    ctx.strokeRect(66, 66, 60, 60);
  });
}

export function createHazardStripeTexture(c1 = '#F59E0B', c2 = '#1E293B'): THREE.CanvasTexture {
  return makeCanvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = c1;
    for (let i = -h; i < w + h; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 16, 0);
      ctx.lineTo(i + 16 - h, h);
      ctx.lineTo(i - h, h);
      ctx.closePath();
      ctx.fill();
    }
  });
}

export function createConveyorTexture(forward = true): THREE.CanvasTexture {
  return makeCanvasTex(
    128,
    128,
    (ctx, w, h) => {
      ctx.fillStyle = forward ? '#0F2B46' : '#3B142C';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = forward ? '#38BDF8' : '#FB7185';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let y = 26; y <= 112; y += 44) {
        ctx.beginPath();
        if (forward) {
          ctx.moveTo(22, y + 18);
          ctx.lineTo(w / 2, y);
          ctx.lineTo(w - 22, y + 18);
        } else {
          ctx.moveTo(22, y);
          ctx.lineTo(w / 2, y + 18);
          ctx.lineTo(w - 22, y);
        }
        ctx.stroke();
      }
    },
    1,
    4,
  );
}

export function createCheckeredFinishTexture(): THREE.CanvasTexture {
  return makeCanvasTex(128, 64, (ctx, w, h) => {
    const cell = 16;
    for (let y = 0; y < h; y += cell) {
      for (let x = 0; x < w; x += cell) {
        ctx.fillStyle = ((x / cell + y / cell) & 1) === 0 ? '#FFFFFF' : '#0F172A';
        ctx.fillRect(x, y, cell, cell);
      }
    }
  });
}

interface BurstParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

export class ParticleBurstPool {
  private mesh: THREE.InstancedMesh;
  private pool: BurstParticle[];
  private dummy = new THREE.Object3D();

  constructor(scene: THREE.Scene, maxCount = 160) {
    const geo = new THREE.SphereGeometry(0.11, 7, 6);
    const mat = new THREE.MeshBasicMaterial({color: '#FFFFFF'});
    this.mesh = new THREE.InstancedMesh(geo, mat, maxCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const zeroColor = new THREE.Color('#FFFFFF');
    this.pool = Array.from({length: maxCount}, (_, i) => {
      this.dummy.position.set(0, -999, 0);
      this.dummy.scale.setScalar(0.001);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
      this.mesh.setColorAt(i, zeroColor);
      return {
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 1,
        color: new THREE.Color('#FFFFFF'),
      };
    });
    scene.add(this.mesh);
  }

  emit(
    x: number,
    y: number,
    z: number,
    colorHex: string,
    count = 12,
    speed = 4.2,
    upward = 3.8,
  ): void {
    let spawned = 0;
    for (let i = 0; i < this.pool.length && spawned < count; i++) {
      const p = this.pool[i];
      if (p.active) continue;
      p.active = true;
      p.x = x;
      p.y = y;
      p.z = z;
      const a = Math.random() * Math.PI * 2;
      const r = (0.35 + Math.random() * 0.65) * speed;
      p.vx = Math.cos(a) * r;
      p.vy = upward * (0.45 + Math.random() * 0.75);
      p.vz = Math.sin(a) * r;
      p.maxLife = 0.35 + Math.random() * 0.38;
      p.life = p.maxLife;
      p.scale = 0.65 + Math.random() * 0.85;
      p.color.set(colorHex);
      this.mesh.setColorAt(i, p.color);
      spawned++;
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.dummy.position.set(0, -999, 0);
        this.dummy.scale.setScalar(0.001);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      p.vy -= 11.5 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const ratio = p.life / p.maxLife;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.scale.setScalar(p.scale * ratio);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

export function disposeSceneObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (mat) {
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map && !std.map.userData?.sharedCache) std.map.dispose();
        if (std.emissiveMap && !std.emissiveMap.userData?.sharedCache) std.emissiveMap.dispose();
        m.dispose();
      }
    }
  });
}
