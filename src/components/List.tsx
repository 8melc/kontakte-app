import type { ReactNode } from 'react';

export function List({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`list ${className}`}>{children}</div>;
}

interface RowProps {
  children?: ReactNode;
  dim?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Row({ children, dim, onClick, className = '' }: RowProps) {
  const cls = ['row', dim ? 'dim' : '', onClick ? 'tappable' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClick}>
      {children}
    </div>
  );
}

export function Name({
  children,
  sub,
  className = '',
}: {
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <span className={`name ${className}`}>
      {children}
      {sub && <span className="sub">{sub}</span>}
    </span>
  );
}

export function Meta({
  children,
  tone,
}: {
  children: ReactNode;
  tone?: 'r' | 'a' | 'g';
}) {
  return <span className={`meta ${tone ?? ''}`}>{children}</span>;
}

export function Dot({ tone }: { tone?: 'r' | 'a' | 'g' }) {
  return <span className={`dot ${tone ?? ''}`} aria-hidden />;
}
