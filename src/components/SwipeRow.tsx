import { useRef, useState, type ReactNode } from 'react';
import { haptic } from '../hooks/useHaptic';

interface Props {
  children: ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightLabel?: string;
  leftLabel?: string;
  threshold?: number;
}

export function SwipeRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = 'gemeldet',
  leftLabel = 'dran gedacht',
  threshold = 80,
}: Props) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<'h' | 'v' | null>(null);
  const triggered = useRef<'r' | 'l' | null>(null);
  const pointerActive = useRef(false);

  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    pointerActive.current = true;
    startX.current = e.clientX;
    startY.current = e.clientY;
    locked.current = null;
    triggered.current = null;
    setDragging(true);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!pointerActive.current) return;
    const ddx = e.clientX - startX.current;
    const ddy = e.clientY - startY.current;
    if (locked.current == null) {
      if (Math.abs(ddx) > 8 || Math.abs(ddy) > 8) {
        locked.current = Math.abs(ddx) > Math.abs(ddy) ? 'h' : 'v';
        if (locked.current === 'h') {
          (e.target as Element).setPointerCapture?.(e.pointerId);
        }
      }
    }
    if (locked.current === 'h') {
      e.preventDefault();
      const clamped = Math.max(-160, Math.min(160, ddx));
      setDx(clamped);
      // Pre-trigger haptic at threshold cross
      const next = clamped >= threshold ? 'r' : clamped <= -threshold ? 'l' : null;
      if (next !== triggered.current && next != null) {
        haptic('soft');
      }
      triggered.current = next;
    }
  };

  const onUp = () => {
    if (!pointerActive.current) return;
    pointerActive.current = false;
    setDragging(false);
    if (locked.current === 'h') {
      if (dx >= threshold && onSwipeRight) {
        haptic('success');
        onSwipeRight();
      } else if (dx <= -threshold && onSwipeLeft) {
        haptic('success');
        onSwipeLeft();
      }
    }
    setDx(0);
  };

  const showRight = dx > 8 && onSwipeRight;
  const showLeft = dx < -8 && onSwipeLeft;
  const ratioR = Math.min(1, Math.max(0, dx / threshold));
  const ratioL = Math.min(1, Math.max(0, -dx / threshold));

  return (
    <div className="swipe-wrap">
      {showRight && (
        <div className="swipe-actions right" style={{ opacity: ratioR }}>
          → {rightLabel}
        </div>
      )}
      {showLeft && (
        <div className="swipe-actions left" style={{ opacity: ratioL }}>
          {leftLabel} ←
        </div>
      )}
      <div
        className={`swipe-row ${dragging ? 'dragging' : ''}`}
        style={{ transform: `translateX(${dx}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={onUp}
      >
        {children}
      </div>
    </div>
  );
}
