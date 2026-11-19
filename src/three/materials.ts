import * as THREE from 'three';

export function createCobblestoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#D8C19F';
  ctx.fillRect(0, 0, 256, 256);

  const stones = [
    '#E6D2B5',
    '#D2B792',
    '#DEC6A4',
    '#C7A981',
    '#EBDBC1',
  ];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const offset = (row % 2) * 16;
      const x = (col * 32 + offset) % 256;
      const y = row * 32;
      ctx.fillStyle = stones[(row * 7 + col * 3) % stones.length];
      ctx.beginPath();
      ctx.roundRect(x + 2, y + 2, 27, 26, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(110, 82, 54, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

export function createWoodPlankTexture(base = '#CC965E', seam = '#9E6C3B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 8; i++) {
    const y = i * 32;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(90,55,25,0.05)';
    ctx.fillRect(0, y, 256, 32);
    ctx.fillStyle = seam;
    ctx.fillRect(0, y, 256, 2);
    const jointX = ((i * 89 + 40) % 210) + 20;
    ctx.fillRect(jointX, y, 2, 32);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createCheckerFloorTexture(a = '#5B4D84', b = '#453969'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? a : b;
      ctx.fillRect(c * size, r * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function createGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6EB856';
  ctx.fillRect(0, 0, 256, 256);

  // Rich meadow color variation patches
  for (let i = 0; i < 180; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    ctx.fillStyle =
      i % 4 === 0
        ? 'rgba(245, 240, 175, 0.1)'
        : i % 2 === 0
          ? 'rgba(54, 118, 42, 0.13)'
          : 'rgba(134, 202, 94, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, (i % 6) + 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle static clover / blade speckles
  for (let i = 0; i < 90; i++) {
    const x = (i * 97 + 19) % 256;
    const y = (i * 53 + 41) % 256;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255,246,178,0.24)' : 'rgba(44,98,34,0.22)';
    ctx.fillRect(x, y, 2, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 12);
  return tex;
}

export function clayMat(color: string | number, roughness = 0.68, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

export function glossyClayMat(color: string | number, roughness = 0.28): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0.05,
    clearcoat: 0.65,
    clearcoatRoughness: 0.25,
  });
}

export function makeShadowed(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}
