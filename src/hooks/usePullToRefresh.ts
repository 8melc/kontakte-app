import { useEffect, useRef, useState } from 'react';
import { haptic } from './useHaptic';

interface Options {
  onRefresh: () => Promise<unknown>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({ onRefresh, threshold = 70, enabled = true }: Options) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const ref = useRef<HTMLElement | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (!el || el.scrollTop > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      triggered.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current == null) return;
      if (!el || el.scrollTop > 0) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0) {
        const dampened = Math.min(120, dy * 0.5);
        setPull(dampened);
        if (dampened >= threshold && !triggered.current) {
          triggered.current = true;
          haptic('soft');
        }
      }
    }

    async function onTouchEnd() {
      if (startY.current == null) return;
      const shouldRefresh = pull >= threshold;
      startY.current = null;
      if (shouldRefresh) {
        setRefreshing(true);
        haptic('success');
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onRefresh, pull, threshold]);

  return { ref, pull, refreshing };
}
