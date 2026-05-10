import { useEffect, useRef, useState } from 'react';

interface PinchPan {
  scale: number;
  tx: number;
  ty: number;
  reset: () => void;
}

export function usePinchPan(ref: React.RefObject<HTMLElement>): PinchPan {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const startDist = useRef(0);
  const startScale = useRef(1);
  const startCenter = useRef({ x: 0, y: 0 });
  const startTransform = useRef({ tx: 0, ty: 0 });
  const startPan = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }
    function center(a: { x: number; y: number }, b: { x: number; y: number }) {
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }

    function onDown(e: PointerEvent) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        startDist.current = dist(a, b);
        startScale.current = scale;
        startCenter.current = center(a, b);
        startTransform.current = { tx, ty };
      } else if (pointers.current.size === 1) {
        startPan.current = { x: e.clientX - tx, y: e.clientY - ty };
      }
    }

    function onMove(e: PointerEvent) {
      if (!pointers.current.has(e.pointerId)) return;
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.current.size === 2) {
        const [a, b] = Array.from(pointers.current.values());
        const d = dist(a, b);
        if (startDist.current > 0) {
          const s = Math.max(1, Math.min(4, startScale.current * (d / startDist.current)));
          setScale(s);
        }
      } else if (pointers.current.size === 1 && scale > 1.05) {
        // Only pan when zoomed in
        const ntx = e.clientX - startPan.current.x;
        const nty = e.clientY - startPan.current.y;
        setTx(ntx);
        setTy(nty);
      }
    }

    function onUp(e: PointerEvent) {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 1) {
        const [p] = Array.from(pointers.current.values());
        startPan.current = { x: p.x - tx, y: p.y - ty };
      }
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('pointerleave', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onUp);
    };
  }, [ref, scale, tx, ty]);

  const reset = () => {
    setScale(1);
    setTx(0);
    setTy(0);
  };

  return { scale, tx, ty, reset };
}
