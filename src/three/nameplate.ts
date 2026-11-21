import * as THREE from 'three';

export interface NameplateOptions {
  kind: 'player' | 'pet';
  isMax?: boolean;
  sick?: boolean;
}

export interface NameplateHandle {
  sprite: THREE.Sprite;
  getKey: () => string;
  update: (text: string, opts?: Partial<NameplateOptions>) => void;
  dispose: () => void;
}

const CANVAS_W = 640;
const CANVAS_H = 112;
const ASPECT = CANVAS_W / CANVAS_H;

function drawSparkleStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  fill: string,
  stroke: string,
) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const ang = (i * Math.PI) / 4 - Math.PI / 2;
    const x = cx + Math.cos(ang) * r;
    const y = cy + Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function renderNameplateCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  opts: NameplateOptions,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  const label = text.trim() || (opts.kind === 'player' ? 'Mây Nhỏ' : 'Thú Cưng');
  const isMax = Boolean(opts.kind === 'pet' && opts.isMax);
  const isSick = Boolean(opts.kind === 'pet' && opts.sick);

  const fontSize = opts.kind === 'player' ? 35 : 32;
  ctx.font = `800 ${fontSize}px "Nunito", "Quicksand", system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  const textWidth = ctx.measureText(label).width;
  const blingW = isMax ? 38 : 0;
  const sickLabel = isSick ? ' (Ốm)' : '';
  let sickW = 0;
  if (isSick) {
    ctx.font = `800 25px "Nunito", "Quicksand", system-ui, -apple-system, sans-serif`;
    sickW = ctx.measureText(sickLabel).width;
    ctx.font = `800 ${fontSize}px "Nunito", "Quicksand", system-ui, -apple-system, sans-serif`;
  }

  const totalW = blingW + textWidth + sickW;
  let cursorX = (CANVAS_W - totalW) / 2;
  const cy = CANVAS_H / 2;

  if (isMax) {
    drawSparkleStar(ctx, cursorX + 14, cy - 1, 14, 5, '#FFE266', 'rgba(42, 26, 12, 0.82)');
    drawSparkleStar(ctx, cursorX + 27, cy - 14, 6.5, 2.5, '#FFF8BA', 'rgba(42, 26, 12, 0.72)');
    cursorX += blingW;
  }

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = 'rgba(26, 18, 11, 0.78)';
  ctx.shadowColor = 'rgba(18, 12, 6, 0.42)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.strokeText(label, cursorX, cy);

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = opts.kind === 'player' ? '#FFFDF8' : '#FFF8EC';
  ctx.fillText(label, cursorX, cy);
  ctx.restore();

  if (isSick) {
    cursorX += textWidth;
    ctx.save();
    ctx.font = `800 25px "Nunito", "Quicksand", system-ui, -apple-system, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5.5;
    ctx.strokeStyle = 'rgba(46, 16, 22, 0.82)';
    ctx.strokeText(sickLabel, cursorX, cy + 1);
    ctx.fillStyle = '#FF9AA8';
    ctx.fillText(sickLabel, cursorX, cy + 1);
    ctx.restore();
  }
}

export function createNameplateHandle(
  initialText: string,
  initialOpts: NameplateOptions,
): NameplateHandle {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  let currentText = initialText;
  let currentOpts: NameplateOptions = {...initialOpts};
  const makeKey = (t: string, o: NameplateOptions) =>
    `${o.kind}|${t}|${o.isMax ? 1 : 0}|${o.sick ? 1 : 0}`;
  let currentKey = makeKey(currentText, currentOpts);

  renderNameplateCanvas(canvas, currentText, currentOpts);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.5);
  sprite.renderOrder = 120;
  const baseH = currentOpts.kind === 'player' ? 0.34 : 0.30;
  sprite.scale.set(baseH * ASPECT, baseH, 1);

  return {
    sprite,
    getKey: () => currentKey,
    update: (nextText: string, patch?: Partial<NameplateOptions>) => {
      const nextOpts: NameplateOptions = {
        ...currentOpts,
        ...patch,
      };
      const nextKey = makeKey(nextText, nextOpts);
      if (nextKey === currentKey) return;
      currentText = nextText;
      currentOpts = nextOpts;
      currentKey = nextKey;
      renderNameplateCanvas(canvas, currentText, currentOpts);
      texture.needsUpdate = true;
    },
    dispose: () => {
      texture.dispose();
      material.dispose();
    },
  };
}

const _npWorldPos = new THREE.Vector3();

export function syncNameplateScale(
  sprite: THREE.Sprite,
  camera: THREE.Camera,
  baseHeight = 0.33,
): void {
  sprite.getWorldPosition(_npWorldPos);
  const dist = camera.position.distanceTo(_npWorldPos);
  const factor = THREE.MathUtils.clamp(dist / 9.2, 0.68, 1.65);
  const h = baseHeight * factor;
  sprite.scale.set(h * ASPECT, h, 1);
}
