import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function LongPressMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    setTimeout(() => {
      document.addEventListener('pointerdown', onDocClick);
    }, 0);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // Position so menu stays in viewport
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.min(Math.max(8, x), vw - 220);
  const top = Math.min(Math.max(8, y), vh - 240);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 140,
        }}
        onClick={onClose}
      />
      <div ref={ref} className="lp-menu" style={{ left, top }}>
        {items.map((it, i) => (
          <button
            key={i}
            className={`lp-item ${it.danger ? 'danger' : ''}`}
            onClick={() => {
              it.onClick();
              onClose();
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}
