import {useCallback, useEffect, useRef, useState} from 'react';
import {AvatarPose} from '../types/game';
import {soundFX} from '../utils/sound';

interface WalkState {
  x: number;
  y: number;
  facing: 'left' | 'right';
  pose: AvatarPose;
}

export function useWalkableAvatar(initialX = 50, initialY = 72) {
  const [state, setState] = useState<WalkState>({
    x: initialX,
    y: initialY,
    facing: 'right',
    pose: 'idle',
  });

  const posRef = useRef({x: initialX, y: initialY});
  const targetRef = useRef<{
    x: number;
    y: number;
    arrivePose: AvatarPose;
    onArrive?: () => void;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastStepRef = useRef<number>(0);

  const stopWalk = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    targetRef.current = null;
  }, []);

  const walkTo = useCallback(
    (
      tx: number,
      ty: number,
      options?: {
        arrivePose?: AvatarPose;
        onArrive?: () => void;
        speedPerSec?: number;
      },
    ) => {
      stopWalk();

      const arrivePose = options?.arrivePose ?? 'idle';
      const onArrive = options?.onArrive;
      const speed = options?.speedPerSec ?? 38; // percent units per sec

      const dx0 = tx - posRef.current.x;
      const dy0 = ty - posRef.current.y;
      const dist0 = Math.hypot(dx0, dy0);

      if (dist0 < 2.2) {
        posRef.current = {x: tx, y: ty};
        setState((prev) => ({
          x: tx,
          y: ty,
          facing: dx0 < -0.5 ? 'left' : dx0 > 0.5 ? 'right' : prev.facing,
          pose: arrivePose,
        }));
        onArrive?.();
        return;
      }

      targetRef.current = {x: tx, y: ty, arrivePose, onArrive};
      const facing: 'left' | 'right' = dx0 < 0 ? 'left' : 'right';
      setState((prev) => ({...prev, facing, pose: 'walk'}));

      let lastTime = performance.now();

      const tick = (now: number) => {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;

        const target = targetRef.current;
        if (!target) return;

        const dx = target.x - posRef.current.x;
        const dy = target.y - posRef.current.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt;

        if (now - lastStepRef.current > 320) {
          soundFX.step();
          lastStepRef.current = now;
        }

        if (dist <= step) {
          posRef.current = {x: target.x, y: target.y};
          const cb = target.onArrive;
          const endPose = target.arrivePose;
          targetRef.current = null;
          rafRef.current = null;
          setState({
            x: target.x,
            y: target.y,
            facing,
            pose: endPose,
          });
          cb?.();
          return;
        }

        const nx = posRef.current.x + (dx / dist) * step;
        const ny = posRef.current.y + (dy / dist) * step;
        posRef.current = {x: nx, y: ny};
        setState({
          x: nx,
          y: ny,
          facing,
          pose: 'walk',
        });

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [stopWalk],
  );

  const teleport = useCallback(
    (x: number, y: number, pose: AvatarPose = 'idle') => {
      stopWalk();
      posRef.current = {x, y};
      setState((prev) => ({x, y, facing: prev.facing, pose}));
    },
    [stopWalk],
  );

  useEffect(() => stopWalk, [stopWalk]);

  return {
    ...state,
    walkTo,
    teleport,
  };
}
