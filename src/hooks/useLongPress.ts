import { useRef, useCallback } from 'react';
import { haptic } from './useHaptic';

interface Options {
  onLongPress: (e: React.PointerEvent | PointerEvent) => void;
  onClick?: () => void;
  ms?: number;
  disabled?: boolean;
}

export function useLongPress({ onLongPress, onClick, ms = 450, disabled }: Options) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const clear = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      fired.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        haptic('warn');
        onLongPress(e);
      }, ms);
    },
    [clear, disabled, ms, onLongPress]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startPos.current) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > 8 || dy > 8) clear();
    },
    [clear]
  );

  const onPointerUp = useCallback(() => {
    clear();
    if (!fired.current && onClick) onClick();
  }, [clear, onClick]);

  const onPointerCancel = useCallback(() => clear(), [clear]);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
