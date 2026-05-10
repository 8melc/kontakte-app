import type { ReactNode } from 'react';

export function Lbl({
  children,
  tone,
  className = '',
}: {
  children: ReactNode;
  tone?: 'r';
  className?: string;
}) {
  return <div className={`lbl ${tone ?? ''} ${className}`}>{children}</div>;
}
