import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PrimaryButton({ children, className = '', ...rest }: BtnProps & { danger?: boolean }) {
  const danger = (rest as { danger?: boolean }).danger;
  delete (rest as Record<string, unknown>).danger;
  return (
    <button className={`btn-primary ${danger ? 'danger' : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  center,
  className = '',
  ...rest
}: BtnProps & { center?: boolean }) {
  return (
    <button className={`btn-ghost ${center ? 'center' : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="back" onClick={onClick}>
      ‹ zurück
    </button>
  );
}
